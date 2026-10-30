import type { BiometricAuthenticationPort } from '../../use-cases/biometrics/biometric.types';
import { createUnavailableBiometricAdapter } from './unavailable-biometric-adapter';

export function createPlatformBiometricAdapter(): BiometricAuthenticationPort {
  return createUnavailableBiometricAdapter();
}
