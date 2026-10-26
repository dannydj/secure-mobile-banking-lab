import { createSessionCoordinator } from '../../src/use-cases/session/session-coordinator';

import {
  ABSOLUTE_SESSION_LIFETIME_MS,
  INACTIVITY_TIMEOUT_MS,
} from '../../src/domain/session/session-policy';

describe('Session Coordinator', () => {
  const START_TIME = 1_000_000;

  it('manages simulated login and inactivity with an injected clock', () => {
    let now = START_TIME;

    const coordinator = createSessionCoordinator({
      now: () => now,
    });

    const login = coordinator.dispatch({
      type: 'LOGIN_SUCCESS',
    });

    expect(login.accepted).toBe(true);
    expect(coordinator.canAccess()).toBe(true);

    now += INACTIVITY_TIMEOUT_MS;

    expect(coordinator.canAccess()).toBe(false);

    const timeout = coordinator.dispatch({
      type: 'INACTIVITY_TIMEOUT',
    });

    expect(timeout.accepted).toBe(true);
    expect(coordinator.getSnapshot().sessionState.status).toBe(
      'LOCKED'
    );
  });

  it('notifies subscribers and stops after unsubscribe', () => {
    const coordinator = createSessionCoordinator({
      now: () => START_TIME,
    });

    const observedStates: string[] = [];

    const unsubscribe = coordinator.subscribe(() => {
      observedStates.push(
        coordinator.getSnapshot().sessionState.status
      );
    });

    coordinator.dispatch({ type: 'LOGIN_SUCCESS' });
    coordinator.dispatch({ type: 'APP_BACKGROUND' });

    unsubscribe();

    coordinator.dispatch({ type: 'APP_FOREGROUND' });

    expect(observedStates).toEqual(['ACTIVE', 'LOCKED']);
    expect(coordinator.canAccess()).toBe(false);
  });

  it('expires a session when the absolute deadline is reached', () => {
    let now = START_TIME;

    const coordinator = createSessionCoordinator({
      now: () => now,
    });

    coordinator.dispatch({ type: 'LOGIN_SUCCESS' });

    now += ABSOLUTE_SESSION_LIFETIME_MS;

    expect(coordinator.canAccess()).toBe(false);

    const result = coordinator.dispatch({
      type: 'SESSION_EXPIRED',
    });

    expect(result.accepted).toBe(true);
    expect(coordinator.getSnapshot().sessionState.status).toBe(
      'EXPIRED'
    );
  });
});
