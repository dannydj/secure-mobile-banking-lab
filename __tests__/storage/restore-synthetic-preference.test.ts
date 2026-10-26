import type { IdentityResult } from '../../src/use-cases/identity/identity.types';
import { createLoginUseCase } from '../../src/use-cases/identity/login-use-case';
import { createSessionCoordinator } from '../../src/use-cases/session/session-coordinator';
import { createSyntheticPreferenceRestorer, STORAGE_RESTORE_TIMEOUT_MS } from '../../src/use-cases/storage/restore-synthetic-preference';
import { createSyntheticPreferenceStore } from '../../src/use-cases/storage/save-synthetic-preference';
import { SYNTHETIC_PREFERENCE_KEY, type ProtectedStoragePort } from '../../src/use-cases/storage/storage.types';
import { createInMemoryStorageAdapter } from '../../src/infrastructure/storage/in-memory-storage-adapter';

const NOW = 1_700_000_000_000;
const clock = { now: () => NOW };

function setup(
  storage: ProtectedStoragePort = createInMemoryStorageAdapter()
) {
  const coordinator = createSessionCoordinator(clock);

  return {
    storage,
    coordinator,
    store: createSyntheticPreferenceStore(storage, clock),
    restorer: createSyntheticPreferenceRestorer(
      storage,
      clock,
      coordinator
    ),
  };
}

