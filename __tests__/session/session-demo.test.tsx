import { act, fireEvent, render } from '@testing-library/react-native';

import type { AppStateStatus } from 'react-native';

import { SessionDemo } from '../../src/app/index';
import { createSessionCoordinator } from '../../src/application/session/session-coordinator';
import { INACTIVITY_TIMEOUT_MS } from '../../src/domain/session/session-policy';

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
});
