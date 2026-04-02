/**
 * Date/Time Utilities
 * Mission-critical time calculations for parking passes
 */

import {
  addHours,
  addMinutes,
  differenceInHours,
  differenceInMinutes,
  format,
  isAfter,
  isBefore,
  parseISO,
} from 'date-fns';
import { DATE_FORMATS, TIMEZONE_DEFAULT } from '../constants';

/**
 * Calculate end time based on start time and duration
 */
export function calculateEndTime(startTime: Date, durationHours: number): Date {
  return addHours(startTime, durationHours);
}

/**
 * Calculate remaining time in minutes
 */
export function calculateRemainingMinutes(endTime: Date, now: Date = new Date()): number {
  const remaining = differenceInMinutes(endTime, now);
  return Math.max(0, remaining);
}

/**
 * Calculate remaining time in hours
 */
export function calculateRemainingHours(endTime: Date, now: Date = new Date()): number {
  const remaining = differenceInHours(endTime, now);
  return Math.max(0, remaining);
}

/**
 * Check if a pass is expired
 */
export function isPassExpired(endTime: Date, now: Date = new Date()): boolean {
  return isAfter(now, endTime);
}

/**
 * Check if a pass is active
 */
export function isPassActive(startTime: Date, endTime: Date, now: Date = new Date()): boolean {
  return isAfter(now, startTime) && isBefore(now, endTime);
}

/**
 * Check if a pass is expiring soon
 */
export function isPassExpiringSoon(
  endTime: Date,
  warningMinutes: number = 30,
  now: Date = new Date()
): boolean {
  const remainingMinutes = calculateRemainingMinutes(endTime, now);
  return remainingMinutes > 0 && remainingMinutes <= warningMinutes;
}

/**
 * Format date for display
 */
export function formatDisplayDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, DATE_FORMATS.display);
}

/**
 * Format date (short version)
 */
export function formatShortDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, DATE_FORMATS.short);
}

/**
 * Format time only
 */
export function formatTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, DATE_FORMATS.time);
}

/**
 * Calculate total consecutive hours for multiple passes
 * Used to enforce maximum consecutive parking time
 */
export function calculateConsecutiveHours(
  passes: Array<{ startTime: Date; endTime: Date }>
): number {
  if (passes.length === 0) return 0;

  // Sort by start time
  const sorted = [...passes].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  let totalHours = 0;
  let currentEnd = sorted[0]?.endTime;

  if (!currentEnd) return 0;

  for (const pass of sorted) {
    // If this pass starts before or immediately after the current end, it's consecutive
    const gapMinutes = differenceInMinutes(pass.startTime, currentEnd);

    if (gapMinutes <= 15) {
      // Allow small gaps (grace period)
      totalHours += differenceInHours(pass.endTime, pass.startTime);
      currentEnd = pass.endTime;
    } else {
      // Gap too large, reset consecutive count
      totalHours = differenceInHours(pass.endTime, pass.startTime);
      currentEnd = pass.endTime;
    }
  }

  return totalHours;
}

/**
 * Get time until next event (expiration, warning, etc.)
 */
export function getTimeUntil(targetTime: Date, now: Date = new Date()): string {
  const minutes = calculateRemainingMinutes(targetTime, now);

  if (minutes <= 0) {
    return 'Expired';
  }

  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    if (remainingMinutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    return `${hours}h ${remainingMinutes}m`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (remainingHours === 0) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  }

  return `${days}d ${remainingHours}h`;
}

/**
 * Check if current time is within operating hours
 */
export function isWithinOperatingHours(
  startHour: number | null,
  endHour: number | null,
  now: Date = new Date()
): boolean {
  // If no operating hours set, always open
  if (startHour === null || endHour === null) {
    return true;
  }

  const currentHour = now.getHours();

  // Handle overnight ranges (e.g., 22:00 - 06:00)
  if (startHour > endHour) {
    return currentHour >= startHour || currentHour < endHour;
  }

  // Normal range (e.g., 08:00 - 18:00)
  return currentHour >= startHour && currentHour < endHour;
}

/**
 * Get cooldown end time
 */
export function getCooldownEndTime(lastEndTime: Date, cooldownHours: number): Date {
  return addHours(lastEndTime, cooldownHours);
}

/**
 * Check if cooldown period has passed
 */
export function isCooldownPeriodOver(
  lastEndTime: Date,
  cooldownHours: number,
  now: Date = new Date()
): boolean {
  const cooldownEnd = getCooldownEndTime(lastEndTime, cooldownHours);
  return isAfter(now, cooldownEnd);
}

/**
 * Calculate hours until cooldown ends
 */
export function getHoursUntilCooldownEnds(
  lastEndTime: Date,
  cooldownHours: number,
  now: Date = new Date()
): number {
  if (isCooldownPeriodOver(lastEndTime, cooldownHours, now)) {
    return 0;
  }

  const cooldownEnd = getCooldownEndTime(lastEndTime, cooldownHours);
  return Math.ceil(differenceInMinutes(cooldownEnd, now) / 60);
}

