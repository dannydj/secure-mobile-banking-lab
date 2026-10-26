import { createSyntheticPreferenceLoader } from '../../src/use-cases/storage/load-synthetic-preference';
import { createSyntheticPreferenceStore } from '../../src/use-cases/storage/save-synthetic-preference';
import type { SyntheticPreference } from '../../src/use-cases/storage/storage.types';
import { createInMemoryStorageAdapter } from '../../src/infrastructure/storage/in-memory-storage-adapter';

const NOW = 1_700_000_000_000;
const clock = { now: () => NOW };

describe('Synthetic Preference Store', () => {
  it('saves a preference readable by the loader', async () => {
    const storage = createInMemoryStorageAdapter();
    const store = createSyntheticPreferenceStore(storage, clock);
    const loader = createSyntheticPreferenceLoader(storage, clock);

    expect(await store.save('sessions')).toEqual({
      status: 'SAVED',
    });

    expect(await loader.load()).toEqual({
      status: 'FOUND',
      value: 'sessions',
    });
  });

  it('updates an existing preference', async () => {
    const storage = createInMemoryStorageAdapter();
    const store = createSyntheticPreferenceStore(storage, clock);
    const loader = createSyntheticPreferenceLoader(storage, clock);

    await store.save('sessions');

    expect(await store.save('storage')).toEqual({
      status: 'SAVED',
    });

    expect(await loader.load()).toEqual({
      status: 'FOUND',
      value: 'storage',
    });
  });

  it('removes a saved preference', async () => {
    const storage = createInMemoryStorageAdapter();
    const store = createSyntheticPreferenceStore(storage, clock);
    const loader = createSyntheticPreferenceLoader(storage, clock);

    await store.save('sessions');

    expect(await store.clear()).toEqual({
      status: 'REMOVED',
    });

    expect(await loader.load()).toEqual({
      status: 'MISSING',
    });
  });

  it('reports write failures without claiming success', async () => {
    const storage = createInMemoryStorageAdapter({
      failingOperations: ['write'],
    });

    const store = createSyntheticPreferenceStore(storage, clock);
    const loader = createSyntheticPreferenceLoader(storage, clock);

    expect(await store.save('sessions')).toEqual({
      status: 'ERROR',
    });

    expect(await loader.load()).toEqual({
      status: 'MISSING',
    });
  });

  it('reports removal failures without claiming deletion', async () => {
    const storage = createInMemoryStorageAdapter({
      failingOperations: ['remove'],
    });

    const store = createSyntheticPreferenceStore(storage, clock);
    const loader = createSyntheticPreferenceLoader(storage, clock);

    await store.save('sessions');

    expect(await store.clear()).toEqual({
      status: 'ERROR',
    });

    expect(await loader.load()).toEqual({
      status: 'FOUND',
      value: 'sessions',
    });
  });

  it('rejects unsupported values at runtime', async () => {
    const storage = createInMemoryStorageAdapter();
    const store = createSyntheticPreferenceStore(storage, clock);

    const invalidValue =
      'forged-session' as SyntheticPreference;

    expect(await store.save(invalidValue)).toEqual({
      status: 'INVALID',
    });
  });

  it('rejects invalid clock values', async () => {
    const storage = createInMemoryStorageAdapter();

    const store = createSyntheticPreferenceStore(
      storage,
      { now: () => Number.NaN }
    );

    expect(await store.save('sessions')).toEqual({
      status: 'ERROR',
    });
  });

  it('rejects timestamp overflow', async () => {
    const storage = createInMemoryStorageAdapter();

    const store = createSyntheticPreferenceStore(
      storage,
      { now: () => Number.MAX_SAFE_INTEGER }
    );

    expect(await store.save('sessions')).toEqual({
      status: 'ERROR',
    });
  });

  it('handles clock exceptions', async () => {
    const storage = createInMemoryStorageAdapter();

    const store = createSyntheticPreferenceStore(
      storage,
      {
        now: () => {
          throw new Error('Clock unavailable');
        },
      }
    );

    expect(await store.save('sessions')).toEqual({
      status: 'ERROR',
    });
  });
});
