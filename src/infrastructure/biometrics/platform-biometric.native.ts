import type { BiometricAuthenticationPort } from '../../use-cases/biometrics/biometric.types';
import { createExpoBiometricAdapter } from './expo-biometric-adapter';

export function createPlatformBiometricAdapter(): BiometricAuthenticationPort {
  return createExpoBiometricAdapter();
}
