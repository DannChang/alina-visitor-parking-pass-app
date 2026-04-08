import { z } from 'zod';
import { LICENSE_PLATE_CONFIG, VALIDATION_MESSAGES } from './constants';

export const RESIDENT_INTEGER_FIELD_MAX_LENGTH = 3;
export const RESIDENT_INTEGER_FIELD_PATTERN = new RegExp(
  `^\\d{1,${RESIDENT_INTEGER_FIELD_MAX_LENGTH}}$`
);

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;
export const PASSWORD_REQUIREMENTS_TEXT =
  'Use 8-64 characters. Long passphrases are encouraged.';

function getPasswordCharacterCount(value: string): number {
  return Array.from(value.normalize('NFC')).length;
}

export function sanitizeIntegerFieldInput(input: string): string {
  return input.replace(/\D/g, '').slice(0, RESIDENT_INTEGER_FIELD_MAX_LENGTH);
}

export function sanitizeStrictLicensePlateInput(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, LICENSE_PLATE_CONFIG.maxLength);
}

export function getStrataLotValidationError(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return 'Strata lot number is required.';
  }

  if (!RESIDENT_INTEGER_FIELD_PATTERN.test(trimmed)) {
    return `Strata lot number must be 1 to ${RESIDENT_INTEGER_FIELD_MAX_LENGTH} digits.`;
  }

  return null;
}

export function getAssignedStallValidationError(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return 'Assigned stall number is required.';
  }

  if (!RESIDENT_INTEGER_FIELD_PATTERN.test(trimmed)) {
    return `Assigned stall number must be 1 to ${RESIDENT_INTEGER_FIELD_MAX_LENGTH} digits.`;
  }

  return null;
}

export function getPasswordValidationError(value: string): string | null {
  if (!value.trim()) {
    return 'Password is required.';
  }

  const passwordLength = getPasswordCharacterCount(value);

  if (passwordLength < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`;
  }

  if (passwordLength > PASSWORD_MAX_LENGTH) {
    return `Password must not exceed ${PASSWORD_MAX_LENGTH} characters.`;
  }

  return null;
}

export const strictLicensePlateSchema = z
  .string()
  .trim()
  .min(LICENSE_PLATE_CONFIG.minLength, VALIDATION_MESSAGES.licensePlate.minLength)
  .max(LICENSE_PLATE_CONFIG.maxLength, VALIDATION_MESSAGES.licensePlate.maxLength)
  .regex(/^[A-Za-z0-9]+$/, VALIDATION_MESSAGES.licensePlate.invalid);

export const residentStrataLotSchema = z
  .string()
  .trim()
  .min(1, 'Strata lot number is required')
  .regex(
    RESIDENT_INTEGER_FIELD_PATTERN,
    `Strata lot number must be 1 to ${RESIDENT_INTEGER_FIELD_MAX_LENGTH} digits`
  );

export const assignedStallNumberSchema = z
  .string()
  .trim()
  .min(1, 'Assigned stall number is required')
  .regex(
    RESIDENT_INTEGER_FIELD_PATTERN,
    `Assigned stall number must be 1 to ${RESIDENT_INTEGER_FIELD_MAX_LENGTH} digits`
  );

export const strongPasswordSchema = z
  .string()
  .superRefine((value, ctx) => {
    const validationError = getPasswordValidationError(value);

    if (validationError) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: validationError,
      });
    }
  });
