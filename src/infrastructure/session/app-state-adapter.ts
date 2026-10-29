import { AppState, type AppStateStatus } from 'react-native';
import type { SessionCoordinator } from '../../use-cases/session/session-coordinator';

export type AppStateEventSource = Readonly<{
  currentState: string | null | undefined;
  addEventListener: (eventType: 'change', listener: (state: AppStateStatus) => void) => { remove: () => void };
}>;

export function observeAppState(coordinator: SessionCoordinator, source: AppStateEventSource = AppState): () => void {
  let disposed = false;
  let lastObservedState: string | null | undefined;
  let hasObservedState = false;

  const handleChange = (state: string | null | undefined): void => {
    if (disposed || (hasObservedState && lastObservedState === state)) {
      return;
    }

    hasObservedState = true;
    lastObservedState = state;

    if (state === 'active') {
      if (!coordinator.getSnapshot().isForeground) {
        coordinator.dispatch({ type: 'APP_FOREGROUND' });
      }

      return;
    }

    if (state === 'inactive') {
      coordinator.dispatch({ type: 'APP_INACTIVE' });
      return;
    }

    coordinator.dispatch({ type: 'APP_BACKGROUND' });
  };

  const subscription = source.addEventListener('change', handleChange);

  handleChange(source.currentState);

  return () => {
    disposed = true;
    subscription.remove();
  };
}
