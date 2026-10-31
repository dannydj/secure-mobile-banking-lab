import { useEffect, useMemo, useRef, useState } from 'react'
import { createMockIdentityAdapter, DEMO_ACCESS_CODE, DEMO_USERNAME } from '../infrastructure/identity/mock-identity-adapter'
import type { IdentityAdapter } from '../use-cases/identity/identity.types'
import { createLoginUseCase } from '../use-cases/identity/login-use-case'
import type { SessionCoordinator } from '../use-cases/session/session-coordinator'

type Options = Readonly<{
  coordinator: SessionCoordinator
  identityAdapter?: IdentityAdapter
}>

export function useLoginFlow({ coordinator, identityAdapter }: Options) {
  const [username, setUsername] = useState(DEMO_USERNAME)
  const [accessCode, setAccessCode] = useState(DEMO_ACCESS_CODE)
  const [loginFeedback, setLoginFeedback] = useState<string | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  const requestVersion = useRef(0)
  const loginInFlight = useRef(false)

  const defaultIdentityAdapter = useMemo(() => createMockIdentityAdapter(), [])
  const loginUseCase = useMemo(() => createLoginUseCase(identityAdapter ?? defaultIdentityAdapter, coordinator), [identityAdapter, defaultIdentityAdapter, coordinator])

  useEffect(() => {
    return () => {
      requestVersion.current += 1
      loginUseCase.dispose()
    }
  }, [loginUseCase])

  useEffect(() => {
    let wasForeground = coordinator.getSnapshot().isForeground

    return coordinator.subscribe(() => {
      const isForeground = coordinator.getSnapshot().isForeground

      if (wasForeground && !isForeground) {
        requestVersion.current += 1
        loginInFlight.current = false
        loginUseCase.cancel()

        setIsAuthenticating(false)
        setLoginFeedback(null)
      }

      wasForeground = isForeground
    })
  }, [coordinator, loginUseCase])

  const handleLogin = async (): Promise<void> => {
    if (loginInFlight.current) {
      return
    }

    loginInFlight.current = true
    const currentRequest = ++requestVersion.current

    setIsAuthenticating(true)
    setLoginFeedback('Checking synthetic identity...')

    try {
      const result = await loginUseCase.login({ username, accessCode })

      if (currentRequest !== requestVersion.current) {
        return
      }

      switch (result.status) {
        case 'AUTHENTICATED':
          setLoginFeedback(null)
          break
        case 'DENIED':
          setLoginFeedback(result.reason === 'INVALID_INPUT' ? 'Enter the demo username and access code.' : 'Synthetic identity not recognized.')
          break
        case 'BUSY':
          setLoginFeedback('A login attempt is already pending.')
          break
        case 'UNAVAILABLE':
          setLoginFeedback('Login is not available in the current state.')
          break
        case 'CANCELLED':
          setLoginFeedback('Login attempt cancelled.')
          break
        case 'ERROR':
          setLoginFeedback('Synthetic identity service unavailable.')
          break
      }
    } finally {
      if (currentRequest === requestVersion.current) {
        loginInFlight.current = false
        setIsAuthenticating(false)
      }
    }
  }

  return {
    username,
    setUsername,
    accessCode,
    setAccessCode,
    loginFeedback,
    isAuthenticating,
    handleLogin,
  }
}
