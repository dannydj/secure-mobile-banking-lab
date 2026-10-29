import type { LocalAuthenticationResult } from 'expo-local-authentication';
import { createExpoBiometricAdapter } from '../../src/infrastructure/biometrics/expo-biometric-adapter';

function createClient({ hardware = true, enrolled = true, result = { success: true } }: { hardware?: boolean; enrolled?: boolean; result?: LocalAuthenticationResult; } = {}) {
  return {
    hasHardwareAsync: jest.fn(async () => hardware),
    isEnrolledAsync: jest.fn(async () => enrolled),
    authenticateAsync: jest.fn(async () => result),
  };
}

describe('Expo Biometric Adapter', () => {
  it('CTRL-012: accepts successful native authentication', async () => {
    const client = createClient();
    const adapter = createExpoBiometricAdapter(client);

    await expect(adapter.authenticate()).resolves.toEqual({
      status: 'SUCCESS',
    });

    expect(client.authenticateAsync).toHaveBeenCalledWith({
      promptMessage: 'Unlock demo session',
      disableDeviceFallback: true,
      biometricsSecurityLevel: 'strong',
    });
  });

  it('CTRL-012: denies authentication without biometric hardware', async () => {
    const client = createClient({ hardware: false });
    const adapter = createExpoBiometricAdapter(client);

    await expect(adapter.authenticate()).resolves.toEqual({
      status: 'UNAVAILABLE',
    });

    expect(client.authenticateAsync).not.toHaveBeenCalled();
  });

  it('CTRL-012: denies authentication without enrolled biometrics', async () => {
    const client = createClient({ enrolled: false });
    const adapter = createExpoBiometricAdapter(client);

    await expect(adapter.authenticate()).resolves.toEqual({
      status: 'UNAVAILABLE',
    });

    expect(client.authenticateAsync).not.toHaveBeenCalled();
  });

  it.each([
    ['user_cancel', 'CANCELLED'],
    ['app_cancel', 'CANCELLED'],
    ['system_cancel', 'CANCELLED'],
    ['user_fallback', 'CANCELLED'],
    ['authentication_failed', 'FAILURE'],
    ['lockout', 'FAILURE'],
    ['not_enrolled', 'UNAVAILABLE'],
    ['not_available', 'UNAVAILABLE'],
    ['passcode_not_set', 'UNAVAILABLE'],
  ] as const)(
    'CTRL-012: maps %s to %s',
    async (error, status) => {
      const client = createClient({
        result: { success: false, error },
      });

      const adapter = createExpoBiometricAdapter(client);

      await expect(adapter.authenticate()).resolves.toEqual({
        status,
      });
    }
  );

  it('CTRL-012: denies access when the native API throws', async () => {
    const client = createClient();

    client.authenticateAsync.mockRejectedValue(
      new Error('Native authentication failed')
    );

    const adapter = createExpoBiometricAdapter(client);

    await expect(adapter.authenticate()).resolves.toEqual({
      status: 'ERROR',
    });
  });
});
