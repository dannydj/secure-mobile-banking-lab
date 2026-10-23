import type { SessionEvent } from '../../domain/session/session-events';

import {
  canAccessSession,
  initialSessionMachineState,
  transitionSession,
  type SessionMachineState,
  type SessionTransitionResult,
} from '../../domain/session/session-machine';

export type Clock = Readonly<{
  now: () => number;
}>;

export type SessionCoordinator = Readonly<{
  getSnapshot: () => SessionMachineState;
  canAccess: () => boolean;
  dispatch: (event: SessionEvent) => SessionTransitionResult;
  subscribe: (listener: () => void) => () => void;
}>;

export function createSessionCoordinator(
  clock: Clock
): SessionCoordinator {
  let state: SessionMachineState = initialSessionMachineState;

  const listeners = new Set<() => void>();

  const getSnapshot = (): SessionMachineState => state;

  const canAccess = (): boolean =>
    canAccessSession(state, clock.now());

  const dispatch = (
    event: SessionEvent
  ): SessionTransitionResult => {
    const result = transitionSession(state, event, clock.now());

    if (result.next !== state) {
      state = result.next;

      listeners.forEach((listener) => listener());
    }

    return result;
  };

  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  };

  return {
    getSnapshot,
    canAccess,
    dispatch,
    subscribe,
  };
}
