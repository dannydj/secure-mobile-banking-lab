import type { ProtectedStoragePort } from '../../use-cases/storage/storage.types';

const storageUnavailable = (): never => {
  throw new Error('Protected storage unsupported on this platform');
};

export function createPlatformStorageAdapter(): ProtectedStoragePort {
  return {
    async read() {
      return storageUnavailable();
    },

    async write() {
      storageUnavailable();
    },

    async remove() {
      storageUnavailable();
    },
  };
}
