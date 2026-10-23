import type { SessionMetadata, SessionState } from './session.types';

export const ABSOLUTE_SESSION_LIFETIME_MS = 15 * 60 * 1000;
export const INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000;

const isValidTimestamp = (value: number): boolean =>
  Number.isSafeInteger(value) && value >= 0;

export function isSessionValid(
  session: SessionMetadata,
  now: number
): boolean {
  if (!session || typeof session.id !== 'string') {
    return false;
  }

  const { id, authenticatedAt, expiresAt, lastActivityAt } = session;

  return (
    id.trim().length > 0 &&
    isValidTimestamp(now) &&
    isValidTimestamp(authenticatedAt) &&
    isValidTimestamp(expiresAt) &&
    isValidTimestamp(lastActivityAt) &&
    authenticatedAt <= lastActivityAt &&
    lastActivityAt < expiresAt &&
    lastActivityAt <= now &&
    expiresAt > authenticatedAt &&
    expiresAt - authenticatedAt <= ABSOLUTE_SESSION_LIFETIME_MS &&
    now < expiresAt
  );
}

export function canAccessProtectedContent(
  state: SessionState,
  now: number
): boolean {
  if (
    state.status !== 'ACTIVE' ||
    state.reauthenticationRequestId !== null
  ) {
    return false;
  }

  return (
    isSessionValid(state.session, now) &&
    now - state.session.lastActivityAt < INACTIVITY_TIMEOUT_MS
  );
}
