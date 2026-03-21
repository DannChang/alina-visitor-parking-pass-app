import { describe, it, expect } from 'vitest';
import { locales, defaultLocale, rtlLocales, localeNames, localeDisplayCodes, type Locale } from '../routing';

describe('i18n routing', () => {
  it('should have 8 supported locales', () => {
    expect(locales).toHaveLength(8);
    expect(locales).toContain('en');
    expect(locales).toContain('es');
    expect(locales).toContain('fr');
    expect(locales).toContain('zh-Hans');
    expect(locales).toContain('zh-Hant');
    expect(locales).toContain('fa');
    expect(locales).toContain('ko');
    expect(locales).toContain('vi');
  });

  it('should default to English', () => {
    expect(defaultLocale).toBe('en');
  });

  it('should mark Farsi as RTL', () => {
    expect(rtlLocales.has('fa')).toBe(true);
    expect(rtlLocales.has('en')).toBe(false);
  });

  it('should have native names for all locales', () => {
    for (const locale of locales) {
      expect(localeNames[locale]).toBeDefined();
      expect(localeNames[locale].length).toBeGreaterThan(0);
    }
  });

  it('should have display codes for all locales', () => {
    for (const locale of locales) {
      expect(localeDisplayCodes[locale]).toBeDefined();
    }
    expect(localeDisplayCodes['en']).toBe('EN');
    expect(localeDisplayCodes['zh-Hans']).toBe('ZH');
    expect(localeDisplayCodes['zh-Hant']).toBe('ZH');
  });
});
