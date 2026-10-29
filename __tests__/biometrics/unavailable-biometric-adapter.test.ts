import { createUnavailableBiometricAdapter } from '../../src/infrastructure/biometrics/unavailable-biometric-adapter';

describe('Unavailable Biometric Adapter', () => {
  it('CTRL-012: never reports successful authentication', async () => {
    const adapter = createUnavailableBiometricAdapter();

    await expect(adapter.authenticate()).resolves.toEqual({
      status: 'UNAVAILABLE',
    });
  });
});
