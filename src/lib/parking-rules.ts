import type { TimeBankPeriod } from '@prisma/client';

export const DEFAULT_PARKING_RULES = {
  maxVehiclesPerUnit: 3,
  monthlyHourBank: 72,
  timeBankPeriod: 'MONTHLY' as TimeBankPeriod,
  maxConsecutiveHours: 24,
  cooldownHours: 2,
  maxExtensions: 1,
  extensionMaxHours: 4,
  requireUnitConfirmation: false,
  maxConsecutiveDays: 3,
  consecutiveDayCooldownHours: 24,
  autoExtensionEnabled: true,
  autoExtensionThresholdHours: 6,
  autoExtensionDurationHours: 25,
  inOutPrivileges: true,
  operatingStartHour: null,
  operatingEndHour: null,
  allowedDurations: [2, 4, 8, 12, 24],
  gracePeriodMinutes: 15,
  allowEmergencyOverride: true,
} as const;

export function createDefaultParkingRule(buildingId: string) {
  return {
    id: 'default',
    buildingId,
    ...DEFAULT_PARKING_RULES,
    allowedDurations: [...DEFAULT_PARKING_RULES.allowedDurations],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export function formatTimeBankPeriod(period: TimeBankPeriod): string {
  switch (period) {
    case 'DAILY':
      return 'daily';
    case 'WEEKLY':
      return 'weekly';
    case 'MONTHLY':
    default:
      return 'monthly';
  }
}

export function formatTimeBankResetDescription(period: TimeBankPeriod): string {
  switch (period) {
    case 'DAILY':
      return 'This bank resets at the start of each day.';
    case 'WEEKLY':
      return 'This bank resets every Monday.';
    case 'MONTHLY':
    default:
      return 'This bank resets on the first of each month.';
  }
}

export function formatTimeBankWindowLabel(period: TimeBankPeriod): string {
  switch (period) {
    case 'DAILY':
      return 'day';
    case 'WEEKLY':
      return 'week';
    case 'MONTHLY':
    default:
      return 'month';
  }
}
