import { createPlatformStorageAdapter as createNativeStorage } from '../../src/infrastructure/storage/platform-storage.native';
import { createPlatformStorageAdapter as createWebStorage } from '../../src/infrastructure/storage/platform-storage.web';
import { SYNTHETIC_PREFERENCE_KEY } from '../../src/use-cases/storage/storage.types';

jest.mock('expo-secure-store', () => ({
  isAvailableAsync: jest.fn(async () => false),
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => { }),
  deleteItemAsync: jest.fn(async () => { }),
}));

describe('Platform Storage Selection', () => {
  it('uses independent in-memory storage instances on web', async () => {
    const first = createWebStorage();
    const second = createWebStorage();

    await first.write(
      SYNTHETIC_PREFERENCE_KEY,
      'synthetic-value'
    );

    expect(
      await first.read(SYNTHETIC_PREFERENCE_KEY)
    ).toBe('synthetic-value');

    expect(
      await second.read(SYNTHETIC_PREFERENCE_KEY)
    ).toBeNull();
  });

  it('supports removing synthetic values on web', async () => {
    const storage = createWebStorage();

    await storage.write(
      SYNTHETIC_PREFERENCE_KEY,
      'synthetic-value'
    );

    await storage.remove(SYNTHETIC_PREFERENCE_KEY);

    expect(
      await storage.read(SYNTHETIC_PREFERENCE_KEY)
    ).toBeNull();
  });

  it('does not fall back to memory when native storage is unavailable', async () => {
    const storage = createNativeStorage();

    await expect(
      storage.read(SYNTHETIC_PREFERENCE_KEY)
    ).rejects.toThrow('Native secure storage unavailable');

    await expect(
      storage.write(
        SYNTHETIC_PREFERENCE_KEY,
        'synthetic-value'
      )
    ).rejects.toThrow('Native secure storage unavailable');
  });
});
