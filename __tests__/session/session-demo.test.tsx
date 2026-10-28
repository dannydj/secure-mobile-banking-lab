import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { AppStateStatus } from 'react-native';
import { SessionDemo } from '../../src/app/index';
import { INACTIVITY_TIMEOUT_MS } from '../../src/domain/session/session-policy';
import { createInMemoryStorageAdapter } from '../../src/infrastructure/storage/in-memory-storage-adapter';
import type { IdentityAdapter, IdentityResult } from '../../src/use-cases/identity/identity.types';
import { createSessionCoordinator } from '../../src/use-cases/session/session-coordinator';
import { STORAGE_RESTORE_TIMEOUT_MS } from '../../src/use-cases/storage/restore-synthetic-preference';
import type { ProtectedStoragePort } from '../../src/use-cases/storage/storage.types';
import { SYNTHETIC_PREFERENCE_KEY } from '../../src/use-cases/storage/storage.types';

const START_TIME = 1_000_000;

function createMockAppState(initialState: AppStateStatus | null) {
  let currentState = initialState;
  const listeners = new Set<(state: AppStateStatus) => void>();

  return {
    get currentState() {
      return currentState;
    },

    addEventListener(
      _eventType: 'change',
      listener: (state: AppStateStatus) => void
    ) {
      listeners.add(listener);

      return {
        remove: () => {
          listeners.delete(listener);
        },
      };
    },

    emit(state: AppStateStatus) {
      currentState = state;
      listeners.forEach((listener) => listener(state));
    },

    get listenerCount() {
      return listeners.size;
    },
  };
}

