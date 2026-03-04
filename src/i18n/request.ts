import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { locales, defaultLocale, type Locale } from './routing';

function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;

  // Parse Accept-Language header (e.g., "en-US,en;q=0.9,es;q=0.8")
  const preferredLocales = acceptLanguage
    .split(',')
    .map((lang) => {
      const [locale, qStr] = lang.trim().split(';');
      const q = qStr ? parseFloat(qStr.split('=')[1] || '1') : 1;
      return { locale: locale?.split('-')[0] || '', q };
    })
    .sort((a, b) => b.q - a.q);

  // Find first supported locale
  for (const { locale } of preferredLocales) {
    if (locales.includes(locale as Locale)) {
      return locale as Locale;
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
      messages: (await import(`../messages/${cookieLocale}.json`)).default,
    };
  }

  // 2. Negotiate from Accept-Language header
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language');
  const locale = negotiateLocale(acceptLanguage);

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
