import { describe, expect, it } from 'vitest';
import { buildLocaleCookieValue } from '../client';

describe('i18n client helpers', () => {
  it('should build a locale cookie value for non-secure contexts', () => {
    expect(buildLocaleCookieValue('es', false)).toBe(
      'NEXT_LOCALE=es; Path=/; Max-Age=31536000; SameSite=Lax'
    );
  });

  it('should include Secure in secure contexts', () => {
    expect(buildLocaleCookieValue('fr', true)).toBe(
      'NEXT_LOCALE=fr; Path=/; Max-Age=31536000; SameSite=Lax; Secure'
    );
  });

  it('should encode locales with hyphens safely', () => {
    expect(buildLocaleCookieValue('zh-Hans', false)).toBe(
      'NEXT_LOCALE=zh-Hans; Path=/; Max-Age=31536000; SameSite=Lax'
    );
  });
});
