import { AppState, type AppStateStatus } from 'react-native';

import type { SessionCoordinator } from '../../application/session/session-coordinator';

export type AppStateEventSource = Readonly<{
  currentState: string | null | undefined;
  addEventListener: (
    eventType: 'change',
    listener: (state: AppStateStatus) => void
  ) => { remove: () => void };
}>;

export function observeAppState(
  coordinator: SessionCoordinator,
  source: AppStateEventSource = AppState
): () => void {
  let disposed = false;

  const handleChange = (state: string | null | undefined): void => {
    if (disposed) {
      return;
    }

    const isForeground = state === 'active';

    if (coordinator.getSnapshot().isForeground === isForeground) {
      return;
    }

    coordinator.dispatch({
      type: isForeground ? 'APP_FOREGROUND' : 'APP_BACKGROUND',
    });
  };

  const subscription = source.addEventListener(
    'change',
    handleChange
  );

  handleChange(source.currentState);

  return () => {
    disposed = true;
    subscription.remove();
  };
}
