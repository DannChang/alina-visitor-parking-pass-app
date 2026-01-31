/**
 * License Plate Utilities
 * Production-grade license plate normalization and validation
 */

import { LICENSE_PLATE_CONFIG, VALIDATION_MESSAGES } from '../constants';

/**
 * Normalize license plate for database storage and comparison
 * Removes spaces, dashes, and converts to uppercase
 */
export function normalizeLicensePlate(plate: string): string {
  return plate
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ''); // Remove all non-alphanumeric characters
}

/**
 * Format license plate for display
 * Adds spacing for readability while maintaining original format intent
 */
export function formatLicensePlate(plate: string): string {
  const normalized = normalizeLicensePlate(plate);

  if (normalized.length <= 3) {
    return normalized;
  }

  // Common formats:
  // ABC123 -> ABC 123
  // ABC1234 -> ABC 1234
  // ABCD123 -> ABCD 123
  const match = normalized.match(/^([A-Z]{2,4})([0-9]{2,6})$/);
  if (match) {
    return `${match[1]} ${match[2]}`;
  }

  // If no clear pattern, add space in middle
  const midpoint = Math.floor(normalized.length / 2);
  return `${normalized.slice(0, midpoint)} ${normalized.slice(midpoint)}`;
}

/**
 * Validate license plate format
 */
export function validateLicensePlate(plate: string): {
  isValid: boolean;
  error?: string;
} {
  if (!plate || plate.trim().length === 0) {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.licensePlate.required,
    };
  }

  const normalized = normalizeLicensePlate(plate);

  if (normalized.length < LICENSE_PLATE_CONFIG.minLength) {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.licensePlate.minLength,
    };
  }

  if (normalized.length > LICENSE_PLATE_CONFIG.maxLength) {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.licensePlate.maxLength,
    };
  }

  if (!LICENSE_PLATE_CONFIG.validPattern.test(normalized)) {
    return {
      isValid: false,
      error: VALIDATION_MESSAGES.licensePlate.invalid,
    };
  }

  return { isValid: true };
}

/**
 * Sanitize license plate input (for form inputs)
 * Removes invalid characters while typing
 */
export function sanitizeLicensePlateInput(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, '') // Allow alphanumeric, spaces, and dashes
    .slice(0, LICENSE_PLATE_CONFIG.maxLength + 2); // Account for spacing
}

/**
 * Compare two license plates for equality
 */
export function areLicensePlatesEqual(plate1: string, plate2: string): boolean {
  return normalizeLicensePlate(plate1) === normalizeLicensePlate(plate2);
}

/**
 * Generate a hash for license plate (for anonymization if needed)
 */
export async function hashLicensePlate(plate: string): Promise<string> {
  const normalized = normalizeLicensePlate(plate);
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Mask license plate for privacy (e.g., "ABC 123" -> "ABC ***")
 */
export function maskLicensePlate(plate: string, revealChars: number = 3): string {
  const formatted = formatLicensePlate(plate);
  const normalized = normalizeLicensePlate(plate);

  if (normalized.length <= revealChars) {
    return formatted;
  }

  const revealed = normalized.slice(0, revealChars);
  const masked = '*'.repeat(normalized.length - revealChars);

  return formatLicensePlate(revealed + masked);
}

/**
 * Extract state/province code from license plate if present
 * This is a simple heuristic and may need customization
 */
export function extractStateCode(plate: string): string | null {
  const normalized = normalizeLicensePlate(plate);

  // Look for common state abbreviation patterns (2 letters at start or end)
  const statePattern = /^([A-Z]{2})[0-9]|[0-9]([A-Z]{2})$/;
  const match = normalized.match(statePattern);

  if (match) {
    return match[1] ?? match[2] ?? null;
  }

  return null;
}
