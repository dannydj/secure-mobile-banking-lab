import type {
  IdentityAdapter,
  IdentityResult,
} from '../../application/identity/identity.types';

export const DEMO_USERNAME = 'demo-user';
export const DEMO_ACCESS_CODE = 'demo-only';

const DEMO_SUBJECT_ID = 'synthetic-subject-001';

export function createMockIdentityAdapter(): IdentityAdapter {
  return {
    async authenticate(input): Promise<IdentityResult> {
      const { username, accessCode } = input;

      if (
        typeof username !== 'string' ||
        typeof accessCode !== 'string' ||
        username.trim().length === 0 ||
        accessCode.trim().length === 0
      ) {
        return {
          accepted: false,
          reason: 'INVALID_INPUT',
        };
      }

      if (
        username !== DEMO_USERNAME ||
        accessCode !== DEMO_ACCESS_CODE
      ) {
        return {
          accepted: false,
          reason: 'NOT_RECOGNIZED',
        };
      }

      return {
        accepted: true,
        subjectId: DEMO_SUBJECT_ID,
      };
    },
  };
}
