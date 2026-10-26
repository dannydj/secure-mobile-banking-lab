import { createInMemoryStorageAdapter } from '../../src/infrastructure/storage/in-memory-storage-adapter';

const KEY = 'demo.preference.v1' as const;

describe('In-Memory Storage Adapter', () => {
  it('returns null when no value exists', async () => {
    const storage = createInMemoryStorageAdapter();

    expect(await storage.read(KEY)).toBeNull();
  });

  it('stores a synthetic preference', async () => {
    const storage = createInMemoryStorageAdapter();

    await storage.write(KEY, 'sessions');

    expect(await storage.read(KEY)).toBe('sessions');
  });

  it('replaces a previously stored value', async () => {
    const storage = createInMemoryStorageAdapter();

    await storage.write(KEY, 'sessions');
    await storage.write(KEY, 'storage');

    expect(await storage.read(KEY)).toBe('storage');
  });

  it('removes a previously stored value', async () => {
    const storage = createInMemoryStorageAdapter();

    await storage.write(KEY, 'sessions');
    await storage.remove(KEY);

    expect(await storage.read(KEY)).toBeNull();
  });

  it.each(['read', 'write', 'remove'] as const)(
    'simulates a %s failure',
    async (operation) => {
      const storage = createInMemoryStorageAdapter({
        failingOperations: [operation],
      });

      const action = {
        read: () => storage.read(KEY),
        write: () => storage.write(KEY, 'sessions'),
        remove: () => storage.remove(KEY),
      }[operation];

      await expect(action()).rejects.toThrow(
        `Simulated storage ${operation} failure`
      );
    }
  );
});
