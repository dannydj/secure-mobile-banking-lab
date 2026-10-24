import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import type { IdentityAdapter } from '../application/identity/identity.types';
import { createLoginUseCase } from '../application/identity/login-use-case';
import {
  createSessionCoordinator,
  type Clock,
  type SessionCoordinator,
} from '../application/session/session-coordinator';
import { canAccessSession } from '../domain/session/session-machine';
import {
  createMockIdentityAdapter,
  DEMO_ACCESS_CODE,
  DEMO_USERNAME,
} from '../infrastructure/identity/mock-identity-adapter';
import {
  observeAppState,
  type AppStateEventSource,
} from '../infrastructure/session/app-state-adapter';
import { observeSessionDeadlines } from '../infrastructure/session/session-deadline-adapter';

const systemClock: Clock = {
  now: () => Date.now(),
};

type SessionDemoProps = {
  coordinator: SessionCoordinator;
  clock: Clock;
  appStateSource?: AppStateEventSource;
  identityAdapter?: IdentityAdapter;
};

export function SessionDemo({
  coordinator,
  clock,
  appStateSource,
  identityAdapter,
}: SessionDemoProps) {
  const [username, setUsername] = useState(DEMO_USERNAME);
  const [accessCode, setAccessCode] = useState(DEMO_ACCESS_CODE);
  const [loginFeedback, setLoginFeedback] = useState<string | null>(null);

  const requestVersion = useRef(0);

  const loginInFlight = useRef(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const defaultIdentityAdapter = useMemo(
    () => createMockIdentityAdapter(),
    []
  );

  const loginUseCase = useMemo(
    () =>
      createLoginUseCase(
        identityAdapter ?? defaultIdentityAdapter,
        coordinator
      ),
    [identityAdapter, defaultIdentityAdapter, coordinator]
  );

  useEffect(() => {
    return () => {
      requestVersion.current += 1;
      loginUseCase.dispose();
    };
  }, [loginUseCase]);

  const machine = useSyncExternalStore(
    coordinator.subscribe,
    coordinator.getSnapshot,
    coordinator.getSnapshot
  );

  useEffect(() => {
    let wasForeground = coordinator.getSnapshot().isForeground;

    const unsubscribe = coordinator.subscribe(() => {
      const isForeground = coordinator.getSnapshot().isForeground;

      if (wasForeground && !isForeground) {
        requestVersion.current += 1;
        loginInFlight.current = false;

        loginUseCase.cancel();

        setIsAuthenticating(false);
        setLoginFeedback(null);
      }

      wasForeground = isForeground;
    });

    return unsubscribe;
  }, [coordinator, loginUseCase]);

  useEffect(() => {
    const stopAppState = observeAppState(
      coordinator,
      appStateSource
    );

    const stopDeadlines = observeSessionDeadlines(
      coordinator,
      clock
    );

    return () => {
      stopDeadlines();
      stopAppState();
    };
  }, [coordinator, clock, appStateSource]);

  const canViewProtected = canAccessSession(
    machine,
    clock.now()
  );

  const isSignedOut =
    machine.sessionState.status === 'SIGNED_OUT' ||
    machine.sessionState.status === 'EXPIRED';

  const handleLogin = async (): Promise<void> => {
    if (loginInFlight.current) {
      return;
    }

    loginInFlight.current = true;

    const currentRequest = ++requestVersion.current;

    setIsAuthenticating(true);
    setLoginFeedback('Checking synthetic identity...');

    try {
      const result = await loginUseCase.login({
        username,
        accessCode,
      });

      if (currentRequest !== requestVersion.current) {
        return;
      }

      switch (result.status) {
        case 'AUTHENTICATED':
          setLoginFeedback(null);
          break;

        case 'DENIED':
          setLoginFeedback(
            result.reason === 'INVALID_INPUT'
              ? 'Enter the demo username and access code.'
              : 'Synthetic identity not recognized.'
          );
          break;

        case 'BUSY':
          setLoginFeedback('A login attempt is already pending.');
          break;

        case 'UNAVAILABLE':
          setLoginFeedback('Login is not available in the current state.');
          break;

        case 'CANCELLED':
          setLoginFeedback('Login attempt cancelled.');
          break;

        case 'ERROR':
          setLoginFeedback('Synthetic identity service unavailable.');
          break;
      }
    } finally {
      if (currentRequest === requestVersion.current) {
        loginInFlight.current = false;
        setIsAuthenticating(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Secure Mobile Banking Lab</Text>

      <Text style={styles.subtitle}>
        Mobile Security Reference Project
      </Text>

      <Text style={styles.description}>
        Simulated session lifecycle and protected access.
      </Text>

      <Text style={styles.status}>
        Session status: {machine.sessionState.status}
      </Text>

      <Text style={styles.status}>
        Foreground: {machine.isForeground ? 'yes' : 'no'}
      </Text>

      {canViewProtected ? (
        <View style={styles.protectedPanel}>
          <Text style={styles.protectedText}>
            Protected synthetic preview
          </Text>
          <Text>Fictional account balance: $0.00</Text>
        </View>
      ) : (
        <Text style={styles.restricted}>
          Protected content hidden
        </Text>
      )}

      <View style={styles.actions}>
        {isSignedOut ? (
          <>
            <View style={styles.loginForm}>
              <Text>Demo username</Text>

              <TextInput
                accessibilityLabel="Demo username"
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text>Demo access code</Text>

              <TextInput
                accessibilityLabel="Demo access code"
                style={styles.input}
                value={accessCode}
                onChangeText={setAccessCode}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.demoHint}>
                Public demonstration values: demo-user / demo-only.
                Never enter real credentials.
              </Text>
            </View>

            <Button
              title="Simulate login"
              disabled={!machine.isForeground || isAuthenticating}
              onPress={() => {
                void handleLogin();
              }}
            />

            {loginFeedback ? (
              <Text style={styles.loginFeedback}>
                {loginFeedback}
              </Text>
            ) : null}
          </>
        ) : (
          <>
            <Button
              title="Simulate activity"
              disabled={!canViewProtected}
              onPress={() => {
                coordinator.dispatch({ type: 'USER_ACTIVITY' });
              }}
            />

            <Button
              title="Lock session"
              disabled={!canViewProtected}
              onPress={() => {
                coordinator.dispatch({ type: 'LOCK_REQUESTED' });
              }}
            />

            <Button
              title="Log out"
              onPress={() => {
                coordinator.dispatch({ type: 'LOGOUT' });
              }}
            />
          </>
        )}
      </View>

      <Text style={styles.disclaimer}>
        Educational demonstration using synthetic data only.
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const coordinator = useMemo(
    () => createSessionCoordinator(systemClock),
    []
  );

  return (
    <SessionDemo
      coordinator={coordinator}
      clock={systemClock}
    />
  );
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
  protectedPanel: {
    marginTop: 24,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
  },
  protectedText: {
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
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
});
