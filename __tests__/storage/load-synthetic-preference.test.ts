import { createSessionCoordinator } from '../../src/use-cases/session/session-coordinator';
import { createSyntheticPreferenceLoader } from '../../src/use-cases/storage/load-synthetic-preference';
import { createInMemoryStorageAdapter } from '../../src/infrastructure/storage/in-memory-storage-adapter';

const KEY = 'demo.preference.v1';
const NOW = 1_700_000_000_000;
const clock = { now: () => NOW };

const validPreference = {
  version: 1,
  value: 'sessions',
  savedAt: NOW - 10_000,
  expiresAt: NOW + 10_000,
};

describe('Synthetic Preference Loader', () => {
  it('returns MISSING when no preference exists', async () => {
    const storage = createInMemoryStorageAdapter();
    const loader = createSyntheticPreferenceLoader(storage, clock);

    expect(await loader.load()).toEqual({
      status: 'MISSING',
    });
  });

  it('accepts a valid synthetic preference', async () => {
    const storage = createInMemoryStorageAdapter();

    await storage.write(KEY, JSON.stringify(validPreference));

    const loader = createSyntheticPreferenceLoader(storage, clock);

    expect(await loader.load()).toEqual({
      status: 'FOUND',
      value: 'sessions',
    });
  });

  it('rejects malformed JSON', async () => {
    const storage = createInMemoryStorageAdapter();

    await storage.write(KEY, '{invalid-json');

    const loader = createSyntheticPreferenceLoader(storage, clock);

    expect(await loader.load()).toEqual({
      status: 'INVALID',
    });
  });

  it('rejects an unsupported schema version', async () => {
    const storage = createInMemoryStorageAdapter();

    await storage.write(
      KEY,
      JSON.stringify({
        ...validPreference,
        version: 2,
      })
    );

    const loader = createSyntheticPreferenceLoader(storage, clock);

    expect(await loader.load()).toEqual({
      status: 'INVALID',
    });
  });

  it('rejects expired preferences', async () => {
    const storage = createInMemoryStorageAdapter();

    await storage.write(
      KEY,
      JSON.stringify({
        ...validPreference,
        expiresAt: NOW,
      })
    );

    const loader = createSyntheticPreferenceLoader(storage, clock);

    expect(await loader.load()).toEqual({
      status: 'EXPIRED',
    });
  });

  it('rejects preferences with future creation timestamps', async () => {
    const storage = createInMemoryStorageAdapter();

    await storage.write(
      KEY,
      JSON.stringify({
        ...validPreference,
        savedAt: NOW + 1_000,
        expiresAt: NOW + 10_000,
      })
    );

    const loader = createSyntheticPreferenceLoader(storage, clock);

    expect(await loader.load()).toEqual({
      status: 'INVALID',
    });
  });

  it('handles storage read failures without exposing data', async () => {
    const storage = createInMemoryStorageAdapter({
      failingOperations: ['read'],
    });

    const loader = createSyntheticPreferenceLoader(storage, clock);

    expect(await loader.load()).toEqual({
      status: 'ERROR',
    });
  });

  it('does not authenticate from a forged stored session', async () => {
    const storage = createInMemoryStorageAdapter();
    const coordinator = createSessionCoordinator(clock);

    await storage.write(
      KEY,
      JSON.stringify({
        status: 'ACTIVE',
        sessionId: 'forged-session',
      })
    );

    const loader = createSyntheticPreferenceLoader(storage, clock);

    expect(await loader.load()).toEqual({
      status: 'INVALID',
    });

    expect(
      coordinator.getSnapshot().sessionState.status
    ).toBe('SIGNED_OUT');

    expect(coordinator.canAccess()).toBe(false);
  });
});