describe('Session Demo Integration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('hides synthetic protected content when backgrounded', async () => {
    const clock = { now: () => START_TIME };
    const coordinator = createSessionCoordinator(clock);
    const source = createMockAppState('active');

    const screen = await render(
      <SessionDemo
        coordinator={coordinator}
        clock={clock}
        appStateSource={source}
      />
    );

    await fireEvent.press(screen.getByText('Simulate login'));

    expect(
      screen.getByText('Protected synthetic preview')
    ).toBeTruthy();

    await act(() => {
      source.emit('background');
    });

    expect(
      screen.queryByText('Protected synthetic preview')
    ).toBeNull();

    expect(
      screen.getByText('Protected content hidden')
    ).toBeTruthy();

    await act(() => {
      source.emit('active');
    });

    expect(screen.getByText('Session status: LOCKED')).toBeTruthy();
    expect(
      screen.queryByText('Protected synthetic preview')
    ).toBeNull();

    await screen.unmount();
    expect(source.listenerCount).toBe(0);
  });

  it('hides protected content when inactivity timeout is reached', async () => {
    let now = START_TIME;
    const clock = { now: () => now };
    const coordinator = createSessionCoordinator(clock);
    const source = createMockAppState('active');

    const screen = await render(
      <SessionDemo
        coordinator={coordinator}
        clock={clock}
        appStateSource={source}
      />
    );

    await fireEvent.press(screen.getByText('Simulate login'));

    expect(
      screen.getByText('Protected synthetic preview')
    ).toBeTruthy();

    await act(() => {
      now += INACTIVITY_TIMEOUT_MS;
      jest.advanceTimersByTime(INACTIVITY_TIMEOUT_MS);
    });

    expect(screen.getByText('Session status: LOCKED')).toBeTruthy();

    expect(
      screen.queryByText('Protected synthetic preview')
    ).toBeNull();

    await screen.unmount();

    expect(source.listenerCount).toBe(0);

    source.emit('background');

    expect(coordinator.getSnapshot().isForeground).toBe(true);
  });

  it('does not allow simulated login with an unknown AppState', async () => {
    const clock = { now: () => START_TIME };
    const coordinator = createSessionCoordinator(clock);
    const source = createMockAppState(null);

    const screen = await render(
      <SessionDemo
        coordinator={coordinator}
        clock={clock}
        appStateSource={source}
      />
    );

    expect(screen.getByText('Foreground: no')).toBeTruthy();

    await fireEvent.press(screen.getByText('Simulate login'));

    expect(
      screen.queryByText('Protected synthetic preview')
    ).toBeNull();

    await act(() => {
      source.emit('active');
    });

    await fireEvent.press(screen.getByText('Simulate login'));

    expect(
      screen.getByText('Protected synthetic preview')
    ).toBeTruthy();

    await screen.unmount();
  });

  it('CTRL-001: rejects invalid demo credentials and accepts valid ones', async () => {
    const clock = { now: () => START_TIME };
    const coordinator = createSessionCoordinator(clock);
    const source = createMockAppState('active');

    const screen = await render(
      <SessionDemo
        coordinator={coordinator}
        clock={clock}
        appStateSource={source}
      />
    );

    await fireEvent.changeText(
      screen.getByLabelText('Demo access code'),
      'incorrect-code'
    );

    await fireEvent.press(screen.getByText('Simulate login'));

    expect(
      screen.getByText('Synthetic identity not recognized.')
    ).toBeTruthy();

    expect(
      screen.getByText('Session status: SIGNED_OUT')
    ).toBeTruthy();

    expect(
      screen.queryByText('Protected synthetic preview')
    ).toBeNull();

    await fireEvent.changeText(
      screen.getByLabelText('Demo access code'),
      'demo-only'
    );

    await fireEvent.press(screen.getByText('Simulate login'));

    expect(screen.getByText('Session status: ACTIVE')).toBeTruthy();

    expect(
      screen.getByText('Protected synthetic preview')
    ).toBeTruthy();

    await screen.unmount();
  });

  it('CTRL-001: ignores a late login result after background and foreground', async () => {
    const clock = { now: () => START_TIME };
    const coordinator = createSessionCoordinator(clock);
    const source = createMockAppState('active');

    let resolveIdentity!: (result: IdentityResult) => void;

    const identityPromise = new Promise<IdentityResult>((resolve) => {
      resolveIdentity = resolve;
    });

    const adapter: IdentityAdapter = {
      authenticate: () => identityPromise,
    };

    const screen = await render(
      <SessionDemo
        coordinator={coordinator}
        clock={clock}
        appStateSource={source}
        identityAdapter={adapter}
      />
    );

    await fireEvent.press(screen.getByText('Simulate login'));

    expect(
      screen.getByText('Checking synthetic identity...')
    ).toBeTruthy();

    await act(() => {
      source.emit('background');
    });

    await act(() => {
      source.emit('active');
    });

    await act(async () => {
      resolveIdentity({
        accepted: true,
        subjectId: 'synthetic-subject-001',
      });

      await identityPromise;
    });

    expect(
      screen.getByText('Session status: SIGNED_OUT')
    ).toBeTruthy();

    expect(
      screen.queryByText('Protected synthetic preview')
    ).toBeNull();

    expect(coordinator.canAccess()).toBe(false);

    await screen.unmount();
  });

  it('CTRL-001: keeps protected content hidden when the adapter fails', async () => {
    const clock = { now: () => START_TIME };
    const coordinator = createSessionCoordinator(clock);
    const source = createMockAppState('active');

    const adapter: IdentityAdapter = {
      authenticate: async () => {
        throw new Error('Synthetic service unavailable');
      },
    };

    const screen = await render(
      <SessionDemo
        coordinator={coordinator}
        clock={clock}
        appStateSource={source}
        identityAdapter={adapter}
      />
    );

    await fireEvent.press(screen.getByText('Simulate login'));

    expect(
      screen.getByText('Synthetic identity service unavailable.')
    ).toBeTruthy();

    expect(
      screen.getByText('Session status: SIGNED_OUT')
    ).toBeTruthy();

    expect(
      screen.queryByText('Protected synthetic preview')
    ).toBeNull();

    await screen.unmount();
  });

  it('CTRL-001: prevents authentication after the screen unmounts', async () => {
    const clock = { now: () => START_TIME };
    const coordinator = createSessionCoordinator(clock);
    const source = createMockAppState('active');

    let resolveIdentity!: (result: IdentityResult) => void;

    const identityPromise = new Promise<IdentityResult>((resolve) => {
      resolveIdentity = resolve;
    });

    const adapter: IdentityAdapter = {
      authenticate: () => identityPromise,
    };

    const screen = await render(
      <SessionDemo
        coordinator={coordinator}
        clock={clock}
        appStateSource={source}
        identityAdapter={adapter}
      />
    );

    await fireEvent.press(screen.getByText('Simulate login'));

    await screen.unmount();

    await act(async () => {
      resolveIdentity({
        accepted: true,
        subjectId: 'synthetic-subject-001',
      });

      await identityPromise;
    });

    expect(coordinator.canAccess()).toBe(false);
    expect(source.listenerCount).toBe(0);
  });

  it('CTRL-001: prevents duplicate authentication requests from the UI', async () => {
    const clock = { now: () => START_TIME };
    const coordinator = createSessionCoordinator(clock);
    const source = createMockAppState('active');

    let resolveIdentity!: (result: IdentityResult) => void;

    const identityPromise = new Promise<IdentityResult>((resolve) => {
      resolveIdentity = resolve;
    });

    const authenticate = jest.fn(() => identityPromise);

    const adapter: IdentityAdapter = {
      authenticate,
    };

    const screen = await render(
      <SessionDemo
        coordinator={coordinator}
        clock={clock}
        appStateSource={source}
        identityAdapter={adapter}
      />
    );

    await fireEvent.press(screen.getByText('Simulate login'));
    await fireEvent.press(screen.getByText('Simulate login'));

    expect(authenticate).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveIdentity({
        accepted: true,
        subjectId: 'synthetic-subject-001',
      });

      await identityPromise;
    });

    expect(screen.getByText('Session status: ACTIVE')).toBeTruthy();

    expect(
      screen.getByText('Protected synthetic preview')
    ).toBeTruthy();

    expect(coordinator.getSnapshot().sessionSequence).toBe(1);

    await screen.unmount();
  });

  it('CTRL-001: allows a new login after cancelling a backgrounded attempt', async () => {
    const clock = { now: () => START_TIME };
    const coordinator = createSessionCoordinator(clock);
    const source = createMockAppState('active');

    let resolveFirst!: (result: IdentityResult) => void;

    const firstPromise = new Promise<IdentityResult>((resolve) => {
      resolveFirst = resolve;
    });

    const accepted: IdentityResult = {
      accepted: true,
      subjectId: 'synthetic-subject-001',
    };

    const authenticate = jest
      .fn()
      .mockImplementationOnce(() => firstPromise)
      .mockResolvedValueOnce(accepted);

    const adapter: IdentityAdapter = { authenticate };

    const screen = await render(
      <SessionDemo
        coordinator={coordinator}
        clock={clock}
        appStateSource={source}
        identityAdapter={adapter}
      />
    );

    await fireEvent.press(screen.getByText('Simulate login'));

    expect(authenticate).toHaveBeenCalledTimes(1);

    await act(() => {
      source.emit('background');
    });

    await act(() => {
      source.emit('active');
    });

    expect(
      screen.getByText('Session status: SIGNED_OUT')
    ).toBeTruthy();

    expect(
      screen.queryByText('Checking synthetic identity...')
    ).toBeNull();

    await fireEvent.press(screen.getByText('Simulate login'));

    expect(authenticate).toHaveBeenCalledTimes(2);

    expect(
      screen.getByText('Session status: ACTIVE')
    ).toBeTruthy();

    await act(async () => {
      resolveFirst(accepted);
      await firstPromise;
    });

    expect(coordinator.getSnapshot().sessionSequence).toBe(1);
    expect(coordinator.canAccess()).toBe(true);

    expect(
      screen.getByText('Protected synthetic preview')
    ).toBeTruthy();

    expect(
      screen.queryByText('Login attempt cancelled.')
    ).toBeNull();

    await screen.unmount();

    expect(source.listenerCount).toBe(0);
  });

  it('CTRL-008: restores a synthetic preference without restoring session access', async () => {
    const clock = { now: () => START_TIME };
    const coordinator = createSessionCoordinator(clock);
    const source = createMockAppState('active');
    const storage = createInMemoryStorageAdapter();

    await storage.write(
      'demo.preference.v1',
      JSON.stringify({
        version: 1,
        value: 'sessions',
        savedAt: START_TIME - 1_000,
        expiresAt: START_TIME + 60_000,
      })
    );

    coordinator.dispatch({ type: 'LOGIN_SUCCESS' });

    expect(coordinator.canAccess()).toBe(true);

    const screen = await render(
      <SessionDemo
        coordinator={coordinator}
        clock={clock}
        appStateSource={source}
        storageAdapter={storage}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText('Synthetic preference: sessions')
      ).toBeTruthy();
    });

    expect(
      screen.getByText('Session status: SIGNED_OUT')
    ).toBeTruthy();

    expect(
      screen.queryByText('Protected synthetic preview')
    ).toBeNull();

    expect(coordinator.canAccess()).toBe(false);

    await screen.unmount();
  });

  it('CTRL-008: keeps protected content hidden when storage restoration fails', async () => {
    const clock = { now: () => START_TIME };
    const coordinator = createSessionCoordinator(clock);
    const source = createMockAppState('active');

    const storage = createInMemoryStorageAdapter({
      failingOperations: ['read'],
    });

    coordinator.dispatch({ type: 'LOGIN_SUCCESS' });

    const screen = await render(
      <SessionDemo
        coordinator={coordinator}
        clock={clock}
        appStateSource={source}
        storageAdapter={storage}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText('Synthetic preference: unavailable')
      ).toBeTruthy();
    });

    expect(
      screen.getByText('Session status: SIGNED_OUT')
    ).toBeTruthy();

    expect(
      screen.queryByText('Protected synthetic preview')
    ).toBeNull();

    expect(coordinator.canAccess()).toBe(false);

    await screen.unmount();
  });

  it('CTRL-008: blocks login until storage initialization finishes', async () => {
    const clock = { now: () => START_TIME };
    const coordinator = createSessionCoordinator(clock);
    const source = createMockAppState('active');

    const storage: ProtectedStoragePort = {
      read: () => new Promise<string | null>(() => { }),
      write: async () => { },
      remove: async () => { },
    };

    const authenticate = jest.fn(async () => ({
      accepted: true as const,
      subjectId: 'synthetic-subject-001',
    }));

    const adapter: IdentityAdapter = {
      authenticate,
    };

    const screen = await render(
      <SessionDemo
        coordinator={coordinator}
        clock={clock}
        appStateSource={source}
        identityAdapter={adapter}
        storageAdapter={storage}
      />
    );

    expect(
      screen.getByText('Synthetic preference: loading')
    ).toBeTruthy();

    await fireEvent.press(screen.getByText('Simulate login'));

    expect(authenticate).not.toHaveBeenCalled();

    expect(
      screen.getByText('Session status: SIGNED_OUT')
    ).toBeTruthy();

    expect(
      screen.queryByText('Protected synthetic preview')
    ).toBeNull();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(
        STORAGE_RESTORE_TIMEOUT_MS
      );
    });

    expect(
      screen.getByText('Synthetic preference: unavailable')
    ).toBeTruthy();

    await fireEvent.press(screen.getByText('Simulate login'));

    expect(authenticate).toHaveBeenCalledTimes(1);

    expect(
      screen.getByText('Session status: ACTIVE')
    ).toBeTruthy();

    expect(
      screen.getByText('Protected synthetic preview')
    ).toBeTruthy();

    await screen.unmount();
  });

  it('CTRL-008: saves and restores a preference without restoring authentication', async () => {
    const clock = { now: () => START_TIME };
    const storage = createInMemoryStorageAdapter();
    const source = createMockAppState('active');

    const firstCoordinator = createSessionCoordinator(clock);

    const firstScreen = await render(
      <SessionDemo
        coordinator={firstCoordinator}
        clock={clock}
        appStateSource={source}
        storageAdapter={storage}
      />
    );

    await waitFor(() => {
      expect(
        firstScreen.getByText('Synthetic preference: unavailable')
      ).toBeTruthy();
    });

    await fireEvent.press(
      firstScreen.getByText('Save sessions preference')
    );

    await waitFor(() => {
      expect(
        firstScreen.getByText('Synthetic preference: sessions')
      ).toBeTruthy();
    });

    expect(
      await storage.read(SYNTHETIC_PREFERENCE_KEY)
    ).not.toBeNull();

    await firstScreen.unmount();

    const secondCoordinator = createSessionCoordinator(clock);

    const secondScreen = await render(
      <SessionDemo
        coordinator={secondCoordinator}
        clock={clock}
        appStateSource={source}
        storageAdapter={storage}
      />
    );

    await waitFor(() => {
      expect(
        secondScreen.getByText('Synthetic preference: sessions')
      ).toBeTruthy();
    });

    expect(
      secondScreen.getByText('Session status: SIGNED_OUT')
    ).toBeTruthy();

    expect(secondCoordinator.canAccess()).toBe(false);

    expect(
      secondScreen.queryByText('Protected synthetic preview')
    ).toBeNull();

    await secondScreen.unmount();
  });

  it('CTRL-008: removes a previously saved preference', async () => {
    const clock = { now: () => START_TIME };
    const coordinator = createSessionCoordinator(clock);
    const storage = createInMemoryStorageAdapter();

    const screen = await render(
      <SessionDemo
        coordinator={coordinator}
        clock={clock}
        appStateSource={createMockAppState('active')}
        storageAdapter={storage}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText('Synthetic preference: unavailable')
      ).toBeTruthy();
    });

    await fireEvent.press(
      screen.getByText('Save storage preference')
    );

    await waitFor(() => {
      expect(
        screen.getByText('Synthetic preference: storage')
      ).toBeTruthy();
    });

    await fireEvent.press(screen.getByText('Clear preference'));

    await waitFor(() => {
      expect(
        screen.getByText('Synthetic preference removed.')
      ).toBeTruthy();
    });

    expect(
      await storage.read(SYNTHETIC_PREFERENCE_KEY)
    ).toBeNull();

    expect(coordinator.canAccess()).toBe(false);

    await screen.unmount();
  });

  it('CTRL-008: reports preference write failures without granting access', async () => {
    const clock = { now: () => START_TIME };
    const coordinator = createSessionCoordinator(clock);

    const storage = createInMemoryStorageAdapter({
      failingOperations: ['write'],
    });

    const screen = await render(
      <SessionDemo
        coordinator={coordinator}
        clock={clock}
        appStateSource={createMockAppState('active')}
        storageAdapter={storage}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText('Synthetic preference: unavailable')
      ).toBeTruthy();
    });

    await fireEvent.press(
      screen.getByText('Save sessions preference')
    );

    await waitFor(() => {
      expect(
        screen.getByText('Could not save synthetic preference.')
      ).toBeTruthy();
    });

    expect(
      screen.getByText('Session status: SIGNED_OUT')
    ).toBeTruthy();

    expect(coordinator.canAccess()).toBe(false);

    await screen.unmount();
  });
});