describe('Synthetic Preference Restoration', () => {
  it('restores a preference but never an active session', async () => {
    const { coordinator, store, restorer } = setup();

    await store.save('sessions');

    coordinator.dispatch({ type: 'LOGIN_SUCCESS' });

    expect(coordinator.canAccess()).toBe(true);

    expect(await restorer.restore()).toEqual({
      status: 'FOUND',
      value: 'sessions',
    });

    expect(coordinator.getSnapshot().sessionState.status).toBe(
      'SIGNED_OUT'
    );
    expect(coordinator.canAccess()).toBe(false);
  });

  it('remains signed out when storage is empty', async () => {
    const { coordinator, restorer } = setup();

    coordinator.dispatch({ type: 'LOGIN_SUCCESS' });

    expect(await restorer.restore()).toEqual({
      status: 'MISSING',
    });

    expect(coordinator.getSnapshot().sessionState.status).toBe(
      'SIGNED_OUT'
    );
    expect(coordinator.canAccess()).toBe(false);
  });

  it('rejects forged session data during restoration', async () => {
    const { storage, coordinator, restorer } = setup();

    await storage.write(
      SYNTHETIC_PREFERENCE_KEY,
      JSON.stringify({
        status: 'ACTIVE',
        sessionId: 'forged-session',
      })
    );

    coordinator.dispatch({ type: 'LOGIN_SUCCESS' });

    expect(await restorer.restore()).toEqual({
      status: 'INVALID',
    });

    expect(coordinator.getSnapshot().sessionState.status).toBe(
      'SIGNED_OUT'
    );
    expect(coordinator.canAccess()).toBe(false);
  });

  it('rejects expired stored preferences', async () => {
    const { storage, coordinator, restorer } = setup();

    await storage.write(
      SYNTHETIC_PREFERENCE_KEY,
      JSON.stringify({
        version: 1,
        value: 'storage',
        savedAt: NOW - 2_000,
        expiresAt: NOW - 1,
      })
    );

    coordinator.dispatch({ type: 'LOGIN_SUCCESS' });

    expect(await restorer.restore()).toEqual({
      status: 'EXPIRED',
    });

    expect(coordinator.canAccess()).toBe(false);
  });

  it('keeps the session closed on a storage read failure', async () => {
    const storage = createInMemoryStorageAdapter({
      failingOperations: ['read'],
    });

    const { coordinator, restorer } = setup(storage);

    coordinator.dispatch({ type: 'LOGIN_SUCCESS' });

    expect(await restorer.restore()).toEqual({
      status: 'ERROR',
    });

    expect(coordinator.getSnapshot().sessionState.status).toBe(
      'SIGNED_OUT'
    );
    expect(coordinator.canAccess()).toBe(false);
  });

  it('rejects a pending login result after restart', async () => {
    const { coordinator, restorer } = setup();

    let resolveIdentity!: (result: IdentityResult) => void;

    const identityPromise = new Promise<IdentityResult>(
      (resolve) => {
        resolveIdentity = resolve;
      }
    );

    const loginUseCase = createLoginUseCase(
      { authenticate: () => identityPromise },
      coordinator
    );

    const pendingLogin = loginUseCase.login({
      username: 'demo-user',
      accessCode: 'demo-only',
    });

    await restorer.restore();

    resolveIdentity({
      accepted: true,
      subjectId: 'synthetic-subject-001',
    });

    expect(await pendingLogin).toEqual({
      status: 'CANCELLED',
    });

    expect(coordinator.getSnapshot().sessionState.status).toBe(
      'SIGNED_OUT'
    );
    expect(coordinator.canAccess()).toBe(false);

    loginUseCase.dispose();
  });

  it('closes access before a slow storage read finishes', async () => {
    let finishRead!: (value: string | null) => void;

    const pendingRead = new Promise<string | null>(
      (resolve) => {
        finishRead = resolve;
      }
    );

    const storage: ProtectedStoragePort = {
      read: () => pendingRead,
      write: async () => { },
      remove: async () => { },
    };

    const { coordinator, restorer } = setup(storage);

    coordinator.dispatch({ type: 'LOGIN_SUCCESS' });

    const restoration = restorer.restore();

    expect(coordinator.getSnapshot().sessionState.status).toBe(
      'SIGNED_OUT'
    );
    expect(coordinator.canAccess()).toBe(false);

    finishRead(null);

    expect(await restoration).toEqual({
      status: 'MISSING',
    });
    expect(coordinator.canAccess()).toBe(false);
  });

  it('CTRL-008: restoration preserves the background state', async () => {
    const { coordinator, restorer } = setup();

    coordinator.dispatch({ type: 'APP_BACKGROUND' });

    expect(coordinator.getSnapshot().isForeground).toBe(false);

    expect(await restorer.restore()).toEqual({
      status: 'MISSING',
    });

    expect(coordinator.getSnapshot().isForeground).toBe(false);
    expect(coordinator.getSnapshot().sessionState.status).toBe(
      'SIGNED_OUT'
    );

    const login = coordinator.dispatch({
      type: 'LOGIN_SUCCESS',
    });

    expect(login.accepted).toBe(false);
    expect(coordinator.canAccess()).toBe(false);

    coordinator.dispatch({ type: 'APP_FOREGROUND' });

    expect(coordinator.getSnapshot().sessionState.status).toBe(
      'SIGNED_OUT'
    );
    expect(coordinator.canAccess()).toBe(false);
  });

  it('CTRL-008: times out when storage never responds', async () => {
    jest.useFakeTimers();

    try {
      const storage: ProtectedStoragePort = {
        read: () => new Promise<string | null>(() => { }),
        write: async () => { },
        remove: async () => { },
      };

      const { coordinator, restorer } = setup(storage);

      coordinator.dispatch({ type: 'LOGIN_SUCCESS' });

      expect(coordinator.canAccess()).toBe(true);

      const restoration = restorer.restore();

      expect(coordinator.getSnapshot().sessionState.status).toBe(
        'SIGNED_OUT'
      );
      expect(coordinator.canAccess()).toBe(false);

      await jest.advanceTimersByTimeAsync(
        STORAGE_RESTORE_TIMEOUT_MS
      );

      expect(await restoration).toEqual({
        status: 'ERROR',
      });

      expect(coordinator.canAccess()).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it('CTRL-008: ignores a storage response arriving after timeout', async () => {
    jest.useFakeTimers();

    try {
      let resolveRead!: (value: string | null) => void;

      const pendingRead = new Promise<string | null>((resolve) => {
        resolveRead = resolve;
      });

      const storage: ProtectedStoragePort = {
        read: () => pendingRead,
        write: async () => { },
        remove: async () => { },
      };

      const { coordinator, restorer } = setup(storage);

      const restoration = restorer.restore();

      await jest.advanceTimersByTimeAsync(
        STORAGE_RESTORE_TIMEOUT_MS
      );

      expect(await restoration).toEqual({
        status: 'ERROR',
      });

      resolveRead(
        JSON.stringify({
          version: 1,
          value: 'sessions',
          savedAt: NOW - 1_000,
          expiresAt: NOW + 60_000,
        })
      );

      await pendingRead;

      expect(await restoration).toEqual({
        status: 'ERROR',
      });

      expect(coordinator.getSnapshot().sessionState.status).toBe(
        'SIGNED_OUT'
      );

      expect(coordinator.canAccess()).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });
});
