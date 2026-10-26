import type { Clock, SessionCoordinator } from '../session/session-coordinator';
import { createSyntheticPreferenceLoader, type PreferenceLoadResult } from './load-synthetic-preference';
import type { ProtectedStoragePort } from './storage.types';

export const STORAGE_RESTORE_TIMEOUT_MS = 2_000;

export function createSyntheticPreferenceRestorer(storage: ProtectedStoragePort, clock: Clock, coordinator: SessionCoordinator) {
  const loader = createSyntheticPreferenceLoader(storage, clock);

  return {
    async restore(): Promise<PreferenceLoadResult> {
      const restart = coordinator.dispatch({
        type: 'APPLICATION_RESTART',
      });

      if (!restart.accepted) {
        return { status: 'ERROR' };
      }

      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      const timeout = new Promise<PreferenceLoadResult>((resolve) => {
        timeoutId = setTimeout(() => {
          resolve({ status: 'ERROR' });
        }, STORAGE_RESTORE_TIMEOUT_MS);
      });

      try {
        return await Promise.race([
          loader.load(),
          timeout,
        ]);
      } finally {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
        }
      }
    },
  };
}
