import * as LocalAuthentication from 'expo-local-authentication';
import type { BiometricAuthenticationPort, BiometricAuthenticationResult } from '../../use-cases/biometrics/biometric.types';

type LocalAuthenticationClient = Pick<
  typeof LocalAuthentication,
  'hasHardwareAsync' | 'isEnrolledAsync' | 'authenticateAsync'
>;

export function createExpoBiometricAdapter(client: LocalAuthenticationClient = LocalAuthentication): BiometricAuthenticationPort {
  return {
    async authenticate(): Promise<BiometricAuthenticationResult> {
      try {
        if (!(await client.hasHardwareAsync()) || !(await client.isEnrolledAsync())) {
          return { status: 'UNAVAILABLE' };
        }

        const result = await client.authenticateAsync({
          promptMessage: 'Unlock demo session',
          disableDeviceFallback: true,
          biometricsSecurityLevel: 'strong',
        });

        if (result.success) {
          return { status: 'SUCCESS' };
        }

        switch (result.error) {
          case 'user_cancel':
          case 'app_cancel':
          case 'system_cancel':
          case 'user_fallback':
            return { status: 'CANCELLED' };

          case 'not_enrolled':
          case 'not_available':
          case 'passcode_not_set':
            return { status: 'UNAVAILABLE' };

          case 'authentication_failed':
          case 'lockout':
            return { status: 'FAILURE' };

          default:
            return { status: 'ERROR' };
        }
      } catch {
        return { status: 'ERROR' };
      }
    },
  };
}
