import { createSessionCoordinator } from '../../src/application/session/session-coordinator';

import {
  ABSOLUTE_SESSION_LIFETIME_MS,
  INACTIVITY_TIMEOUT_MS,
} from '../../src/domain/session/session-policy';

import { observeSessionDeadlines } from '../../src/infrastructure/session/session-deadline-adapter';

const START_TIME = 1_000_000;

describe('Session Deadline Adapter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('SESSION-010: locks automatically at the inactivity deadline', () => {
    let now = START_TIME;
    const clock = { now: () => now };
    const coordinator = createSessionCoordinator(clock);

    const cleanup = observeSessionDeadlines(
      coordinator,
      clock
    );

    coordinator.dispatch({ type: 'LOGIN_SUCCESS' });

    now += INACTIVITY_TIMEOUT_MS;
    jest.advanceTimersByTime(INACTIVITY_TIMEOUT_MS);

    expect(coordinator.getSnapshot().sessionState.status).toBe(
      'LOCKED'
    );
    expect(coordinator.canAccess()).toBe(false);

    cleanup();
  });

  it('reschedules inactivity after valid user activity', () => {
    let now = START_TIME;
    const clock = { now: () => now };
    const coordinator = createSessionCoordinator(clock);

    const cleanup = observeSessionDeadlines(
      coordinator,
      clock
    );

    coordinator.dispatch({ type: 'LOGIN_SUCCESS' });

    now += 60_000;
    jest.advanceTimersByTime(60_000);

    coordinator.dispatch({ type: 'USER_ACTIVITY' });

    now += 60_000;
    jest.advanceTimersByTime(60_000);

    expect(coordinator.getSnapshot().sessionState.status).toBe(
      'ACTIVE'
    );
    expect(coordinator.canAccess()).toBe(true);

    now += 60_000;
    jest.advanceTimersByTime(60_000);

    expect(coordinator.getSnapshot().sessionState.status).toBe(
      'LOCKED'
    );

    cleanup();
  });

  it('SESSION-011/019: expires a locked session at its absolute deadline', () => {
    let now = START_TIME;
    const clock = { now: () => now };
    const coordinator = createSessionCoordinator(clock);

    const cleanup = observeSessionDeadlines(
      coordinator,
      clock
    );

    coordinator.dispatch({ type: 'LOGIN_SUCCESS' });
    coordinator.dispatch({ type: 'LOCK_REQUESTED' });

    now += ABSOLUTE_SESSION_LIFETIME_MS;
    jest.advanceTimersByTime(ABSOLUTE_SESSION_LIFETIME_MS);

    expect(coordinator.getSnapshot().sessionState.status).toBe(
      'EXPIRED'
    );
    expect(coordinator.canAccess()).toBe(false);

    cleanup();
  });

  it('expires after foreground return even when timers were suspended', () => {
    let now = START_TIME;
    const clock = { now: () => now };
    const coordinator = createSessionCoordinator(clock);

    const cleanup = observeSessionDeadlines(
      coordinator,
      clock
    );

    coordinator.dispatch({ type: 'LOGIN_SUCCESS' });
    coordinator.dispatch({ type: 'APP_BACKGROUND' });

    now += ABSOLUTE_SESSION_LIFETIME_MS;

    coordinator.dispatch({ type: 'APP_FOREGROUND' });

    expect(coordinator.getSnapshot().sessionState.status).toBe(
      'EXPIRED'
    );
    expect(coordinator.canAccess()).toBe(false);

    cleanup();
  });

  it('cancels pending timers when disposed', () => {
    let now = START_TIME;
    const clock = { now: () => now };
    const coordinator = createSessionCoordinator(clock);

    const cleanup = observeSessionDeadlines(
      coordinator,
      clock
    );

    coordinator.dispatch({ type: 'LOGIN_SUCCESS' });

    expect(jest.getTimerCount()).toBe(1);

    cleanup();

    expect(jest.getTimerCount()).toBe(0);

    now += INACTIVITY_TIMEOUT_MS;
    jest.advanceTimersByTime(INACTIVITY_TIMEOUT_MS);

    expect(coordinator.getSnapshot().sessionState.status).toBe(
      'ACTIVE'
    );
    expect(coordinator.canAccess()).toBe(false);
  });
});
