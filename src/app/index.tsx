import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { LoginForm } from '../components/auth/LoginForm'
import { ProtectedAccountPreview } from '../components/privacy/ProtectedAccountPreview'
import { SessionActions } from '../components/session/SessionActions'
import { PreferenceControls } from '../components/storage/PreferenceControls'
import { canAccessSession } from '../domain/session/session-machine'
import { createPlatformBiometricAdapter } from '../infrastructure/biometrics/platform-biometric'
import { createMockIdentityAdapter, DEMO_ACCESS_CODE, DEMO_USERNAME } from '../infrastructure/identity/mock-identity-adapter'
import { observeAppState, type AppStateEventSource } from '../infrastructure/session/app-state-adapter'
import { observeSessionDeadlines } from '../infrastructure/session/session-deadline-adapter'
import { createInMemoryStorageAdapter } from '../infrastructure/storage/in-memory-storage-adapter'
import { createPlatformStorageAdapter } from '../infrastructure/storage/platform-storage'
import { createBiometricReauthenticationUseCase } from '../use-cases/biometrics/biometric-reauthentication-use-case'
import type { BiometricAuthenticationPort } from '../use-cases/biometrics/biometric.types'
import type { IdentityAdapter } from '../use-cases/identity/identity.types'
import { createLoginUseCase } from '../use-cases/identity/login-use-case'
import { createSessionCoordinator, type Clock, type SessionCoordinator } from '../use-cases/session/session-coordinator'
import type { PreferenceLoadResult } from '../use-cases/storage/load-synthetic-preference'
import { createSyntheticPreferenceRestorer } from '../use-cases/storage/restore-synthetic-preference'
import { createSyntheticPreferenceStore } from '../use-cases/storage/save-synthetic-preference'
import type { ProtectedStoragePort, SyntheticPreference } from '../use-cases/storage/storage.types'

const systemClock: Clock = {
  now: () => Date.now(),
}

type SessionDemoProps = {
  coordinator: SessionCoordinator
  clock: Clock
  appStateSource?: AppStateEventSource
  identityAdapter?: IdentityAdapter
  storageAdapter?: ProtectedStoragePort
  biometricAdapter?: BiometricAuthenticationPort
}

type PreferenceCommand = Readonly<{ type: 'SAVE'; value: SyntheticPreference }> | Readonly<{ type: 'CLEAR' }>

