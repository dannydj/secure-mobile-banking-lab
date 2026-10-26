import type { Clock } from '../session/session-coordinator';
import {
  MAX_SYNTHETIC_PREFERENCE_AGE_MS,
  SYNTHETIC_PREFERENCE_KEY,
  type ProtectedStoragePort,
  type SyntheticPreference,
} from './storage.types';

export type PreferenceSaveResult = Readonly<{
  status: 'SAVED' | 'INVALID' | 'ERROR';
}>;

export type PreferenceClearResult = Readonly<{
  status: 'REMOVED' | 'ERROR';
}>;

export function createSyntheticPreferenceStore(
  storage: ProtectedStoragePort,
  clock: Clock
) {
  return {
    async save(
      value: SyntheticPreference
    ): Promise<PreferenceSaveResult> {
      if (value !== 'sessions' && value !== 'storage') {
        return { status: 'INVALID' };
      }

      let savedAt: number;

      try {
        savedAt = clock.now();
      } catch {
        return { status: 'ERROR' };
      }

      if (
        !Number.isSafeInteger(savedAt) ||
        savedAt < 0
      ) {
        return { status: 'ERROR' };
      }

      const expiresAt =
        savedAt + MAX_SYNTHETIC_PREFERENCE_AGE_MS;

      if (!Number.isSafeInteger(expiresAt)) {
        return { status: 'ERROR' };
      }

      const payload = JSON.stringify({
        version: 1,
        value,
        savedAt,
        expiresAt,
      });

      try {
        await storage.write(
          SYNTHETIC_PREFERENCE_KEY,
          payload
        );

        return { status: 'SAVED' };
      } catch {
        return { status: 'ERROR' };
      }
    },

    async clear(): Promise<PreferenceClearResult> {
      try {
        await storage.remove(SYNTHETIC_PREFERENCE_KEY);

        return { status: 'REMOVED' };
      } catch {
        return { status: 'ERROR' };
      }
    },
  };
}
