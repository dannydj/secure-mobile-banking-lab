import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

import {
  createSessionCoordinator,
  type Clock,
  type SessionCoordinator,
} from '../application/session/session-coordinator';

import { canAccessSession } from '../domain/session/session-machine';

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
};

export function SessionDemo({
  coordinator,
  clock,
  appStateSource,
}: SessionDemoProps) {
  const machine = useSyncExternalStore(
    coordinator.subscribe,
    coordinator.getSnapshot,
    coordinator.getSnapshot
  );

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
          <Button
            title="Simulate login"
            disabled={!machine.isForeground}
            onPress={() => {
              coordinator.dispatch({ type: 'LOGIN_SUCCESS' });
            }}
          />
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
});
