'use server';

import { cookies } from 'next/headers';
import { locales, type Locale } from './routing';

/**
 * Sets the user's locale preference via cookie.
 * This allows users to override browser language detection.
 */
export async function setLocale(locale: Locale): Promise<void> {
  if (!locales.includes(locale)) {
    throw new Error(`Invalid locale: ${locale}`);
  }

  const cookieStore = await cookies();
  cookieStore.set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

/**
 * Gets the current locale from cookie or returns undefined.
 */
export async function getLocaleFromCookie(): Promise<Locale | undefined> {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value;
  return locale && locales.includes(locale as Locale) ? (locale as Locale) : undefined;
}
