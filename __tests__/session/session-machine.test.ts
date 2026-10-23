import {
  canAccessSession,
  initialSessionMachineState,
  transitionSession,
} from '../../src/domain/session/session-machine';

import {
  ABSOLUTE_SESSION_LIFETIME_MS,
  INACTIVITY_TIMEOUT_MS,
} from '../../src/domain/session/session-policy';

const START_TIME = 1_000_000;
const SESSION_ID = 'synthetic-session-001';
const REQUEST_ID = 'synthetic-request-001';

function createActiveSession() {
  const result = transitionSession(
    initialSessionMachineState,
    {
      type: 'LOGIN_SUCCESS',
    },
    START_TIME
  );

  expect(result.accepted).toBe(true);

  return result.next;
}

function createLockedSessionWithPendingRequest() {
  const active = createActiveSession();

  const locked = transitionSession(
    active,
    { type: 'LOCK_REQUESTED' },
    START_TIME + 1_000
  );

  const pending = transitionSession(
    locked.next,
    {
      type: 'REAUTHENTICATION_REQUESTED',
      requestId: REQUEST_ID,
    },
    START_TIME + 2_000
  );

  expect(pending.accepted).toBe(true);

  return pending.next;
}

describe('Session State Machine', () => {
  it('SESSION-001: successful login activates a new session', () => {
    const machine = createActiveSession();

    expect(machine.sessionState.status).toBe('ACTIVE');
    expect(canAccessSession(machine, START_TIME)).toBe(true);

    expect(machine.sessionState.session).toMatchObject({
      id: SESSION_ID,
      authenticatedAt: START_TIME,
      expiresAt: START_TIME + ABSOLUTE_SESSION_LIFETIME_MS,
    });
  });

  it('SESSION-002: failed login does not establish a session', () => {
    const result = transitionSession(
      initialSessionMachineState,
      { type: 'LOGIN_FAILURE' },
      START_TIME
    );

    expect(result.accepted).toBe(true);
    expect(result.next.sessionState.status).toBe('SIGNED_OUT');
    expect(canAccessSession(result.next, START_TIME)).toBe(false);
  });

  it('SESSION-004: valid reauthentication unlocks without extending expiration', () => {
    const locked = createLockedSessionWithPendingRequest();
    const originalDeadline = locked.sessionState.session?.expiresAt;

    const result = transitionSession(
      locked,
      {
        type: 'BIOMETRIC_SUCCESS',
        sessionId: SESSION_ID,
        requestId: REQUEST_ID,
      },
      START_TIME + 3_000
    );

    expect(result.accepted).toBe(true);
    expect(result.next.sessionState.status).toBe('ACTIVE');
    expect(result.next.sessionState.session?.expiresAt).toBe(
      originalDeadline
    );
    expect(canAccessSession(result.next, START_TIME + 3_000)).toBe(true);
  });

  for (const eventType of [
    'BIOMETRIC_FAILURE',
    'BIOMETRIC_CANCELLED',
    'BIOMETRIC_UNAVAILABLE',
  ] as const) {
    it(`${eventType}: unsuccessful reauthentication remains locked`, () => {
      const locked = createLockedSessionWithPendingRequest();

      const result = transitionSession(
        locked,
        {
          type: eventType,
          sessionId: SESSION_ID,
          requestId: REQUEST_ID,
        },
        START_TIME + 3_000
      );

      expect(result.accepted).toBe(true);
      expect(result.next.sessionState.status).toBe('LOCKED');
      expect(
        result.next.sessionState.reauthenticationRequestId
      ).toBeNull();
      expect(canAccessSession(result.next, START_TIME + 3_000)).toBe(false);
    });
  }

  it('SESSION-009/019: a late biometric result cannot revive an expired session', () => {
    const locked = createLockedSessionWithPendingRequest();
    const deadline = START_TIME + ABSOLUTE_SESSION_LIFETIME_MS;

    const result = transitionSession(
      locked,
      {
        type: 'BIOMETRIC_SUCCESS',
        sessionId: SESSION_ID,
        requestId: REQUEST_ID,
      },
      deadline
    );

    expect(result.accepted).toBe(false);
    expect(result.next.sessionState.status).toBe('EXPIRED');
    expect(canAccessSession(result.next, deadline)).toBe(false);
  });

  it('SESSION-012/013: logout invalidates pending reauthentication', () => {
    const locked = createLockedSessionWithPendingRequest();

    const logout = transitionSession(
      locked,
      { type: 'LOGOUT' },
      START_TIME + 3_000
    );

    const staleResult = transitionSession(
      logout.next,
      {
        type: 'BIOMETRIC_SUCCESS',
        sessionId: SESSION_ID,
        requestId: REQUEST_ID,
      },
      START_TIME + 4_000
    );

    expect(logout.next.sessionState.status).toBe('SIGNED_OUT');
    expect(staleResult.accepted).toBe(false);
    expect(staleResult.next.sessionState.status).toBe('SIGNED_OUT');
    expect(canAccessSession(staleResult.next, START_TIME + 4_000)).toBe(
      false
    );
  });

  it('CTRL-004: a superseded request cannot unlock the session', () => {
    const locked = createLockedSessionWithPendingRequest();

    const replacement = transitionSession(
      locked,
      {
        type: 'REAUTHENTICATION_REQUESTED',
        requestId: 'synthetic-request-002',
      },
      START_TIME + 3_000
    );

    const staleResult = transitionSession(
      replacement.next,
      {
        type: 'BIOMETRIC_SUCCESS',
        sessionId: SESSION_ID,
        requestId: REQUEST_ID,
      },
      START_TIME + 4_000
    );

    expect(replacement.accepted).toBe(true);
    expect(staleResult.accepted).toBe(false);
    expect(staleResult.next.sessionState.status).toBe('LOCKED');
    expect(
      staleResult.next.sessionState.reauthenticationRequestId
    ).toBe('synthetic-request-002');
  });

  it('SESSION-003/016: background and foreground events never unlock', () => {
    const active = createActiveSession();

    const background = transitionSession(
      active,
      { type: 'APP_BACKGROUND' },
      START_TIME + 1_000
    );

    const foreground = transitionSession(
      background.next,
      { type: 'APP_FOREGROUND' },
      START_TIME + 2_000
    );

    expect(background.next.isForeground).toBe(false);
    expect(background.next.sessionState.status).toBe('LOCKED');
    expect(foreground.next.isForeground).toBe(true);
    expect(foreground.next.sessionState.status).toBe('LOCKED');
    expect(canAccessSession(foreground.next, START_TIME + 2_000)).toBe(
      false
    );
  });

  it('SESSION-010: inactivity locks the session at the threshold', () => {
    const active = createActiveSession();
    const deadline = START_TIME + INACTIVITY_TIMEOUT_MS;

    const result = transitionSession(
      active,
      { type: 'INACTIVITY_TIMEOUT' },
      deadline
    );

    expect(result.accepted).toBe(true);
    expect(result.next.sessionState.status).toBe('LOCKED');
    expect(canAccessSession(result.next, deadline)).toBe(false);
  });

  it('SESSION-018: a new login is permitted after expiration', () => {
    const active = createActiveSession();
    const deadline = START_TIME + ABSOLUTE_SESSION_LIFETIME_MS;

    const expired = transitionSession(
      active,
      { type: 'SESSION_EXPIRED' },
      deadline
    );

    const renewed = transitionSession(
      expired.next,
      {
        type: 'LOGIN_SUCCESS',
      },
      deadline + 1
    );

    expect(expired.next.sessionState.status).toBe('EXPIRED');
    expect(renewed.accepted).toBe(true);
    expect(renewed.next.sessionState.status).toBe('ACTIVE');
    expect(renewed.next.sessionState.session?.id).toBe(
      'synthetic-session-002'
    );
    expect(renewed.next.sessionState.session?.expiresAt).toBe(
      deadline + 1 + ABSOLUTE_SESSION_LIFETIME_MS
    );
  });

  it('SESSION-011: explicit expiration invalidates an active session', () => {
    const active = createActiveSession();
    const now = START_TIME + 1_000;

    const result = transitionSession(
      active,
      { type: 'SESSION_EXPIRED' },
      now
    );

    expect(result.accepted).toBe(true);
    expect(result.next.sessionState.status).toBe('EXPIRED');
    expect(canAccessSession(result.next, now)).toBe(false);
  });

  it('CTRL-004: a completed request ID cannot be reused', () => {
    const locked = createLockedSessionWithPendingRequest();

    const cancelled = transitionSession(
      locked,
      {
        type: 'BIOMETRIC_CANCELLED',
        sessionId: SESSION_ID,
        requestId: REQUEST_ID,
      },
      START_TIME + 3_000
    );

    expect(cancelled.accepted).toBe(true);

    const reused = transitionSession(
      cancelled.next,
      {
        type: 'REAUTHENTICATION_REQUESTED',
        requestId: REQUEST_ID,
      },
      START_TIME + 4_000
    );

    expect(reused.accepted).toBe(false);
    expect(reused.next.sessionState.status).toBe('LOCKED');
    expect(
      reused.next.sessionState.reauthenticationRequestId
    ).toBeNull();
  });

  it('CTRL-004: rejects reuse of an older request ID', () => {
    const locked = createLockedSessionWithPendingRequest();

    const second = transitionSession(
      locked,
      {
        type: 'REAUTHENTICATION_REQUESTED',
        requestId: 'synthetic-request-002',
      },
      START_TIME + 3_000
    );

    const third = transitionSession(
      second.next,
      {
        type: 'REAUTHENTICATION_REQUESTED',
        requestId: 'synthetic-request-003',
      },
      START_TIME + 4_000
    );

    const reused = transitionSession(
      third.next,
      {
        type: 'REAUTHENTICATION_REQUESTED',
        requestId: REQUEST_ID,
      },
      START_TIME + 5_000
    );

    expect(second.accepted).toBe(true);
    expect(third.accepted).toBe(true);
    expect(reused.accepted).toBe(false);
    expect(reused.next.sessionState.status).toBe('LOCKED');
    expect(
      reused.next.sessionState.reauthenticationRequestId
    ).toBe('synthetic-request-003');
  });

  it('SESSION-016: background invalidates pending reauthentication', () => {
    const locked = createLockedSessionWithPendingRequest();

    const background = transitionSession(
      locked,
      { type: 'APP_BACKGROUND' },
      START_TIME + 3_000
    );

    const foreground = transitionSession(
      background.next,
      { type: 'APP_FOREGROUND' },
      START_TIME + 4_000
    );

    const staleResult = transitionSession(
      foreground.next,
      {
        type: 'BIOMETRIC_SUCCESS',
        sessionId: SESSION_ID,
        requestId: REQUEST_ID,
      },
      START_TIME + 5_000
    );

    expect(background.next.isForeground).toBe(false);
    expect(foreground.next.isForeground).toBe(true);
    expect(staleResult.accepted).toBe(false);
    expect(staleResult.next.sessionState.status).toBe('LOCKED');
    expect(
      staleResult.next.sessionState.reauthenticationRequestId
    ).toBeNull();
    expect(canAccessSession(staleResult.next, START_TIME + 5_000)).toBe(
      false
    );
  });

  it('SESSION-015: corrupted ACTIVE metadata invalidates the session', () => {
    const active = createActiveSession();

    if (active.sessionState.status !== 'ACTIVE') {
      throw new Error('Expected an active session');
    }

    const corrupted = {
      ...active,
      sessionState: {
        ...active.sessionState,
        session: {
          ...active.sessionState.session,
          id: ' ',
        },
      },
    };

    const now = START_TIME + 1_000;

    const result = transitionSession(
      corrupted,
      { type: 'USER_ACTIVITY' },
      now
    );

    expect(result.accepted).toBe(false);
    expect(result.next.sessionState.status).toBe('EXPIRED');
    expect(canAccessSession(result.next, now)).toBe(false);
  });

  it('SESSION-017: an unknown event cannot authorize access', () => {
    const active = createActiveSession();

    const unexpectedEvent = {
      type: 'UNEXPECTED_EVENT',
    } as unknown as Parameters<typeof transitionSession>[1];

    const result = transitionSession(
      active,
      unexpectedEvent,
      START_TIME + 1_000
    );

    expect(result.accepted).toBe(false);
    expect(result.next.sessionState.status).toBe('SIGNED_OUT');
    expect(
      canAccessSession(result.next, START_TIME + 1_000)
    ).toBe(false);
  });

  it('CTRL-001: a new login generates a distinct session ID after logout', () => {
    const active = createActiveSession();
    const previousSessionId = active.sessionState.session?.id;

    const logout = transitionSession(
      active,
      { type: 'LOGOUT' },
      START_TIME + 1_000
    );

    const renewed = transitionSession(
      logout.next,
      { type: 'LOGIN_SUCCESS' },
      START_TIME + 2_000
    );

    expect(logout.accepted).toBe(true);
    expect(logout.next.sessionState.status).toBe('SIGNED_OUT');

    expect(renewed.accepted).toBe(true);
    expect(renewed.next.sessionState.status).toBe('ACTIVE');
    expect(renewed.next.sessionState.session?.id).toBe(
      'synthetic-session-002'
    );
    expect(renewed.next.sessionState.session?.id).not.toBe(
      previousSessionId
    );
  });

  it('CTRL-004: a simulated restart does not reuse request IDs', () => {
    const pending = createLockedSessionWithPendingRequest();

    const restarted = transitionSession(
      pending,
      { type: 'APPLICATION_RESTART' },
      START_TIME + 3_000
    );

    const loggedIn = transitionSession(
      restarted.next,
      { type: 'LOGIN_SUCCESS' },
      START_TIME + 4_000
    );

    const locked = transitionSession(
      loggedIn.next,
      { type: 'LOCK_REQUESTED' },
      START_TIME + 5_000
    );

    const reused = transitionSession(
      locked.next,
      {
        type: 'REAUTHENTICATION_REQUESTED',
        requestId: REQUEST_ID,
      },
      START_TIME + 6_000
    );

    const nextRequest = transitionSession(
      locked.next,
      {
        type: 'REAUTHENTICATION_REQUESTED',
        requestId: 'synthetic-request-002',
      },
      START_TIME + 6_000
    );

    expect(restarted.accepted).toBe(true);
    expect(loggedIn.accepted).toBe(true);
    expect(locked.accepted).toBe(true);
    expect(reused.accepted).toBe(false);
    expect(nextRequest.accepted).toBe(true);
  });

  it('CTRL-002/005: rejects a session ID inconsistent with the machine sequence', () => {
    const active = createActiveSession();

    if (active.sessionState.status !== 'ACTIVE') {
      throw new Error('Expected an active session');
    }

    const corrupted = {
      ...active,
      sessionState: {
        ...active.sessionState,
        session: {
          ...active.sessionState.session,
          id: 'synthetic-session-999',
        },
      },
    };

    const now = START_TIME + 1_000;

    expect(canAccessSession(corrupted, now)).toBe(false);

    const result = transitionSession(
      corrupted,
      { type: 'USER_ACTIVITY' },
      now
    );

    expect(result.accepted).toBe(false);
    expect(result.next.sessionState.status).toBe('EXPIRED');
  });

  it('CTRL-002: invalid session sequence cannot authorize protected access', () => {
    const active = createActiveSession();

    const corrupted = {
      ...active,
      sessionSequence: Number.NaN,
    };

    expect(canAccessSession(corrupted, START_TIME)).toBe(false);
  });
});
