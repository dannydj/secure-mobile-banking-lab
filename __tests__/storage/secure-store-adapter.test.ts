import { createSecureStoreAdapter, type SecureStoreDriver, } from '../../src/infrastructure/storage/secure-store-adapter';
import { SYNTHETIC_PREFERENCE_KEY, type ProtectedStoragePort } from '../../src/use-cases/storage/storage.types';

type StorageOperation = 'read' | 'write' | 'remove';

function createDriver(overrides: Partial<SecureStoreDriver> = {}): SecureStoreDriver {
  const values = new Map<string, string>();

  return {
    isAvailableAsync: async () => true,

    getItemAsync: async (key) => {
      return values.get(key) ?? null;
    },

    setItemAsync: async (key, value) => {
      values.set(key, value);
    },

    deleteItemAsync: async (key) => {
      values.delete(key);
    },

    ...overrides,
  };
}

async function runOperation(adapter: ProtectedStoragePort, operation: StorageOperation): Promise<unknown> {
  switch (operation) {
    case 'read':
      return adapter.read(SYNTHETIC_PREFERENCE_KEY);

    case 'write':
      return adapter.write(
        SYNTHETIC_PREFERENCE_KEY,
        'synthetic-value'
      );

    case 'remove':
      return adapter.remove(SYNTHETIC_PREFERENCE_KEY);
  }
}

describe('Native SecureStore Adapter', () => {
  it('returns null when a preference is missing', async () => {
    const adapter = createSecureStoreAdapter(createDriver());

    expect(
      await adapter.read(SYNTHETIC_PREFERENCE_KEY)
    ).toBeNull();
  });

  it('writes and reads a synthetic value', async () => {
    const adapter = createSecureStoreAdapter(createDriver());

    await adapter.write(
      SYNTHETIC_PREFERENCE_KEY,
      'synthetic-value'
    );

    expect(
      await adapter.read(SYNTHETIC_PREFERENCE_KEY)
    ).toBe('synthetic-value');
  });

  it('replaces an existing value', async () => {
    const adapter = createSecureStoreAdapter(createDriver());

    await adapter.write(SYNTHETIC_PREFERENCE_KEY, 'first');
    await adapter.write(SYNTHETIC_PREFERENCE_KEY, 'second');

    expect(
      await adapter.read(SYNTHETIC_PREFERENCE_KEY)
    ).toBe('second');
  });

  it('removes a stored value', async () => {
    const adapter = createSecureStoreAdapter(createDriver());

    await adapter.write(
      SYNTHETIC_PREFERENCE_KEY,
      'synthetic-value'
    );

    await adapter.remove(SYNTHETIC_PREFERENCE_KEY);

    expect(
      await adapter.read(SYNTHETIC_PREFERENCE_KEY)
    ).toBeNull();
  });

  it('passes explicit non-biometric options to native operations', async () => {
    const getItemAsync = jest.fn(async () => null);
    const setItemAsync = jest.fn(async () => { });
    const deleteItemAsync = jest.fn(async () => { });

    const adapter = createSecureStoreAdapter(
      createDriver({
        getItemAsync,
        setItemAsync,
        deleteItemAsync,
      })
    );

    await adapter.read(SYNTHETIC_PREFERENCE_KEY);

    await adapter.write(
      SYNTHETIC_PREFERENCE_KEY,
      'synthetic-value'
    );

    await adapter.remove(SYNTHETIC_PREFERENCE_KEY);

    const options = { requireAuthentication: false };

    expect(getItemAsync).toHaveBeenCalledWith(
      SYNTHETIC_PREFERENCE_KEY,
      options
    );

    expect(setItemAsync).toHaveBeenCalledWith(
      SYNTHETIC_PREFERENCE_KEY,
      'synthetic-value',
      options
    );

    expect(deleteItemAsync).toHaveBeenCalledWith(
      SYNTHETIC_PREFERENCE_KEY,
      options
    );
  });

  it.each<StorageOperation>([
    'read',
    'write',
    'remove',
  ])(
    'fails closed when native storage is unavailable during %s',
    async (operation) => {
      const driver = createDriver({
        isAvailableAsync: async () => false,
      });

      const adapter = createSecureStoreAdapter(driver);

      await expect(
        runOperation(adapter, operation)
      ).rejects.toThrow('Native secure storage unavailable');
    }
  );

  it.each<StorageOperation>([
    'read',
    'write',
    'remove',
  ])(
    'propagates native %s failures',
    async (operation) => {
      const nativeFailure = async (): Promise<never> => {
        throw new Error('Simulated native storage failure');
      };

      const driver = createDriver({
        ...(operation === 'read'
          ? { getItemAsync: nativeFailure }
          : operation === 'write'
            ? { setItemAsync: nativeFailure }
            : { deleteItemAsync: nativeFailure }),
      });

      const adapter = createSecureStoreAdapter(driver);

      await expect(
        runOperation(adapter, operation)
      ).rejects.toThrow('Simulated native storage failure');
    }
  );
});
