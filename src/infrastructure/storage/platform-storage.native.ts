import * as SecureStore from 'expo-secure-store';
import type { ProtectedStoragePort } from '../../use-cases/storage/storage.types';
import { createSecureStoreAdapter } from './secure-store-adapter';

export function createPlatformStorageAdapter(): ProtectedStoragePort {
  return createSecureStoreAdapter(SecureStore);
}