export function SessionDemo({ coordinator, clock, appStateSource, identityAdapter, storageAdapter, biometricAdapter }: SessionDemoProps) {
  const [username, setUsername] = useState(DEMO_USERNAME)
  const [accessCode, setAccessCode] = useState(DEMO_ACCESS_CODE)
  const [loginFeedback, setLoginFeedback] = useState<string | null>(null)

  const requestVersion = useRef(0)

  const loginInFlight = useRef(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [restorationResult, setRestorationResult] = useState<PreferenceLoadResult | null>(null)

  const [isReauthenticating, setIsReauthenticating] = useState(false)
  const [biometricFeedback, setBiometricFeedback] = useState<string | null>(null)

  const biometricInFlight = useRef(false)
  const biometricRequestVersion = useRef(0)

  const [isUpdatingPreference, setIsUpdatingPreference] = useState(false)

  const [preferenceFeedback, setPreferenceFeedback] = useState<string | null>(null)

  const preferenceUpdateInFlight = useRef(false)
  const preferenceOperationVersion = useRef(0)

  const defaultStorage = useMemo(() => createInMemoryStorageAdapter(), [])

  const storage = storageAdapter ?? defaultStorage

  const preferenceStore = useMemo(() => createSyntheticPreferenceStore(storage, clock), [storage, clock])

  useEffect(() => {
    return () => {
      preferenceOperationVersion.current += 1
    }
  }, [preferenceStore])

  const preferenceRestorer = useMemo(() => createSyntheticPreferenceRestorer(storage, clock, coordinator), [storage, clock, coordinator])

  const defaultIdentityAdapter = useMemo(() => createMockIdentityAdapter(), [])

  const loginUseCase = useMemo(() => createLoginUseCase(identityAdapter ?? defaultIdentityAdapter, coordinator), [identityAdapter, defaultIdentityAdapter, coordinator])

  const defaultBiometricAdapter = useMemo(() => createPlatformBiometricAdapter(), [])

  const biometricUseCase = useMemo(
    () => createBiometricReauthenticationUseCase(biometricAdapter ?? defaultBiometricAdapter, coordinator),
    [biometricAdapter, defaultBiometricAdapter, coordinator],
  )

  useEffect(() => {
    return () => {
      biometricRequestVersion.current += 1
      biometricUseCase.dispose()
    }
  }, [biometricUseCase])

  useEffect(() => {
    return () => {
      requestVersion.current += 1
      loginUseCase.dispose()
    }
  }, [loginUseCase])

  const machine = useSyncExternalStore(coordinator.subscribe, coordinator.getSnapshot, coordinator.getSnapshot)

  useEffect(() => {
    let wasForeground = coordinator.getSnapshot().isForeground

    const unsubscribe = coordinator.subscribe(() => {
      const snapshot = coordinator.getSnapshot()
      const isForeground = snapshot.isForeground

      if (wasForeground && !isForeground) {
        requestVersion.current += 1
        loginInFlight.current = false
        loginUseCase.cancel()

        setIsAuthenticating(false)
        setLoginFeedback(null)
      }

      const biometricRequestIsPending = snapshot.sessionState.status === 'LOCKED' && snapshot.sessionState.reauthenticationRequestId !== null

      if (biometricInFlight.current && !isForeground && !biometricRequestIsPending) {
        biometricRequestVersion.current += 1
        biometricInFlight.current = false
        biometricUseCase.cancel()

        setIsReauthenticating(false)
        setBiometricFeedback(null)
      }

      wasForeground = isForeground
    })

    return unsubscribe
  }, [coordinator, loginUseCase, biometricUseCase])

  useEffect(() => {
    const stopAppState = observeAppState(coordinator, appStateSource)

    const stopDeadlines = observeSessionDeadlines(coordinator, clock)

    return () => {
      stopDeadlines()
      stopAppState()
    }
  }, [coordinator, clock, appStateSource])

  useEffect(() => {
    let mounted = true

    void preferenceRestorer.restore().then(
      result => {
        if (mounted) {
          setRestorationResult(result)
        }
      },
      () => {
        if (mounted) {
          setRestorationResult({ status: 'ERROR' })
        }
      },
    )

    return () => {
      mounted = false
    }
  }, [preferenceRestorer])

  const canViewProtected = restorationResult !== null && canAccessSession(machine, clock.now())

  const isSignedOut = machine.sessionState.status === 'SIGNED_OUT' || machine.sessionState.status === 'EXPIRED'

  const handleLogin = async (): Promise<void> => {
    if (loginInFlight.current) {
      return
    }

    loginInFlight.current = true

    const currentRequest = ++requestVersion.current

    setIsAuthenticating(true)
    setLoginFeedback('Checking synthetic identity...')

    try {
      const result = await loginUseCase.login({
        username,
        accessCode,
      })

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

  const handleLogout = (): void => {
    biometricRequestVersion.current += 1
    biometricInFlight.current = false
    biometricUseCase.cancel()

    setIsReauthenticating(false)
    setBiometricFeedback(null)

    coordinator.dispatch({ type: 'LOGOUT' })
  }

  const updatePreference = async (command: PreferenceCommand): Promise<void> => {
    if (preferenceUpdateInFlight.current || restorationResult === null || !coordinator.getSnapshot().isForeground) {
      return
    }

    preferenceUpdateInFlight.current = true

    const operationVersion = preferenceOperationVersion.current

    setIsUpdatingPreference(true)
    setPreferenceFeedback(null)

    try {
      if (command.type === 'SAVE') {
        const result = await preferenceStore.save(command.value)

        if (operationVersion !== preferenceOperationVersion.current) {
          return
        }

        if (result.status === 'SAVED') {
          setRestorationResult({
            status: 'FOUND',
            value: command.value,
          })

          setPreferenceFeedback('Synthetic preference saved.')
        } else {
          setRestorationResult({ status: 'ERROR' })
          setPreferenceFeedback('Could not save synthetic preference.')
        }
      } else {
        const result = await preferenceStore.clear()

        if (operationVersion !== preferenceOperationVersion.current) {
          return
        }

        if (result.status === 'REMOVED') {
          setRestorationResult({ status: 'MISSING' })
          setPreferenceFeedback('Synthetic preference removed.')
        } else {
          setRestorationResult({ status: 'ERROR' })
          setPreferenceFeedback('Could not remove synthetic preference.')
        }
      }
    } finally {
      preferenceUpdateInFlight.current = false

      if (operationVersion === preferenceOperationVersion.current) {
        setIsUpdatingPreference(false)
      }
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Secure Mobile Banking Lab</Text>

      <Text style={styles.subtitle}>Mobile Security Reference Project</Text>

      <Text style={styles.description}>Simulated session lifecycle and protected access.</Text>

      <Text style={styles.status}>Session status: {machine.sessionState.status}</Text>

      <Text style={styles.status}>Foreground: {machine.isForeground ? 'yes' : 'no'}</Text>

      <Text style={styles.status}>
        Synthetic preference: {restorationResult === null ? 'loading' : restorationResult.status === 'FOUND' ? restorationResult.value : 'unavailable'}
      </Text>

      <PreferenceControls
        disabled={!machine.isForeground || restorationResult === null || isUpdatingPreference}
        feedback={preferenceFeedback}
        onSaveSessions={() => {
          void updatePreference({
            type: 'SAVE',
            value: 'sessions',
          })
        }}
        onSaveStorage={() => {
          void updatePreference({
            type: 'SAVE',
            value: 'storage',
          })
        }}
        onClear={() => {
          void updatePreference({ type: 'CLEAR' })
        }}
      />

      {canViewProtected ? <ProtectedAccountPreview accountIdentifier="000123456789" balance="$0.00" /> : <Text style={styles.restricted}>Protected content hidden</Text>}

      <View style={styles.actions}>
        {isSignedOut ? (
          <LoginForm
            username={username}
            accessCode={accessCode}
            disabled={!machine.isForeground || isAuthenticating || restorationResult === null}
            feedback={loginFeedback}
            onUsernameChange={setUsername}
            onAccessCodeChange={setAccessCode}
            onLogin={() => {
              void handleLogin()
            }}
          />
        ) : (
          <SessionActions
            canViewProtected={canViewProtected}
            isLocked={machine.sessionState.status === 'LOCKED'}
            biometricDisabled={!machine.isForeground || isReauthenticating || restorationResult === null}
            biometricFeedback={biometricFeedback}
            onActivity={() => {
              coordinator.dispatch({ type: 'USER_ACTIVITY' })
            }}
            onLock={() => {
              coordinator.dispatch({ type: 'LOCK_REQUESTED' })
            }}
            onBiometricUnlock={() => {
              void handleBiometricUnlock()
            }}
            onLogout={handleLogout}
          />
        )}
      </View>

      <Text style={styles.disclaimer}>Educational demonstration using synthetic data only.</Text>
    </View>
  )
}

export default function HomeScreen() {
  const coordinator = useMemo(() => createSessionCoordinator(systemClock), [])

  const storageAdapter = useMemo(() => createPlatformStorageAdapter(), [])

  return <SessionDemo coordinator={coordinator} clock={systemClock} storageAdapter={storageAdapter} />
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 12,
    color: '#334155',
  },
  description: {
    fontSize: 14,
    marginTop: 24,
    textAlign: 'center',
    color: '#475569',
  },
  status: {
    fontSize: 14,
    marginTop: 12,
    color: '#334155',
  },
  restricted: {
    marginTop: 24,
    color: '#475569',
  },
  actions: {
    marginTop: 24,
    gap: 12,
    width: '100%',
  },
  disclaimer: {
    fontSize: 12,
    marginTop: 24,
    textAlign: 'center',
    color: '#64748B',
  },
  loginForm: {
    width: '100%',
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
  },
  demoHint: {
    fontSize: 12,
    color: '#64748B',
  },
  loginFeedback: {
    marginTop: 8,
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
  },
})
