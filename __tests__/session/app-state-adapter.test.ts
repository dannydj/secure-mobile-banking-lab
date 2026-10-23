import type { AppStateStatus } from 'react-native';

import { createSessionCoordinator } from '../../src/application/session/session-coordinator';
import { observeAppState } from '../../src/infrastructure/session/app-state-adapter';

const START_TIME = 1_000_000;

function createMockAppState(initialState: AppStateStatus | null) {
  let currentState = initialState;
  const listeners = new Set<(state: AppStateStatus) => void>();

  return {
    get currentState() {
      return currentState;
    },

    addEventListener(
      _eventType: 'change',
      listener: (state: AppStateStatus) => void
    ) {
      listeners.add(listener);

      return {
        remove: () => {
          listeners.delete(listener);
        },
      };
    },

    emit(nextState: AppStateStatus) {
      currentState = nextState;

      listeners.forEach((listener) => listener(nextState));
    },

    get listenerCount() {
      return listeners.size;
    },
  };
}

describe('AppState Adapter', () => {
  it('SESSION-003: background locks an active session', () => {
    const coordinator = createSessionCoordinator({
      now: () => START_TIME,
    });

    const source = createMockAppState('active');
    const cleanup = observeAppState(coordinator, source);

    coordinator.dispatch({ type: 'LOGIN_SUCCESS' });

    expect(coordinator.canAccess()).toBe(true);

    source.emit('background');

    expect(coordinator.getSnapshot().isForeground).toBe(false);
    expect(coordinator.getSnapshot().sessionState.status).toBe(
      'LOCKED'
    );
    expect(coordinator.canAccess()).toBe(false);

    cleanup();
  });

  it('SESSION-016: foreground does not automatically unlock', () => {
    const coordinator = createSessionCoordinator({
      now: () => START_TIME,
    });

    const source = createMockAppState('active');
    const cleanup = observeAppState(coordinator, source);

    coordinator.dispatch({ type: 'LOGIN_SUCCESS' });

    source.emit('inactive');
    source.emit('active');

    expect(coordinator.getSnapshot().isForeground).toBe(true);
    expect(coordinator.getSnapshot().sessionState.status).toBe(
      'LOCKED'
    );
    expect(coordinator.canAccess()).toBe(false);

    cleanup();
  });

  it('denies foreground status when initial AppState is unknown', () => {
    const coordinator = createSessionCoordinator({
      now: () => START_TIME,
    });

    const source = createMockAppState(null);
    const cleanup = observeAppState(coordinator, source);

    expect(coordinator.getSnapshot().isForeground).toBe(false);

    source.emit('active');

    expect(coordinator.getSnapshot().isForeground).toBe(true);

    cleanup();
  });

  it('SESSION-016: background invalidates pending reauthentication', () => {
    const coordinator = createSessionCoordinator({
      now: () => START_TIME,
    });

    const source = createMockAppState('active');
    const cleanup = observeAppState(coordinator, source);

    coordinator.dispatch({ type: 'LOGIN_SUCCESS' });
    coordinator.dispatch({ type: 'LOCK_REQUESTED' });

    coordinator.dispatch({
      type: 'REAUTHENTICATION_REQUESTED',
      requestId: 'synthetic-request-001',
    });

    source.emit('background');
    source.emit('active');

    const result = coordinator.dispatch({
      type: 'BIOMETRIC_SUCCESS',
      sessionId: 'synthetic-session-001',
      requestId: 'synthetic-request-001',
    });

    expect(result.accepted).toBe(false);
    expect(coordinator.getSnapshot().sessionState.status).toBe(
      'LOCKED'
    );
    expect(coordinator.canAccess()).toBe(false);

    cleanup();
  });

  it('removes the listener during cleanup', () => {
    const coordinator = createSessionCoordinator({
      now: () => START_TIME,
    });

    const source = createMockAppState('active');
    const cleanup = observeAppState(coordinator, source);

    expect(source.listenerCount).toBe(1);

    cleanup();

    expect(source.listenerCount).toBe(0);

    source.emit('background');

    expect(coordinator.getSnapshot().isForeground).toBe(true);
  });
});
