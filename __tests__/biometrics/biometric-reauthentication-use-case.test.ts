import { ABSOLUTE_SESSION_LIFETIME_MS } from '../../src/domain/session/session-policy';
import { createBiometricReauthenticationUseCase } from '../../src/use-cases/biometrics/biometric-reauthentication-use-case';
import type { BiometricAuthenticationPort, BiometricAuthenticationResult } from '../../src/use-cases/biometrics/biometric.types';
import { createSessionCoordinator } from '../../src/use-cases/session/session-coordinator';

const START_TIME = 1_000_000;

function createFixture() {
  let now = START_TIME;

  const coordinator = createSessionCoordinator({
    now: () => now,
  });

  const activate = () => {
    coordinator.dispatch({ type: 'LOGIN_SUCCESS' });
  };

  const lock = () => {
    coordinator.dispatch({ type: 'LOCK_REQUESTED' });
  };

  const createUseCase = (adapter: BiometricAuthenticationPort) =>
    createBiometricReauthenticationUseCase(adapter, coordinator);

  return {
    coordinator,
    activate,
    lock,
    createUseCase,
    setTime: (value: number) => {
      now = value;
    },
  };
}

function deferredResult() {
  let resolve!: (result: BiometricAuthenticationResult) => void;

  const promise = new Promise<BiometricAuthenticationResult>(
    (callback) => {
      resolve = callback;
    }
  );

  return { promise, resolve };
}

