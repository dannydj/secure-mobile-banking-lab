import { useMemo } from 'react'
import { SessionDemo } from '../../src/features/session/SessionDemo'
import { createPlatformStorageAdapter } from '../infrastructure/storage/platform-storage'
import { createSessionCoordinator, type Clock } from '../use-cases/session/session-coordinator'

const systemClock: Clock = {
  now: () => Date.now(),
}

export default function HomeScreen() {
  const coordinator = useMemo(() => createSessionCoordinator(systemClock), [])
  const storageAdapter = useMemo(() => createPlatformStorageAdapter(), [])

  return <SessionDemo coordinator={coordinator} clock={systemClock} storageAdapter={storageAdapter} />
}
