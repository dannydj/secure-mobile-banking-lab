import type { BiometricAuthenticationPort } from '../../use-cases/biometrics/biometric.types';

export function createUnavailableBiometricAdapter(): BiometricAuthenticationPort {
  return {
    async authenticate() {
      return { status: 'UNAVAILABLE' };
    },
  };
}
