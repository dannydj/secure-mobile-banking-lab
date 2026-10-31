import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPlatformBiometricAdapter } from '../infrastructure/biometrics/platform-biometric'
import { createBiometricReauthenticationUseCase } from '../use-cases/biometrics/biometric-reauthentication-use-case'
import type { BiometricAuthenticationPort } from '../use-cases/biometrics/biometric.types'
import type { SessionCoordinator } from '../use-cases/session/session-coordinator'

type Options = Readonly<{
  coordinator: SessionCoordinator
  biometricAdapter?: BiometricAuthenticationPort
}>

export function useBiometricReauthentication({ coordinator, biometricAdapter }: Options) {
  const [isReauthenticating, setIsReauthenticating] = useState(false)
  const [biometricFeedback, setBiometricFeedback] = useState<string | null>(null)

  const biometricInFlight = useRef(false)
  const biometricRequestVersion = useRef(0)

  const defaultBiometricAdapter = useMemo(() => createPlatformBiometricAdapter(), [])

  const biometricUseCase = useMemo(
    () => createBiometricReauthenticationUseCase(biometricAdapter ?? defaultBiometricAdapter, coordinator),
    [biometricAdapter, defaultBiometricAdapter, coordinator],
  )

  const cancelBiometricUnlock = useCallback((): void => {
    biometricRequestVersion.current += 1
    biometricInFlight.current = false
    biometricUseCase.cancel()

    setIsReauthenticating(false)
    setBiometricFeedback(null)
  }, [biometricUseCase])

  useEffect(() => {
    return () => {
      biometricRequestVersion.current += 1
      biometricUseCase.dispose()
    }
  }, [biometricUseCase])

  useEffect(() => {
    return coordinator.subscribe(() => {
      const snapshot = coordinator.getSnapshot()

      const biometricRequestIsPending = snapshot.sessionState.status === 'LOCKED' && snapshot.sessionState.reauthenticationRequestId !== null

      if (biometricInFlight.current && !snapshot.isForeground && !biometricRequestIsPending) {
        cancelBiometricUnlock()
      }
    })
  }, [coordinator, cancelBiometricUnlock])

  const handleBiometricUnlock = async (): Promise<void> => {
    if (biometricInFlight.current || coordinator.getSnapshot().sessionState.status !== 'LOCKED') {
      return
    }

    biometricInFlight.current = true

    const currentRequest = ++biometricRequestVersion.current

    setIsReauthenticating(true)
    setBiometricFeedback(null)

    try {
      const result = await biometricUseCase.unlock()

      if (currentRequest !== biometricRequestVersion.current) {
        return
      }

      switch (result.status) {
        case 'UNLOCKED':
          setBiometricFeedback(null)
          break
        case 'FAILURE':
          setBiometricFeedback('Device biometrics were not accepted.')
          break
        case 'CANCELLED':
          setBiometricFeedback('Biometric authentication cancelled.')
          break
        case 'UNAVAILABLE':
          setBiometricFeedback('Biometric unlock is unavailable.')
          break
        case 'BUSY':
          setBiometricFeedback('A biometric request is already pending.')
          break
        case 'ERROR':
          setBiometricFeedback('Biometric authentication failed.')
          break
      }
    } finally {
      if (currentRequest === biometricRequestVersion.current) {
        biometricInFlight.current = false
        setIsReauthenticating(false)
      }
    }
  }

  return {
    isReauthenticating,
    biometricFeedback,
    handleBiometricUnlock,
    cancelBiometricUnlock,
  }
}
