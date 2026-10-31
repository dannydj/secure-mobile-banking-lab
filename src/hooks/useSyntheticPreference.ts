import { useEffect, useMemo, useRef, useState } from 'react'
import { createInMemoryStorageAdapter } from '../infrastructure/storage/in-memory-storage-adapter'
import type { Clock, SessionCoordinator } from '../use-cases/session/session-coordinator'
import type { PreferenceLoadResult } from '../use-cases/storage/load-synthetic-preference'
import { createSyntheticPreferenceRestorer } from '../use-cases/storage/restore-synthetic-preference'
import { createSyntheticPreferenceStore } from '../use-cases/storage/save-synthetic-preference'
import type { ProtectedStoragePort, SyntheticPreference } from '../use-cases/storage/storage.types'

type PreferenceCommand = Readonly<{ type: 'SAVE'; value: SyntheticPreference }> | Readonly<{ type: 'CLEAR' }>

type Options = Readonly<{
  coordinator: SessionCoordinator
  clock: Clock
  storageAdapter?: ProtectedStoragePort
}>

export function useSyntheticPreference({ coordinator, clock, storageAdapter }: Options) {
  const [restorationResult, setRestorationResult] = useState<PreferenceLoadResult | null>(null)
  const [isUpdatingPreference, setIsUpdatingPreference] = useState(false)
  const [preferenceFeedback, setPreferenceFeedback] = useState<string | null>(null)

  const preferenceUpdateInFlight = useRef(false)
  const preferenceOperationVersion = useRef(0)

  const defaultStorage = useMemo(() => createInMemoryStorageAdapter(), [])
  const storage = storageAdapter ?? defaultStorage

  const preferenceStore = useMemo(() => createSyntheticPreferenceStore(storage, clock), [storage, clock])
  const preferenceRestorer = useMemo(() => createSyntheticPreferenceRestorer(storage, clock, coordinator), [storage, clock, coordinator])

  useEffect(() => {
    return () => {
      preferenceOperationVersion.current += 1
    }
  }, [preferenceStore])

  useEffect(() => {
    let mounted = true

    void preferenceRestorer.restore().then(
      result => {
        if (mounted) setRestorationResult(result)
      },
      () => {
        if (mounted) setRestorationResult({ status: 'ERROR' })
      },
    )

    return () => {
      mounted = false
    }
  }, [preferenceRestorer])

  const updatePreference = async (command: PreferenceCommand): Promise<void> => {
    if (preferenceUpdateInFlight.current || restorationResult === null || !coordinator.getSnapshot().isForeground) {
      return
    }

    preferenceUpdateInFlight.current = true
    const operationVersion = preferenceOperationVersion.current

    setIsUpdatingPreference(true)
    setPreferenceFeedback(null)

    try {
      if (command.type === 'SAVE') {
        const result = await preferenceStore.save(command.value)

        if (operationVersion !== preferenceOperationVersion.current) return

        if (result.status === 'SAVED') {
          setRestorationResult({ status: 'FOUND', value: command.value })
          setPreferenceFeedback('Synthetic preference saved.')
        } else {
          setRestorationResult({ status: 'ERROR' })
          setPreferenceFeedback('Could not save synthetic preference.')
        }
      } else {
        const result = await preferenceStore.clear()

        if (operationVersion !== preferenceOperationVersion.current) return

        if (result.status === 'REMOVED') {
          setRestorationResult({ status: 'MISSING' })
          setPreferenceFeedback('Synthetic preference removed.')
        } else {
          setRestorationResult({ status: 'ERROR' })
          setPreferenceFeedback('Could not remove synthetic preference.')
        }
      }
    } finally {
      preferenceUpdateInFlight.current = false

      if (operationVersion === preferenceOperationVersion.current) {
        setIsUpdatingPreference(false)
      }
    }
  }

  return {
    restorationResult,
    isUpdatingPreference,
    preferenceFeedback,
    updatePreference,
  }
}
