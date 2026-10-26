import type { SessionEvent } from './session-events';
import {
  ABSOLUTE_SESSION_LIFETIME_MS,
  INACTIVITY_TIMEOUT_MS,
  canAccessProtectedContent,
  isSessionValid,
} from './session-policy';
import {
  initialSessionState,
  type SessionState,
} from './session.types';

export type SessionMachineState = Readonly<{
  sessionState: SessionState;
  isForeground: boolean;
  reauthenticationSequence: number;
  sessionSequence: number;
}>;

export type SessionTransitionResult = Readonly<{
  next: SessionMachineState;
  accepted: boolean;
}>;

export const initialSessionMachineState: SessionMachineState = {
  sessionState: initialSessionState,
  isForeground: true,
  reauthenticationSequence: 0,
  sessionSequence: 0,
};

const expiredState: SessionState = {
  status: 'EXPIRED',
  session: null,
  reauthenticationRequestId: null,
};

function hasConsistentSessionIdentity(
  machine: SessionMachineState
): boolean {
  if (
    !Number.isSafeInteger(machine.sessionSequence) ||
    machine.sessionSequence < 0
  ) {
    return false;
  }

  const state = machine.sessionState;

  if (state.status !== 'ACTIVE' && state.status !== 'LOCKED') {
    return true;
  }

  if (!state.session || machine.sessionSequence === 0) {
    return false;
  }

  const expectedSessionId =
    `synthetic-session-${String(machine.sessionSequence).padStart(3, '0')}`;

  return state.session.id === expectedSessionId;
}

function accepted(next: SessionMachineState): SessionTransitionResult {
  return { next, accepted: true };
}

function rejected(next: SessionMachineState): SessionTransitionResult {
  return { next, accepted: false };
}

export function canAccessSession(
  machine: SessionMachineState,
  now: number
): boolean {
  return (
    machine?.isForeground === true &&
    machine.sessionState != null &&
    hasConsistentSessionIdentity(machine) &&
    canAccessProtectedContent(machine.sessionState, now)
  );
}

