export function toTelephoneHref(phone: string): string {
  const normalized = phone.trim().replace(/[^+\d]/g, '');
  return `tel:${normalized}`;
}

export function formatPassContact(primary: string | null, secondary?: string | null): string {
  if (primary && secondary) {
    return `${primary} • ${secondary}`;
  }

  return primary || secondary || 'Not provided';
}
