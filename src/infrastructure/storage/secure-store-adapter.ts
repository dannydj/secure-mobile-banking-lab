import type { ProtectedStoragePort } from '../../use-cases/storage/storage.types';

export type SecureStoreDriver = Pick<
  typeof import('expo-secure-store'),
  | 'isAvailableAsync'
  | 'getItemAsync'
  | 'setItemAsync'
  | 'deleteItemAsync'
>;

const STORAGE_OPTIONS = {
  requireAuthentication: false,
} as const;

export function createSecureStoreAdapter(driver: SecureStoreDriver): ProtectedStoragePort {
  const ensureAvailable = async (): Promise<void> => {
    const available = await driver.isAvailableAsync();

    if (!available) {
      throw new Error('Native secure storage unavailable');
    }
  };

  return {
    async read(key) {
      await ensureAvailable();

      return driver.getItemAsync(key, STORAGE_OPTIONS);
    },

    async write(key, value) {
      await ensureAvailable();

      await driver.setItemAsync(
        key,
        value,
        STORAGE_OPTIONS
      );
    },

    async remove(key) {
      await ensureAvailable();

      await driver.deleteItemAsync(
        key,
        STORAGE_OPTIONS
      );
    },
  };
}