export function transitionSession(
  machine: SessionMachineState,
  event: SessionEvent,
  now: number
): SessionTransitionResult {
  if (
    !machine ||
    !Number.isSafeInteger(machine.reauthenticationSequence) ||
    machine.reauthenticationSequence < 0 ||
    typeof machine.isForeground !== 'boolean' ||
    !machine.sessionState ||
    !event
  ) {
    return rejected(initialSessionMachineState);
  }

  if (event.type === 'LOGOUT' || event.type === 'APPLICATION_RESTART') {
    return accepted({
      ...machine,
      sessionState: initialSessionState,
    });
  }

  const currentState = machine.sessionState;

  if (
    !['SIGNED_OUT', 'ACTIVE', 'LOCKED', 'EXPIRED'].includes(
      currentState.status
    )
  ) {
    return rejected({
      ...machine,
      sessionState: initialSessionState,
    });
  }

  if (!hasConsistentSessionIdentity(machine)) {
    return rejected({
      ...machine,
      sessionState:
        currentState.status === 'ACTIVE' ||
          currentState.status === 'LOCKED'
          ? expiredState
          : initialSessionState,
    });
  }

  if (
    (currentState.status === 'SIGNED_OUT' ||
      currentState.status === 'EXPIRED') &&
    (currentState.session !== null ||
      currentState.reauthenticationRequestId !== null)
  ) {
    return rejected({
      ...machine,
      sessionState: initialSessionState,
    });
  }

  if (
    currentState.status === 'ACTIVE' &&
    currentState.reauthenticationRequestId !== null
  ) {
    return rejected({
      ...machine,
      sessionState: expiredState,
    });
  }

  if (!Number.isSafeInteger(now) || now < 0) {
    return rejected({
      ...machine,
      sessionState:
        currentState.status === 'ACTIVE' ||
          currentState.status === 'LOCKED'
          ? expiredState
          : currentState,
    });
  }

  let sessionState = currentState;

  if (
    sessionState.status === 'ACTIVE' ||
    sessionState.status === 'LOCKED'
  ) {
    if (!isSessionValid(sessionState.session, now)) {
      sessionState = expiredState;
    } else if (
      sessionState.status === 'ACTIVE' &&
      (!machine.isForeground ||
        now - sessionState.session.lastActivityAt >=
        INACTIVITY_TIMEOUT_MS)
    ) {
      sessionState = {
        status: 'LOCKED',
        session: sessionState.session,
        reauthenticationRequestId: null,
      };
    }
  }

  const current: SessionMachineState = {
    ...machine,
    sessionState,
  };

  switch (event.type) {
    case 'LOGIN_SUCCESS': {
      if (
        !current.isForeground ||
        (sessionState.status !== 'SIGNED_OUT' &&
          sessionState.status !== 'EXPIRED')
      ) {
        return rejected(current);
      }

      const nextSequence = current.sessionSequence + 1;
      const expiresAt = now + ABSOLUTE_SESSION_LIFETIME_MS;

      if (
        !Number.isSafeInteger(nextSequence) ||
        !Number.isSafeInteger(expiresAt)
      ) {
        return rejected(current);
      }

      const sessionId = `synthetic-session-${String(nextSequence).padStart(3, '0')}`;

      return accepted({
        ...current,
        sessionSequence: nextSequence,
        sessionState: {
          status: 'ACTIVE',
          session: {
            id: sessionId,
            authenticatedAt: now,
            lastActivityAt: now,
            expiresAt,
          },
          reauthenticationRequestId: null,
        },
      });
    }

    case 'LOGIN_FAILURE':
      return sessionState.status === 'SIGNED_OUT' ||
        sessionState.status === 'EXPIRED'
        ? accepted(current)
        : rejected(current);

    case 'APP_BACKGROUND':
      return accepted({
        ...current,
        sessionState:
          sessionState.status === 'ACTIVE' ||
            sessionState.status === 'LOCKED'
            ? {
              status: 'LOCKED',
              session: sessionState.session,
              reauthenticationRequestId: null,
            }
            : sessionState,
        isForeground: false,
      });

    case 'APP_FOREGROUND':
      return accepted({
        ...current,
        isForeground: true,
      });

    case 'LOCK_REQUESTED':
      if (sessionState.status !== 'ACTIVE') {
        return rejected(current);
      }

      return accepted({
        ...current,
        sessionState: {
          status: 'LOCKED',
          session: sessionState.session,
          reauthenticationRequestId: null,
        },
      });

    case 'INACTIVITY_TIMEOUT':
      return sessionState.status === 'LOCKED'
        ? accepted(current)
        : rejected(current);

    case 'USER_ACTIVITY':
      if (
        !current.isForeground ||
        sessionState.status !== 'ACTIVE'
      ) {
        return rejected(current);
      }

      return accepted({
        ...current,
        sessionState: {
          ...sessionState,
          session: {
            ...sessionState.session,
            lastActivityAt: now,
          },
        },
      });

    case 'REAUTHENTICATION_REQUESTED': {
      const nextSequence = current.reauthenticationSequence + 1;

      if (
        !current.isForeground ||
        sessionState.status !== 'LOCKED' ||
        !Number.isSafeInteger(nextSequence)
      ) {
        return rejected(current);
      }

      const expectedRequestId = `synthetic-request-${String(nextSequence).padStart(3, '0')}`;

      if (event.requestId !== expectedRequestId) {
        return rejected(current);
      }

      return accepted({
        ...current,
        reauthenticationSequence: nextSequence,
        sessionState: {
          ...sessionState,
          reauthenticationRequestId: expectedRequestId,
        },
      });
    }

    case 'BIOMETRIC_SUCCESS':
    case 'BIOMETRIC_FAILURE':
    case 'BIOMETRIC_CANCELLED':
    case 'BIOMETRIC_UNAVAILABLE':
      if (
        !current.isForeground ||
        sessionState.status !== 'LOCKED' ||
        sessionState.reauthenticationRequestId === null ||
        sessionState.session.id !== event.sessionId ||
        sessionState.reauthenticationRequestId !== event.requestId
      ) {
        return rejected(current);
      }

      if (event.type === 'BIOMETRIC_SUCCESS') {
        return accepted({
          ...current,
          sessionState: {
            status: 'ACTIVE',
            session: {
              ...sessionState.session,
              lastActivityAt: now,
            },
            reauthenticationRequestId: null,
          },
        });
      }

      return accepted({
        ...current,
        sessionState: {
          ...sessionState,
          reauthenticationRequestId: null,
        },
      });

    case 'SESSION_EXPIRED':
      return sessionState.status === 'SIGNED_OUT'
        ? rejected(current)
        : accepted({
          ...current,
          sessionState: expiredState,
        });

    default:
      return rejected({
        ...current,
        sessionState: initialSessionState,
      });
  }
}
