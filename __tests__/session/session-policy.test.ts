import {
  ABSOLUTE_SESSION_LIFETIME_MS,
  INACTIVITY_TIMEOUT_MS,
  canAccessProtectedContent,
  isSessionValid,
} from '../../src/domain/session/session-policy';

import {
  initialSessionState,
  type SessionMetadata,
  type SessionState,
} from '../../src/domain/session/session.types';

describe('Session Security Policy', () => {
  const now = 1_000_000;

  const session: SessionMetadata = {
    id: 'synthetic-session-001',
    authenticatedAt: now - 5 * 60_000,
    expiresAt: now + 10 * 60_000,
    lastActivityAt: now - 60_000,
  };

  const activeState = (metadata: SessionMetadata): SessionState => ({
    status: 'ACTIVE',
    session: metadata,
    reauthenticationRequestId: null,
  });

  it('CTRL-002: allows protected access for a valid ACTIVE session', () => {
    expect(canAccessProtectedContent(activeState(session), now)).toBe(true);
  });

  it('CTRL-002: denies protected access in non-ACTIVE states', () => {
    const deniedStates: SessionState[] = [
      initialSessionState,
      {
        status: 'LOCKED',
        session,
        reauthenticationRequestId: null,
      },
      {
        status: 'EXPIRED',
        session: null,
        reauthenticationRequestId: null,
      },
    ];

    for (const state of deniedStates) {
      expect(canAccessProtectedContent(state, now)).toBe(false);
    }
  });

  it('SESSION-019: expires exactly at the absolute deadline', () => {
    const nearDeadline: SessionMetadata = {
      ...session,
      lastActivityAt: session.expiresAt - 1,
    };

    expect(
      canAccessProtectedContent(
        activeState(nearDeadline),
        session.expiresAt - 1
      )
    ).toBe(true);

    expect(
      canAccessProtectedContent(
        activeState(nearDeadline),
        session.expiresAt
      )
    ).toBe(false);
  });

  it('SESSION-010: denies access at the inactivity threshold', () => {
    const beforeTimeout: SessionMetadata = {
      ...session,
      lastActivityAt: now - INACTIVITY_TIMEOUT_MS + 1,
    };

    const atTimeout: SessionMetadata = {
      ...session,
      lastActivityAt: now - INACTIVITY_TIMEOUT_MS,
    };

    expect(canAccessProtectedContent(activeState(beforeTimeout), now)).toBe(
      true
    );

    expect(isSessionValid(atTimeout, now)).toBe(true);

    expect(canAccessProtectedContent(activeState(atTimeout), now)).toBe(false);
  });

  it('SESSION-015: rejects inconsistent session metadata', () => {
    const invalidSessions: SessionMetadata[] = [
      { ...session, id: '   ' },
      { ...session, authenticatedAt: -1 },
      { ...session, expiresAt: session.authenticatedAt },
      {
        ...session,
        expiresAt:
          session.authenticatedAt + ABSOLUTE_SESSION_LIFETIME_MS + 1,
      },
      { ...session, lastActivityAt: session.expiresAt },
      { ...session, lastActivityAt: now + 1 },
    ];

    for (const invalidSession of invalidSessions) {
      expect(isSessionValid(invalidSession, now)).toBe(false);
      expect(canAccessProtectedContent(activeState(invalidSession), now)).toBe(
        false
      );
    }
  });

  it('SESSION-015: rejects invalid or backward clock values', () => {
    expect(isSessionValid(session, Number.NaN)).toBe(false);
    expect(isSessionValid(session, Number.POSITIVE_INFINITY)).toBe(false);
    expect(isSessionValid(session, -1)).toBe(false);
    expect(isSessionValid(session, session.lastActivityAt - 1)).toBe(false);
  });

  it('CTRL-002/SESSION-015: denies access for malformed ACTIVE states', () => {
    const malformedStates = [
      {
        status: 'ACTIVE',
        session,
        reauthenticationRequestId: 'synthetic-stale-request',
      },
      {
        status: 'ACTIVE',
        session,
      },
    ] as unknown as SessionState[];

    for (const state of malformedStates) {
      expect(canAccessProtectedContent(state, now)).toBe(false);
    }
  });
});