describe('Biometric Reauthentication Use Case', () => {
  it('CTRL-004: unlocks a valid locked session without extending expiration', async () => {
    const fixture = createFixture();

    fixture.activate();
    fixture.lock();

    const originalDeadline =
      fixture.coordinator.getSnapshot().sessionState.session?.expiresAt;

    const useCase = fixture.createUseCase({
      authenticate: async () => ({ status: 'SUCCESS' }),
    });

    expect(await useCase.unlock()).toEqual({
      status: 'UNLOCKED',
    });

    expect(fixture.coordinator.canAccess()).toBe(true);

    expect(
      fixture.coordinator.getSnapshot().sessionState.session?.expiresAt
    ).toBe(originalDeadline);
  });

  it.each([
    'FAILURE',
    'CANCELLED',
    'UNAVAILABLE',
    'ERROR',
  ] as const)(
    'CTRL-012: %s cannot unlock a locked session',
    async (status) => {
      const fixture = createFixture();

      fixture.activate();
      fixture.lock();

      const useCase = fixture.createUseCase({
        authenticate: async () => ({ status }),
      });

      expect(await useCase.unlock()).toEqual({ status });
      expect(fixture.coordinator.canAccess()).toBe(false);

      expect(
        fixture.coordinator.getSnapshot().sessionState.status
      ).toBe('LOCKED');
    }
  );

  it('CTRL-012: cannot request biometrics while signed out', async () => {
    const fixture = createFixture();
    const authenticate = jest.fn(async () => ({
      status: 'SUCCESS' as const,
    }));

    const useCase = fixture.createUseCase({ authenticate });

    expect(await useCase.unlock()).toEqual({
      status: 'UNAVAILABLE',
    });

    expect(authenticate).not.toHaveBeenCalled();
    expect(fixture.coordinator.canAccess()).toBe(false);
  });

  it('CTRL-012: cannot request biometrics while already active', async () => {
    const fixture = createFixture();
    fixture.activate();

    const authenticate = jest.fn(async () => ({
      status: 'SUCCESS' as const,
    }));

    const useCase = fixture.createUseCase({ authenticate });

    expect(await useCase.unlock()).toEqual({
      status: 'UNAVAILABLE',
    });

    expect(authenticate).not.toHaveBeenCalled();
  });

  it('CTRL-004: rejects a duplicate biometric request', async () => {
    const fixture = createFixture();
    fixture.activate();
    fixture.lock();

    const deferred = deferredResult();

    const useCase = fixture.createUseCase({
      authenticate: () => deferred.promise,
    });

    const first = useCase.unlock();

    expect(await useCase.unlock()).toEqual({
      status: 'BUSY',
    });

    deferred.resolve({ status: 'SUCCESS' });

    expect(await first).toEqual({
      status: 'UNLOCKED',
    });
  });

  it('CTRL-004: rejects a late result after logout', async () => {
    const fixture = createFixture();
    fixture.activate();
    fixture.lock();

    const deferred = deferredResult();

    const useCase = fixture.createUseCase({
      authenticate: () => deferred.promise,
    });

    const pending = useCase.unlock();

    fixture.coordinator.dispatch({ type: 'LOGOUT' });

    deferred.resolve({ status: 'SUCCESS' });

    expect(await pending).toEqual({
      status: 'CANCELLED',
    });

    expect(fixture.coordinator.canAccess()).toBe(false);
  });

  it('CTRL-004: rejects a result after background and foreground transitions', async () => {
    const fixture = createFixture();
    fixture.activate();
    fixture.lock();

    const deferred = deferredResult();

    const useCase = fixture.createUseCase({
      authenticate: () => deferred.promise,
    });

    const pending = useCase.unlock();

    fixture.coordinator.dispatch({ type: 'APP_BACKGROUND' });
    fixture.coordinator.dispatch({ type: 'APP_FOREGROUND' });

    deferred.resolve({ status: 'SUCCESS' });

    expect(await pending).toEqual({
      status: 'CANCELLED',
    });

    expect(fixture.coordinator.canAccess()).toBe(false);
  });

  it('CTRL-003: cannot unlock after absolute session expiration', async () => {
    const fixture = createFixture();
    fixture.activate();
    fixture.lock();

    const deferred = deferredResult();

    const useCase = fixture.createUseCase({
      authenticate: () => deferred.promise,
    });

    const pending = useCase.unlock();

    fixture.setTime(
      START_TIME + ABSOLUTE_SESSION_LIFETIME_MS + 1
    );

    deferred.resolve({ status: 'SUCCESS' });

    expect(await pending).toEqual({
      status: 'UNAVAILABLE',
    });

    expect(fixture.coordinator.canAccess()).toBe(false);
    expect(
      fixture.coordinator.getSnapshot().sessionState.status
    ).toBe('EXPIRED');
  });

  it('CTRL-012: handles thrown adapter errors without unlocking', async () => {
    const fixture = createFixture();
    fixture.activate();
    fixture.lock();

    const useCase = fixture.createUseCase({
      authenticate: async () => {
        throw new Error('Native biometric API failed');
      },
    });

    expect(await useCase.unlock()).toEqual({
      status: 'ERROR',
    });

    expect(fixture.coordinator.canAccess()).toBe(false);
  });

  it('CTRL-004: ignores a response after disposal', async () => {
    const fixture = createFixture();
    fixture.activate();
    fixture.lock();

    const deferred = deferredResult();

    const useCase = fixture.createUseCase({
      authenticate: () => deferred.promise,
    });

    const pending = useCase.unlock();

    useCase.dispose();

    deferred.resolve({ status: 'SUCCESS' });

    expect(await pending).toEqual({
      status: 'CANCELLED',
    });

    expect(fixture.coordinator.canAccess()).toBe(false);
  });

  it('CTRL-004: accepts biometric success after transient inactive and foreground', async () => {
    const fixture = createFixture();

    fixture.activate();
    fixture.lock();

    const deferred = deferredResult();

    const useCase = fixture.createUseCase({
      authenticate: () => deferred.promise,
    });

    const pending = useCase.unlock();

    fixture.coordinator.dispatch({ type: 'APP_INACTIVE' });

    expect(fixture.coordinator.canAccess()).toBe(false);

    fixture.coordinator.dispatch({ type: 'APP_FOREGROUND' });

    deferred.resolve({ status: 'SUCCESS' });

    expect(await pending).toEqual({
      status: 'UNLOCKED',
    });

    expect(fixture.coordinator.canAccess()).toBe(true);
  });

  it('CTRL-004: does not unlock while inactive and handles success after returning active', async () => {
    const fixture = createFixture();

    fixture.activate();
    fixture.lock();

    const deferred = deferredResult();

    const useCase = fixture.createUseCase({
      authenticate: () => deferred.promise,
    });

    const pending = useCase.unlock();

    fixture.coordinator.dispatch({ type: 'APP_INACTIVE' });

    deferred.resolve({ status: 'SUCCESS' });

    await Promise.resolve();

    expect(fixture.coordinator.canAccess()).toBe(false);

    fixture.coordinator.dispatch({ type: 'APP_FOREGROUND' });

    expect(await pending).toEqual({
      status: 'UNLOCKED',
    });

    expect(fixture.coordinator.canAccess()).toBe(true);
  });

  it('CTRL-004: rejects biometric success when background occurs while waiting for foreground', async () => {
    const fixture = createFixture();

    fixture.activate();
    fixture.lock();

    const deferred = deferredResult();

    const useCase = fixture.createUseCase({
      authenticate: () => deferred.promise,
    });

    const pending = useCase.unlock();

    fixture.coordinator.dispatch({ type: 'APP_INACTIVE' });

    deferred.resolve({ status: 'SUCCESS' });

    await Promise.resolve();

    expect(fixture.coordinator.canAccess()).toBe(false);

    fixture.coordinator.dispatch({ type: 'APP_BACKGROUND' });
    fixture.coordinator.dispatch({ type: 'APP_FOREGROUND' });

    expect(await pending).toEqual({
      status: 'CANCELLED',
    });

    expect(fixture.coordinator.canAccess()).toBe(false);

    expect(
      fixture.coordinator.getSnapshot().sessionState.status
    ).toBe('LOCKED');
  });
});
