import type { Clock } from '../session/session-coordinator';
import {
  MAX_SYNTHETIC_PREFERENCE_AGE_MS,
  SYNTHETIC_PREFERENCE_KEY,
  type ProtectedStoragePort,
  type SyntheticPreference,
} from './storage.types';

export type PreferenceLoadResult =
  | Readonly<{
    status: 'FOUND';
    value: SyntheticPreference;
  }>
  | Readonly<{
    status: 'MISSING' | 'INVALID' | 'EXPIRED' | 'ERROR';
  }>;

export function createSyntheticPreferenceLoader(
  storage: ProtectedStoragePort,
  clock: Clock
) {
  return {
    async load(): Promise<PreferenceLoadResult> {
      let raw: string | null;

      try {
        raw = await storage.read(SYNTHETIC_PREFERENCE_KEY);
      } catch {
        return { status: 'ERROR' };
      }

      if (raw === null) {
        return { status: 'MISSING' };
      }

      let parsed: unknown;

      try {
        parsed = JSON.parse(raw);
      } catch {
        return { status: 'INVALID' };
      }

      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        return { status: 'INVALID' };
      }

      const record = parsed as Record<string, unknown>;
      const { version, value, savedAt, expiresAt } = record;

      if (
        Object.keys(record).length !== 4 ||
        version !== 1 ||
        (value !== 'sessions' && value !== 'storage') ||
        typeof savedAt !== 'number' ||
        typeof expiresAt !== 'number' ||
        !Number.isSafeInteger(savedAt) ||
        !Number.isSafeInteger(expiresAt) ||
        savedAt < 0 ||
        expiresAt <= savedAt ||
        expiresAt - savedAt > MAX_SYNTHETIC_PREFERENCE_AGE_MS
      ) {
        return { status: 'INVALID' };
      }

      let now: number;

      try {
        now = clock.now();
      } catch {
        return { status: 'ERROR' };
      }

      if (!Number.isSafeInteger(now) || now < 0) {
        return { status: 'ERROR' };
      }

      if (savedAt > now) {
        return { status: 'INVALID' };
      }

      if (expiresAt <= now) {
        return { status: 'EXPIRED' };
      }

      return { status: 'FOUND', value };
    },
  };
}
