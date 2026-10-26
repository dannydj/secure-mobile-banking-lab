export const SYNTHETIC_PREFERENCE_KEY = 'demo.preference.v1';

export const MAX_SYNTHETIC_PREFERENCE_AGE_MS =
  24 * 60 * 60 * 1000;

export type SyntheticPreference = 'sessions' | 'storage';

export type SyntheticStorageKey =
  typeof SYNTHETIC_PREFERENCE_KEY;

export type ProtectedStoragePort = Readonly<{
  read: (key: SyntheticStorageKey) => Promise<string | null>;
  write: (
    key: SyntheticStorageKey,
    value: string
  ) => Promise<void>;
  remove: (key: SyntheticStorageKey) => Promise<void>;
}>;
