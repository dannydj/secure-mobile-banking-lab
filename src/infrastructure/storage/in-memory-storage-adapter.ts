import type {
  ProtectedStoragePort,
  SyntheticStorageKey,
} from '../../use-cases/storage/storage.types';

type StorageOperation = 'read' | 'write' | 'remove';

export type InMemoryStorageOptions = Readonly<{
  failingOperations?: readonly StorageOperation[];
}>;

export function createInMemoryStorageAdapter(
  options: InMemoryStorageOptions = {}
): ProtectedStoragePort {
  const values = new Map<SyntheticStorageKey, string>();

  const simulateFailure = (operation: StorageOperation): void => {
    if (options.failingOperations?.includes(operation)) {
      throw new Error(`Simulated storage ${operation} failure`);
    }
  };

  return {
    async read(key) {
      simulateFailure('read');
      return values.get(key) ?? null;
    },

    async write(key, value) {
      simulateFailure('write');
      values.set(key, value);
    },

    async remove(key) {
      simulateFailure('remove');
      values.delete(key);
    },
  };
}
