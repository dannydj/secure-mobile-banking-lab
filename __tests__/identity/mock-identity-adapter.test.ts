import {
  createMockIdentityAdapter,
  DEMO_ACCESS_CODE,
  DEMO_USERNAME,
} from '../../src/infrastructure/identity/mock-identity-adapter';

describe('Mock Identity Adapter', () => {
  const adapter = createMockIdentityAdapter();

  it('CTRL-001: accepts the configured synthetic identity', async () => {
    const result = await adapter.authenticate({
      username: DEMO_USERNAME,
      accessCode: DEMO_ACCESS_CODE,
    });

    expect(result).toEqual({
      accepted: true,
      subjectId: 'synthetic-subject-001',
    });
  });

  it('CTRL-001: rejects an incorrect access code', async () => {
    const result = await adapter.authenticate({
      username: DEMO_USERNAME,
      accessCode: 'incorrect-code',
    });

    expect(result).toEqual({
      accepted: false,
      reason: 'NOT_RECOGNIZED',
    });
  });

  it('CTRL-001: rejects an unknown identity', async () => {
    const result = await adapter.authenticate({
      username: 'unknown-user',
      accessCode: DEMO_ACCESS_CODE,
    });

    expect(result).toEqual({
      accepted: false,
      reason: 'NOT_RECOGNIZED',
    });
  });

  it('CTRL-001: rejects empty input', async () => {
    const result = await adapter.authenticate({
      username: '  ',
      accessCode: '',
    });

    expect(result).toEqual({
      accepted: false,
      reason: 'INVALID_INPUT',
    });
  });
});
