import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { locales, defaultLocale, type Locale } from './routing';
import en from '../messages/en.json';
import es from '../messages/es.json';
import fr from '../messages/fr.json';
import vi from '../messages/vi.json';
import zhHans from '../messages/zh-Hans.json';
import zhHant from '../messages/zh-Hant.json';
import fa from '../messages/fa.json';
import ko from '../messages/ko.json';

const messagesByLocale: Record<Locale, Record<string, unknown>> = {
  en,
  es,
  fr,
  vi,
  'zh-Hans': zhHans,
  'zh-Hant': zhHant,
  fa,
  ko,
};


// Map browser locale variants to our supported locales
const localeMapping: Record<string, Locale> = {
  'zh-cn': 'zh-Hans',
  'zh-sg': 'zh-Hans',
  'zh-hans': 'zh-Hans',
  zh: 'zh-Hans',
  'zh-tw': 'zh-Hant',
  'zh-hk': 'zh-Hant',
  'zh-mo': 'zh-Hant',
  'zh-hant': 'zh-Hant',
};

export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;

  const preferredLocales = acceptLanguage
    .split(',')
    .map((lang) => {
      const [locale, qStr] = lang.trim().split(';');
      const q = qStr ? parseFloat(qStr.split('=')[1] || '1') : 1;
      return { locale: locale?.trim().toLowerCase() || '', q };
    })
    .sort((a, b) => b.q - a.q);

  for (const { locale } of preferredLocales) {
    // 1. Check explicit mapping (e.g., zh-CN → zh-Hans)
    const mapped = localeMapping[locale];
    if (mapped) return mapped;

    // 2. Check direct match (e.g., "fr" matches "fr", "ko" matches "ko")
    if (locales.includes(locale as Locale)) {
      return locale as Locale;
    }

    // 3. Check base language match (e.g., "fr-CA" → "fr", "ko-KR" → "ko")
    const base = locale.split('-')[0] || '';
    const baseMapping = localeMapping[base];
    if (baseMapping) return baseMapping;

    if (locales.includes(base as Locale)) {
      return base as Locale;
    }
  }

  return defaultLocale;
}

export default getRequestConfig(async () => {
  // 1. Check cookie (user preference)
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;

  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    return {
      locale: cookieLocale as Locale,
      messages: messagesByLocale[cookieLocale as Locale],
    };
  }

  // 2. Negotiate from Accept-Language header
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language');
  const locale = negotiateLocale(acceptLanguage);

  return {
    locale,
    messages: messagesByLocale[locale],
  };
});
