import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setLocale, getLocaleFromCookie } from '../actions';
import { cookies } from 'next/headers';

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('i18n actions', () => {
  const mockCookieStore = {
    get: vi.fn(),
    set: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as never);
  });

  describe('setLocale', () => {
    it('should set locale cookie for valid locale', async () => {
      await setLocale('es');

      expect(mockCookieStore.set).toHaveBeenCalledWith('NEXT_LOCALE', 'es', {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        secure: false, // NODE_ENV is 'test'
      });
    });

    it('should throw error for invalid locale', async () => {
      await expect(setLocale('invalid' as never)).rejects.toThrow('Invalid locale: invalid');
    });

    it('should accept all supported locales', async () => {
      await setLocale('en');
      await setLocale('es');
      await setLocale('fr');

      expect(mockCookieStore.set).toHaveBeenCalledTimes(3);
    });
  });

  describe('getLocaleFromCookie', () => {
    it('should return locale from cookie', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'es' });

      const locale = await getLocaleFromCookie();

      expect(locale).toBe('es');
      expect(mockCookieStore.get).toHaveBeenCalledWith('NEXT_LOCALE');
    });

    it('should return undefined if cookie not set', async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const locale = await getLocaleFromCookie();

      expect(locale).toBeUndefined();
    });

    it('should return undefined for invalid locale in cookie', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'invalid' });

      const locale = await getLocaleFromCookie();

      expect(locale).toBeUndefined();
    });
  });
});
