export const locales = ['en', 'es', 'fr', 'zh-Hans', 'zh-Hant', 'fa', 'ko', 'vi'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const rtlLocales = new Set<Locale>(['fa']);

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  'zh-Hans': '简体中文',
  'zh-Hant': '繁體中文',
  fa: 'فارسی',
  ko: '한국어',
  vi: 'Tiếng Việt',
};

export const localeDisplayCodes: Record<Locale, string> = {
  en: 'EN',
  es: 'ES',
  fr: 'FR',
  'zh-Hans': 'ZH',
  'zh-Hant': 'ZH',
  fa: 'FA',
  ko: 'KO',
  vi: 'VI',
};
