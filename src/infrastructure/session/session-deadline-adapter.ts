import type {
  Clock,
  SessionCoordinator,
} from '../../use-cases/session/session-coordinator';

import {
  INACTIVITY_TIMEOUT_MS,
  isSessionValid,
} from '../../domain/session/session-policy';

export function observeSessionDeadlines(
  coordinator: SessionCoordinator,
  clock: Clock
): () => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const cancelScheduledTimeout = (): void => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  const scheduleNextDeadline = (): void => {
    cancelScheduledTimeout();

    if (disposed) {
      return;
    }

    const { sessionState } = coordinator.getSnapshot();

    if (
      sessionState.status !== 'ACTIVE' &&
      sessionState.status !== 'LOCKED'
    ) {
      return;
    }

    const now = clock.now();
    const session = sessionState.session;

    if (!isSessionValid(session, now)) {
      coordinator.dispatch({ type: 'SESSION_EXPIRED' });
      return;
    }

    if (
      sessionState.status === 'ACTIVE' &&
      now - session.lastActivityAt >= INACTIVITY_TIMEOUT_MS
    ) {
      coordinator.dispatch({ type: 'INACTIVITY_TIMEOUT' });
      return;
    }

    const inactivityDeadline =
      session.lastActivityAt + INACTIVITY_TIMEOUT_MS;

    const nextDeadline =
      sessionState.status === 'ACTIVE'
        ? Math.min(inactivityDeadline, session.expiresAt)
        : session.expiresAt;

    timeout = setTimeout(() => {
      timeout = null;
      scheduleNextDeadline();
    }, nextDeadline - now);
  };

  const unsubscribe = coordinator.subscribe(
    scheduleNextDeadline
  );

  scheduleNextDeadline();

  return () => {
    disposed = true;
    unsubscribe();
    cancelScheduledTimeout();
  };
}
