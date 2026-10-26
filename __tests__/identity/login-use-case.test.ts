import {
  createLoginUseCase,
} from '../../src/use-cases/identity/login-use-case';

import type {
  IdentityAdapter,
  IdentityResult,
} from '../../src/use-cases/identity/identity.types';

import {
  createSessionCoordinator,
} from '../../src/use-cases/session/session-coordinator';

const INPUT = {
  username: 'demo-user',
  accessCode: 'demo-only',
};

const ACCEPTED: IdentityResult = {
  accepted: true,
  subjectId: 'synthetic-subject-001',
};

function deferredIdentityResult() {
  let resolve!: (result: IdentityResult) => void;

  const promise = new Promise<IdentityResult>((callback) => {
    resolve = callback;
  });

  return { promise, resolve };
}

describe('Login Use Case', () => {
  function createCoordinator() {
    return createSessionCoordinator({
      now: () => 1_000_000,
    });
  }

  it('CTRL-001: establishes a session after accepted identity', async () => {
    const coordinator = createCoordinator();
    const adapter: IdentityAdapter = {
      authenticate: async () => ACCEPTED,
    };

    const login = createLoginUseCase(adapter, coordinator);

    expect(await login.login(INPUT)).toEqual({
      status: 'AUTHENTICATED',
    });

    expect(coordinator.canAccess()).toBe(true);
  });

  it('SESSION-002: rejected identity cannot open a session', async () => {
    const coordinator = createCoordinator();
    const adapter: IdentityAdapter = {
      authenticate: async () => ({
        accepted: false,
        reason: 'NOT_RECOGNIZED',
      }),
    };

    const login = createLoginUseCase(adapter, coordinator);

    expect(await login.login(INPUT)).toEqual({
      status: 'DENIED',
      reason: 'NOT_RECOGNIZED',
    });

    expect(coordinator.canAccess()).toBe(false);
  });

  it('fails closed when the identity adapter throws', async () => {
    const coordinator = createCoordinator();
    const adapter: IdentityAdapter = {
      authenticate: async () => {
        throw new Error('Synthetic adapter unavailable');
      },
    };

    const login = createLoginUseCase(adapter, coordinator);

    expect(await login.login(INPUT)).toEqual({
      status: 'ERROR',
    });

    expect(coordinator.canAccess()).toBe(false);
  });

  it('rejects a duplicate login while an attempt is pending', async () => {
    const coordinator = createCoordinator();
    const deferred = deferredIdentityResult();

    const adapter: IdentityAdapter = {
      authenticate: () => deferred.promise,
    };

    const login = createLoginUseCase(adapter, coordinator);

    const first = login.login(INPUT);

    expect(await login.login(INPUT)).toEqual({
      status: 'BUSY',
    });

    deferred.resolve(ACCEPTED);

    expect(await first).toEqual({
      status: 'AUTHENTICATED',
    });
  });

  it('rejects a late result after background and foreground events', async () => {
    const coordinator = createCoordinator();
    const deferred = deferredIdentityResult();

    const adapter: IdentityAdapter = {
      authenticate: () => deferred.promise,
    };

    const login = createLoginUseCase(adapter, coordinator);
    const pending = login.login(INPUT);

    coordinator.dispatch({ type: 'APP_BACKGROUND' });
    coordinator.dispatch({ type: 'APP_FOREGROUND' });

    deferred.resolve(ACCEPTED);

    expect(await pending).toEqual({
      status: 'CANCELLED',
    });

    expect(coordinator.canAccess()).toBe(false);
  });

  it('rejects a late result after logout', async () => {
    const coordinator = createCoordinator();
    const deferred = deferredIdentityResult();

    const adapter: IdentityAdapter = {
      authenticate: () => deferred.promise,
    };

    const login = createLoginUseCase(adapter, coordinator);
    const pending = login.login(INPUT);

    coordinator.dispatch({ type: 'LOGOUT' });

    deferred.resolve(ACCEPTED);

    expect(await pending).toEqual({
      status: 'CANCELLED',
    });

    expect(coordinator.canAccess()).toBe(false);
  });

  it('invalidates an old attempt when a replacement begins', async () => {
    const coordinator = createCoordinator();
    const oldAttempt = deferredIdentityResult();

    const adapter: IdentityAdapter = {
      authenticate: jest
        .fn()
        .mockImplementationOnce(() => oldAttempt.promise)
        .mockResolvedValueOnce(ACCEPTED),
    };

    const login = createLoginUseCase(adapter, coordinator);

    const pending = login.login(INPUT);

    login.cancel();

    expect(await login.login(INPUT)).toEqual({
      status: 'AUTHENTICATED',
    });

    oldAttempt.resolve(ACCEPTED);

    expect(await pending).toEqual({
      status: 'CANCELLED',
    });

    expect(coordinator.getSnapshot().sessionSequence).toBe(1);
  });

  it('rejects pending results after disposal', async () => {
    const coordinator = createCoordinator();
    const deferred = deferredIdentityResult();

    const adapter: IdentityAdapter = {
      authenticate: () => deferred.promise,
    };

    const login = createLoginUseCase(adapter, coordinator);
    const pending = login.login(INPUT);

    login.dispose();
    deferred.resolve(ACCEPTED);

    expect(await pending).toEqual({
      status: 'CANCELLED',
    });

    expect(await login.login(INPUT)).toEqual({
      status: 'CANCELLED',
    });

    expect(coordinator.canAccess()).toBe(false);
  });
});
