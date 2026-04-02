import { type Locale } from './routing';

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function buildLocaleCookieValue(locale: Locale, isSecure: boolean): string {
  const attributes = [
    `NEXT_LOCALE=${encodeURIComponent(locale)}`,
    'Path=/',
    `Max-Age=${LOCALE_COOKIE_MAX_AGE}`,
    'SameSite=Lax',
  ];

  if (isSecure) {
    attributes.push('Secure');
  }

  return attributes.join('; ');
}

export function persistLocale(locale: Locale): void {
  const isSecure = window.location.protocol === 'https:';
  document.cookie = buildLocaleCookieValue(locale, isSecure);
}

export function persistLocaleAndReload(locale: Locale): void {
  persistLocale(locale);
  window.location.reload();
}
