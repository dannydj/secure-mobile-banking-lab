
import type { SessionCoordinator } from '../session/session-coordinator';
import type { BiometricAuthenticationPort, BiometricAuthenticationResult } from './biometric.types';

export type BiometricReauthenticationOutcome = Readonly<{
  status:
  | 'UNLOCKED'
  | 'FAILURE'
  | 'CANCELLED'
  | 'UNAVAILABLE'
  | 'ERROR'
  | 'BUSY';
}>;

export type BiometricReauthenticationUseCase = Readonly<{
  unlock: () => Promise<BiometricReauthenticationOutcome>;
  cancel: () => void;
  dispose: () => void;
}>;

export function createBiometricReauthenticationUseCase(adapter: BiometricAuthenticationPort, coordinator: SessionCoordinator): BiometricReauthenticationUseCase {
  let generation = 0;
  let pending = false;
  let disposed = false;
  let cancelForegroundWait: (() => void) | null = null;

  const cancel = (): void => {
    generation += 1;
    pending = false;
    cancelForegroundWait?.();
  };

  const unlock = async (): Promise<BiometricReauthenticationOutcome> => {
    if (disposed) {
      return { status: 'CANCELLED' };
    }

    if (pending) {
      return { status: 'BUSY' };
    }

    const snapshot = coordinator.getSnapshot();

    if (!snapshot.isForeground || snapshot.sessionState.status !== 'LOCKED') {
      return { status: 'UNAVAILABLE' };
    }

    const nextSequence = snapshot.reauthenticationSequence + 1;

    if (!Number.isSafeInteger(nextSequence)) {
      return { status: 'UNAVAILABLE' };
    }

    const sessionId = snapshot.sessionState.session.id;
    const requestId = `synthetic-request-${String(nextSequence).padStart(3, '0')}`;

    const request = coordinator.dispatch({ type: 'REAUTHENTICATION_REQUESTED', requestId });

    if (!request.accepted) {
      return { status: 'UNAVAILABLE' };
    }

    const attempt = ++generation;
    pending = true;

    const isCurrent = (): boolean => {
      const current = coordinator.getSnapshot().sessionState;

      return (
        !disposed &&
        generation === attempt &&
        current.status === 'LOCKED' &&
        current.session.id === sessionId &&
        current.reauthenticationRequestId === requestId
      );
    };

    const waitForForeground = (): Promise<boolean> => {
      if (!isCurrent()) {
        return Promise.resolve(false);
      }

      if (coordinator.getSnapshot().isForeground) {
        return Promise.resolve(true);
      }

      return new Promise<boolean>((resolve) => {
        let settled = false;

        const finish = (accepted: boolean): void => {
          if (settled) {
            return;
          }

          settled = true;
          unsubscribe();

          if (cancelForegroundWait === abortWait) {
            cancelForegroundWait = null;
          }

          resolve(accepted);
        };

        const abortWait = (): void => {
          finish(false);
        };

        const check = (): void => {
          if (!isCurrent()) {
            finish(false);
          } else if (coordinator.getSnapshot().isForeground) {
            finish(true);
          }
        };

        const unsubscribe = coordinator.subscribe(check);

        cancelForegroundWait = abortWait;
        check();
      });
    };

    try {
      let result: BiometricAuthenticationResult;

      try {
        result = await adapter.authenticate();
      } catch {
        result = { status: 'ERROR' };
      }

      if (!isCurrent()) {
        return { status: 'CANCELLED' };
      }

      if (!(await waitForForeground()) || !isCurrent()) {
        return { status: 'CANCELLED' };
      }

      const eventType =
        result.status === 'SUCCESS'
          ? 'BIOMETRIC_SUCCESS'
          : result.status === 'FAILURE'
            ? 'BIOMETRIC_FAILURE'
            : result.status === 'CANCELLED'
              ? 'BIOMETRIC_CANCELLED'
              : 'BIOMETRIC_UNAVAILABLE';

      const transition = coordinator.dispatch({
        type: eventType,
        sessionId,
        requestId,
      });

      if (!transition.accepted) {
        return { status: 'UNAVAILABLE' };
      }

      if (result.status === 'SUCCESS') {
        return coordinator.canAccess()
          ? { status: 'UNLOCKED' }
          : { status: 'UNAVAILABLE' };
      }

      return { status: result.status };
    } finally {
      if (generation === attempt) {
        pending = false;
      }
    }
  };

  const dispose = (): void => {
    disposed = true;
    cancel();
  };

  return { unlock, cancel, dispose };
}