/**
 * Extend pass end time
 */
export function extendPassEndTime(currentEndTime: Date, extensionHours: number): Date {
  return addHours(currentEndTime, extensionHours);
}

/**
 * Check if extension is allowed (pass must still be active or recently expired)
 */
export function canExtendPass(
  endTime: Date,
  gracePeriodMinutes: number = 15,
  now: Date = new Date()
): boolean {
  const expirationWithGrace = addMinutes(endTime, gracePeriodMinutes);
  return isBefore(now, expirationWithGrace);
}

/**
 * Parse timezone-aware date string
 */
export function parseDate(dateString: string): Date {
  return parseISO(dateString);
}

/**
 * Get current date in specific timezone
 * Note: For production, consider using a timezone library like date-fns-tz
 */
export function getCurrentTimeInTimezone(_timezone: string = TIMEZONE_DEFAULT): Date {
  // For now, return current time
  // In production, implement proper timezone conversion
  return new Date();
}

function getTimezoneDateParts(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
    hour: getPart('hour'),
    minute: getPart('minute'),
    second: getPart('second'),
  };
}

function zonedDateTimeToUtc(
  timezone: string,
  year: number,
  month: number,
  day: number,
  hour: number = 0,
  minute: number = 0,
  second: number = 0
) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const zonedGuess = getTimezoneDateParts(utcGuess, timezone);
  const desiredUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const zonedGuessUtc = Date.UTC(
    zonedGuess.year,
    zonedGuess.month - 1,
    zonedGuess.day,
    zonedGuess.hour,
    zonedGuess.minute,
    zonedGuess.second
  );

  return new Date(utcGuess.getTime() + (desiredUtc - zonedGuessUtc));
}

export function getStartOfCurrentMonthInTimezone(
  timezone: string = TIMEZONE_DEFAULT,
  now: Date = new Date()
): Date {
  const current = getTimezoneDateParts(now, timezone);
  return zonedDateTimeToUtc(timezone, current.year, current.month, 1);
}

export function getStartOfCurrentDayInTimezone(
  timezone: string = TIMEZONE_DEFAULT,
  now: Date = new Date()
): Date {
  const current = getTimezoneDateParts(now, timezone);
  return zonedDateTimeToUtc(timezone, current.year, current.month, current.day);
}

export function getStartOfCurrentWeekInTimezone(
  timezone: string = TIMEZONE_DEFAULT,
  now: Date = new Date()
): Date {
  const current = getTimezoneDateParts(now, timezone);
  const currentDate = new Date(Date.UTC(current.year, current.month - 1, current.day));
  const dayOfWeek = currentDate.getUTCDay();
  const diffToMonday = (dayOfWeek + 6) % 7;

  currentDate.setUTCDate(currentDate.getUTCDate() - diffToMonday);

  return zonedDateTimeToUtc(
    timezone,
    currentDate.getUTCFullYear(),
    currentDate.getUTCMonth() + 1,
    currentDate.getUTCDate()
  );
}

export function getTimeBankWindowStart(
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY',
  timezone: string = TIMEZONE_DEFAULT,
  now: Date = new Date()
): Date {
  switch (period) {
    case 'DAILY':
      return getStartOfCurrentDayInTimezone(timezone, now);
    case 'WEEKLY':
      return getStartOfCurrentWeekInTimezone(timezone, now);
    case 'MONTHLY':
    default:
      return getStartOfCurrentMonthInTimezone(timezone, now);
  }
}

/**
 * Format duration in hours to human-readable string
 */
export function formatDuration(hours: number): string {
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (remainingHours === 0) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  }

  return `${days} day${days !== 1 ? 's' : ''} ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
}

/**
 * Get timestamp for database
 */
export function getTimestamp(): Date {
  return new Date();
}

/**
 * Calculate the number of consecutive calendar days a vehicle has had passes.
 * Used to enforce maxConsecutiveDays rule.
 */
export function calculateConsecutiveDays(
  passes: Array<{ startTime: Date }>,
  now: Date = new Date()
): number {
  if (passes.length === 0) return 0;

  // Get unique calendar dates (in local timezone)
  const dateSet = new Set<string>();
  for (const pass of passes) {
    dateSet.add(pass.startTime.toISOString().slice(0, 10));
  }
  // Add today
  dateSet.add(now.toISOString().slice(0, 10));

  // Sort dates descending
  const dates = [...dateSet].sort().reverse();

  // Count consecutive days from today backwards
  let consecutiveDays = 0;
  const today = now.toISOString().slice(0, 10);

  for (let i = 0; i < dates.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().slice(0, 10);

    if (dates[i] === expectedStr) {
      consecutiveDays++;
    } else {
      break;
    }
  }

  return consecutiveDays;
}

/**
 * Check if two date ranges overlap
 */
export function doDateRangesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
  return isBefore(start1, end2) && isAfter(end1, start2);
}
