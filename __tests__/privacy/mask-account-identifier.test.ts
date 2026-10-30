import { maskAccountIdentifier } from '../../src/domain/privacy/mask-account-identifier';

describe('CTRL-007: account identifier masking', () => {
  it('reveals only the last four digits', () => {
    expect(maskAccountIdentifier('000123456789')).toBe('••••••••6789');
  });

  it('fully masks short identifiers', () => {
    expect(maskAccountIdentifier('1234')).toBe('••••');
    expect(maskAccountIdentifier('123')).toBe('•••');
  });

  it('removes formatting before masking', () => {
    expect(maskAccountIdentifier('12-3456-7890')).toBe('••••••7890');
  });

  it('handles empty identifiers', () => {
    expect(maskAccountIdentifier('')).toBe('');
  });
});
