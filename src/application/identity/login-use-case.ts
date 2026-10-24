import type { SessionCoordinator } from '../session/session-coordinator';
import type {
  DemoLoginInput,
  IdentityAdapter,
  IdentityResult,
} from './identity.types';

type RejectionReason = Extract<
  IdentityResult,
  { accepted: false }
>['reason'];

export type LoginOutcome =
  | Readonly<{ status: 'AUTHENTICATED' }>
  | Readonly<{ status: 'DENIED'; reason: RejectionReason }>
  | Readonly<{
    status: 'ERROR' | 'BUSY' | 'UNAVAILABLE' | 'CANCELLED';
  }>;

export type LoginUseCase = Readonly<{
  login: (input: DemoLoginInput) => Promise<LoginOutcome>;
  cancel: () => void;
  dispose: () => void;
}>;

export function createLoginUseCase(
  adapter: IdentityAdapter,
  coordinator: SessionCoordinator
): LoginUseCase {
  let generation = 0;
  let pending = false;
  let disposed = false;

  const cancel = (): void => {
    generation += 1;
    pending = false;
  };

  const login = async (
    input: DemoLoginInput
  ): Promise<LoginOutcome> => {
    if (disposed) {
      return { status: 'CANCELLED' };
    }

    if (pending) {
      return { status: 'BUSY' };
    }

    const initialSnapshot = coordinator.getSnapshot();
    const status = initialSnapshot.sessionState.status;

    if (
      !initialSnapshot.isForeground ||
      (status !== 'SIGNED_OUT' && status !== 'EXPIRED')
    ) {
      return { status: 'UNAVAILABLE' };
    }

    const attempt = ++generation;
    pending = true;

    const isCurrent = (): boolean =>
      !disposed &&
      generation === attempt &&
      coordinator.getSnapshot() === initialSnapshot;

    try {
      const result = await adapter.authenticate(input);

      if (!isCurrent()) {
        return { status: 'CANCELLED' };
      }

      if (result.accepted === false) {
        coordinator.dispatch({ type: 'LOGIN_FAILURE' });

        return {
          status: 'DENIED',
          reason: result.reason,
        };
      }

      if (
        result.accepted !== true ||
        typeof result.subjectId !== 'string' ||
        result.subjectId.trim().length === 0
      ) {
        return { status: 'ERROR' };
      }

      const transition = coordinator.dispatch({
        type: 'LOGIN_SUCCESS',
      });

      return transition.accepted && coordinator.canAccess()
        ? { status: 'AUTHENTICATED' }
        : { status: 'UNAVAILABLE' };
    } catch {
      if (!isCurrent()) {
        return { status: 'CANCELLED' };
      }

      coordinator.dispatch({ type: 'LOGIN_FAILURE' });

      return { status: 'ERROR' };
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

  return { login, cancel, dispose };
}
