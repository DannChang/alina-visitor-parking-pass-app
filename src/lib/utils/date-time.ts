/**
 * Date/Time Utilities
 * Mission-critical time calculations for parking passes
 */

import { addHours, addMinutes, differenceInHours, differenceInMinutes, format, isAfter, isBefore, parseISO } from 'date-fns';
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
export function calculateConsecutiveHours(passes: Array<{ startTime: Date; endTime: Date }>): number {
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
export function getCurrentTimeInTimezone(timezone: string = TIMEZONE_DEFAULT): Date {
  // For now, return current time
  // In production, implement proper timezone conversion
  return new Date();
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
 * Check if two date ranges overlap
 */
export function doDateRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return isBefore(start1, end2) && isAfter(end1, start2);
}
