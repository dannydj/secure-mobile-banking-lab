import type { ProtectedStoragePort } from '../../use-cases/storage/storage.types';
import { createInMemoryStorageAdapter } from './in-memory-storage-adapter';

export function createPlatformStorageAdapter(): ProtectedStoragePort {
  return createInMemoryStorageAdapter();
}
