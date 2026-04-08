import { describe, expect, it } from 'vitest';
import { shouldBypassPublicAuthRedirect } from '@/middleware';

describe('shouldBypassPublicAuthRedirect', () => {
  it('allows explicitly requested resident login to stay public', () => {
    expect(
      shouldBypassPublicAuthRedirect(
        '/resident/login',
        new URLSearchParams('showResidentLogin=1')
      )
    ).toBe(true);
  });

  it('does not bypass redirects for other routes or missing flags', () => {
    expect(
      shouldBypassPublicAuthRedirect(
        '/resident/login',
        new URLSearchParams()
      )
    ).toBe(false);
    expect(
      shouldBypassPublicAuthRedirect(
        '/login',
        new URLSearchParams('showResidentLogin=1')
      )
    ).toBe(false);
  });
});
