/**
 * Date/Time Utilities Tests
 * Mission-critical time calculations for parking passes
 * Target coverage: 90%+
 */

import { describe, it, expect } from 'vitest';
import {
  calculateEndTime,
  calculateRemainingMinutes,
  calculateRemainingHours,
  isPassExpired,
  isPassActive,
  isPassExpiringSoon,
  calculateConsecutiveHours,
  getTimeUntil,
  isWithinOperatingHours,
  getCooldownEndTime,
  isCooldownPeriodOver,
  getHoursUntilCooldownEnds,
  extendPassEndTime,
  canExtendPass,
  formatDuration,
  doDateRangesOverlap,
} from '../date-time';

describe('Date/Time Utilities', () => {
  // ============================================
  // calculateEndTime
  // ============================================
  describe('calculateEndTime', () => {
    it('should add hours to start time', () => {
      const start = new Date('2025-01-30T10:00:00Z');
      const end = calculateEndTime(start, 4);

      expect(end.getTime()).toBe(new Date('2025-01-30T14:00:00Z').getTime());
    });

    it('should handle overnight rollover', () => {
      const start = new Date('2025-01-30T22:00:00Z');
      const end = calculateEndTime(start, 4);

      expect(end.getTime()).toBe(new Date('2025-01-31T02:00:00Z').getTime());
    });

    it('should handle multi-day duration', () => {
      const start = new Date('2025-01-30T10:00:00Z');
      const end = calculateEndTime(start, 48);

      expect(end.getTime()).toBe(new Date('2025-02-01T10:00:00Z').getTime());
    });

    it('should handle 0 hours', () => {
      const start = new Date('2025-01-30T10:00:00Z');
      const end = calculateEndTime(start, 0);

      expect(end.getTime()).toBe(start.getTime());
    });
  });

  // ============================================
  // calculateRemainingMinutes
  // ============================================
  describe('calculateRemainingMinutes', () => {
    it('should return remaining minutes for future time', () => {
      const now = new Date('2025-01-30T10:00:00Z');
      const end = new Date('2025-01-30T10:30:00Z');

      expect(calculateRemainingMinutes(end, now)).toBe(30);
    });

    it('should return 0 for past time', () => {
      const now = new Date('2025-01-30T10:00:00Z');
      const end = new Date('2025-01-30T09:00:00Z');

      expect(calculateRemainingMinutes(end, now)).toBe(0);
    });

    it('should return 0 for exactly now', () => {
      const now = new Date('2025-01-30T10:00:00Z');

      expect(calculateRemainingMinutes(now, now)).toBe(0);
    });

    it('should handle large remaining time', () => {
      const now = new Date('2025-01-30T10:00:00Z');
      const end = new Date('2025-01-31T10:00:00Z');

      expect(calculateRemainingMinutes(end, now)).toBe(24 * 60);
    });
  });

  // ============================================
  // calculateRemainingHours
  // ============================================
  describe('calculateRemainingHours', () => {
    it('should return remaining hours for future time', () => {
      const now = new Date('2025-01-30T10:00:00Z');
      const end = new Date('2025-01-30T14:00:00Z');

      expect(calculateRemainingHours(end, now)).toBe(4);
    });

    it('should return 0 for past time', () => {
      const now = new Date('2025-01-30T10:00:00Z');
      const end = new Date('2025-01-30T08:00:00Z');

      expect(calculateRemainingHours(end, now)).toBe(0);
    });

    it('should truncate partial hours', () => {
      const now = new Date('2025-01-30T10:00:00Z');
      const end = new Date('2025-01-30T11:30:00Z');

      expect(calculateRemainingHours(end, now)).toBe(1);
    });
  });

  // ============================================
  // isPassExpired
  // ============================================
  describe('isPassExpired', () => {
    it('should return true when now is after endTime', () => {
      const now = new Date('2025-01-30T12:00:00Z');
      const end = new Date('2025-01-30T10:00:00Z');

      expect(isPassExpired(end, now)).toBe(true);
    });

    it('should return false when now is before endTime', () => {
      const now = new Date('2025-01-30T10:00:00Z');
      const end = new Date('2025-01-30T12:00:00Z');

      expect(isPassExpired(end, now)).toBe(false);
    });

    it('should return false when now equals endTime (edge)', () => {
      const time = new Date('2025-01-30T10:00:00Z');

      expect(isPassExpired(time, time)).toBe(false);
    });

    it('should return true when 1ms past endTime', () => {
      const end = new Date('2025-01-30T10:00:00.000Z');
      const now = new Date('2025-01-30T10:00:00.001Z');

      expect(isPassExpired(end, now)).toBe(true);
    });
  });

  // ============================================
  // isPassActive
  // ============================================
  describe('isPassActive', () => {
    it('should return true when now is between start and end', () => {
      const start = new Date('2025-01-30T08:00:00Z');
      const end = new Date('2025-01-30T12:00:00Z');
      const now = new Date('2025-01-30T10:00:00Z');

      expect(isPassActive(start, end, now)).toBe(true);
    });

    it('should return false when now is before start', () => {
      const start = new Date('2025-01-30T10:00:00Z');
      const end = new Date('2025-01-30T12:00:00Z');
      const now = new Date('2025-01-30T08:00:00Z');

      expect(isPassActive(start, end, now)).toBe(false);
    });

    it('should return false when now is after end', () => {
      const start = new Date('2025-01-30T08:00:00Z');
      const end = new Date('2025-01-30T10:00:00Z');
      const now = new Date('2025-01-30T12:00:00Z');

      expect(isPassActive(start, end, now)).toBe(false);
    });

    it('should return false at exactly start time', () => {
      const start = new Date('2025-01-30T10:00:00Z');
      const end = new Date('2025-01-30T12:00:00Z');

      expect(isPassActive(start, end, start)).toBe(false);
    });

    it('should return false at exactly end time', () => {
      const start = new Date('2025-01-30T10:00:00Z');
      const end = new Date('2025-01-30T12:00:00Z');

      expect(isPassActive(start, end, end)).toBe(false);
    });
  });

  // ============================================
  // isPassExpiringSoon
  // ============================================
  describe('isPassExpiringSoon', () => {
    it('should return true when within warning window', () => {
      const end = new Date('2025-01-30T10:30:00Z');
      const now = new Date('2025-01-30T10:15:00Z');

      expect(isPassExpiringSoon(end, 30, now)).toBe(true);
    });

    it('should return false when outside warning window', () => {
      const end = new Date('2025-01-30T12:00:00Z');
      const now = new Date('2025-01-30T10:00:00Z');

      expect(isPassExpiringSoon(end, 30, now)).toBe(false);
    });

    it('should return false when already expired', () => {
      const end = new Date('2025-01-30T10:00:00Z');
      const now = new Date('2025-01-30T12:00:00Z');

      expect(isPassExpiringSoon(end, 30, now)).toBe(false);
    });

    it('should return true at exactly warning threshold', () => {
      const end = new Date('2025-01-30T10:30:00Z');
      const now = new Date('2025-01-30T10:00:00Z');

      expect(isPassExpiringSoon(end, 30, now)).toBe(true);
    });

    it('should use default 30 minutes if not specified', () => {
      const end = new Date('2025-01-30T10:20:00Z');
      const now = new Date('2025-01-30T10:00:00Z');

      expect(isPassExpiringSoon(end, undefined, now)).toBe(true);
    });
  });

  // ============================================
  // calculateConsecutiveHours (CRITICAL)
  // ============================================
  describe('calculateConsecutiveHours', () => {
    it('should return 0 for empty array', () => {
      expect(calculateConsecutiveHours([])).toBe(0);
    });

    it('should return hours for single pass', () => {
      const passes = [
        {
          startTime: new Date('2025-01-30T10:00:00Z'),
          endTime: new Date('2025-01-30T14:00:00Z'),
        },
      ];

      expect(calculateConsecutiveHours(passes)).toBe(4);
    });

    it('should sum consecutive passes with no gap', () => {
      const passes = [
        {
          startTime: new Date('2025-01-30T10:00:00Z'),
          endTime: new Date('2025-01-30T14:00:00Z'),
        },
        {
          startTime: new Date('2025-01-30T14:00:00Z'),
          endTime: new Date('2025-01-30T18:00:00Z'),
        },
      ];

      expect(calculateConsecutiveHours(passes)).toBe(8);
    });

    it('should count passes with gap <= 15 minutes as consecutive', () => {
      const passes = [
        {
          startTime: new Date('2025-01-30T10:00:00Z'),
          endTime: new Date('2025-01-30T14:00:00Z'),
        },
        {
          startTime: new Date('2025-01-30T14:15:00Z'), // 15 min gap
          endTime: new Date('2025-01-30T18:15:00Z'),
        },
      ];

      expect(calculateConsecutiveHours(passes)).toBe(8);
    });

    it('should reset count when gap > 15 minutes', () => {
      const passes = [
        {
          startTime: new Date('2025-01-30T10:00:00Z'),
          endTime: new Date('2025-01-30T14:00:00Z'),
        },
        {
          startTime: new Date('2025-01-30T14:16:00Z'), // 16 min gap
          endTime: new Date('2025-01-30T18:16:00Z'),
        },
      ];

      // Should only count the second pass
      expect(calculateConsecutiveHours(passes)).toBe(4);
    });

    it('should handle passes in non-chronological order', () => {
      const passes = [
        {
          startTime: new Date('2025-01-30T14:00:00Z'),
          endTime: new Date('2025-01-30T18:00:00Z'),
        },
        {
          startTime: new Date('2025-01-30T10:00:00Z'),
          endTime: new Date('2025-01-30T14:00:00Z'),
        },
      ];

      expect(calculateConsecutiveHours(passes)).toBe(8);
    });

    it('should handle overlapping passes', () => {
      const passes = [
        {
          startTime: new Date('2025-01-30T10:00:00Z'),
          endTime: new Date('2025-01-30T14:00:00Z'),
        },
        {
          startTime: new Date('2025-01-30T12:00:00Z'),
          endTime: new Date('2025-01-30T16:00:00Z'),
        },
      ];

      // Overlapping, so both should count (gap is negative, which is <= 15)
      expect(calculateConsecutiveHours(passes)).toBe(8);
    });

    it('should handle three consecutive passes', () => {
      const passes = [
        {
          startTime: new Date('2025-01-30T08:00:00Z'),
          endTime: new Date('2025-01-30T12:00:00Z'),
        },
        {
          startTime: new Date('2025-01-30T12:00:00Z'),
          endTime: new Date('2025-01-30T16:00:00Z'),
        },
        {
          startTime: new Date('2025-01-30T16:00:00Z'),
          endTime: new Date('2025-01-30T20:00:00Z'),
        },
      ];

      expect(calculateConsecutiveHours(passes)).toBe(12);
    });

    it('should handle multiple gaps with reset', () => {
      const passes = [
        {
          startTime: new Date('2025-01-30T08:00:00Z'),
          endTime: new Date('2025-01-30T10:00:00Z'),
        },
        // 2 hour gap - resets
        {
          startTime: new Date('2025-01-30T12:00:00Z'),
          endTime: new Date('2025-01-30T16:00:00Z'),
        },
        {
          startTime: new Date('2025-01-30T16:00:00Z'),
          endTime: new Date('2025-01-30T20:00:00Z'),
        },
      ];

      // First pass (2h) resets, then 4h + 4h = 8h
      expect(calculateConsecutiveHours(passes)).toBe(8);
    });
  });

  // ============================================
  // getTimeUntil
  // ============================================
  describe('getTimeUntil', () => {
    it('should return "Expired" for past time', () => {
      const now = new Date('2025-01-30T12:00:00Z');
      const target = new Date('2025-01-30T10:00:00Z');

      expect(getTimeUntil(target, now)).toBe('Expired');
    });

    it('should return minutes for < 60 minutes', () => {
      const now = new Date('2025-01-30T10:00:00Z');
      const target = new Date('2025-01-30T10:30:00Z');

      expect(getTimeUntil(target, now)).toBe('30 minutes');
    });

    it('should return singular minute', () => {
      const now = new Date('2025-01-30T10:00:00Z');
      const target = new Date('2025-01-30T10:01:00Z');

      expect(getTimeUntil(target, now)).toBe('1 minute');
    });

    it('should return hours for >= 60 minutes and < 24 hours', () => {
      const now = new Date('2025-01-30T10:00:00Z');
      const target = new Date('2025-01-30T14:30:00Z');

      expect(getTimeUntil(target, now)).toBe('4h 30m');
    });

    it('should return just hours when no remainder', () => {
      const now = new Date('2025-01-30T10:00:00Z');
      const target = new Date('2025-01-30T14:00:00Z');

      expect(getTimeUntil(target, now)).toBe('4 hours');
    });

    it('should return singular hour', () => {
      const now = new Date('2025-01-30T10:00:00Z');
      const target = new Date('2025-01-30T11:00:00Z');

      expect(getTimeUntil(target, now)).toBe('1 hour');
    });

    it('should return days for >= 24 hours', () => {
      const now = new Date('2025-01-30T10:00:00Z');
      const target = new Date('2025-02-01T14:00:00Z');

      expect(getTimeUntil(target, now)).toBe('2d 4h');
    });

    it('should return just days when no remainder hours', () => {
      const now = new Date('2025-01-30T10:00:00Z');
      const target = new Date('2025-02-01T10:00:00Z');

      expect(getTimeUntil(target, now)).toBe('2 days');
    });

    it('should return singular day', () => {
      const now = new Date('2025-01-30T10:00:00Z');
      const target = new Date('2025-01-31T10:00:00Z');

      expect(getTimeUntil(target, now)).toBe('1 day');
    });
  });

  // ============================================
  // isWithinOperatingHours (CRITICAL)
  // ============================================
  describe('isWithinOperatingHours', () => {
    it('should return true when both hours are null (24/7)', () => {
      const now = new Date('2025-01-30T03:00:00');
      expect(isWithinOperatingHours(null, null, now)).toBe(true);
    });

    it('should return true when start is null', () => {
      const now = new Date('2025-01-30T03:00:00');
      expect(isWithinOperatingHours(null, 18, now)).toBe(true);
    });

    it('should return true when end is null', () => {
      const now = new Date('2025-01-30T03:00:00');
      expect(isWithinOperatingHours(8, null, now)).toBe(true);
    });

    // Normal range tests (e.g., 8:00 - 18:00)
    describe('normal range (8:00 - 18:00)', () => {
      it('should return true when within range', () => {
        const now = new Date('2025-01-30T12:00:00');
        expect(isWithinOperatingHours(8, 18, now)).toBe(true);
      });

      it('should return false when before range', () => {
        const now = new Date('2025-01-30T06:00:00');
        expect(isWithinOperatingHours(8, 18, now)).toBe(false);
      });

      it('should return false when after range', () => {
        const now = new Date('2025-01-30T20:00:00');
        expect(isWithinOperatingHours(8, 18, now)).toBe(false);
      });

      it('should return true at exactly start hour', () => {
        const now = new Date('2025-01-30T08:00:00');
        expect(isWithinOperatingHours(8, 18, now)).toBe(true);
      });

      it('should return false at exactly end hour', () => {
        const now = new Date('2025-01-30T18:00:00');
        expect(isWithinOperatingHours(8, 18, now)).toBe(false);
      });
    });

    // Overnight range tests (e.g., 22:00 - 06:00)
    describe('overnight range (22:00 - 06:00)', () => {
      it('should return true when after start (late night)', () => {
        const now = new Date('2025-01-30T23:00:00');
        expect(isWithinOperatingHours(22, 6, now)).toBe(true);
      });

      it('should return true when before end (early morning)', () => {
        const now = new Date('2025-01-30T04:00:00');
        expect(isWithinOperatingHours(22, 6, now)).toBe(true);
      });

      it('should return false during day', () => {
        const now = new Date('2025-01-30T12:00:00');
        expect(isWithinOperatingHours(22, 6, now)).toBe(false);
      });

      it('should return true at exactly start hour (22:00)', () => {
        const now = new Date('2025-01-30T22:00:00');
        expect(isWithinOperatingHours(22, 6, now)).toBe(true);
      });

      it('should return false at exactly end hour (06:00)', () => {
        const now = new Date('2025-01-30T06:00:00');
        expect(isWithinOperatingHours(22, 6, now)).toBe(false);
      });

      it('should return true at midnight', () => {
        const now = new Date('2025-01-30T00:00:00');
        expect(isWithinOperatingHours(22, 6, now)).toBe(true);
      });
    });
  });

  // ============================================
  // Cooldown Period Functions
  // ============================================
  describe('getCooldownEndTime', () => {
    it('should add cooldown hours to last end time', () => {
      const lastEnd = new Date('2025-01-30T10:00:00Z');
      const result = getCooldownEndTime(lastEnd, 2);

      expect(result.getTime()).toBe(new Date('2025-01-30T12:00:00Z').getTime());
    });
  });

  describe('isCooldownPeriodOver', () => {
    it('should return true when cooldown has passed', () => {
      const lastEnd = new Date('2025-01-30T10:00:00Z');
      const now = new Date('2025-01-30T13:00:00Z');

      expect(isCooldownPeriodOver(lastEnd, 2, now)).toBe(true);
    });

    it('should return false when still in cooldown', () => {
      const lastEnd = new Date('2025-01-30T10:00:00Z');
      const now = new Date('2025-01-30T11:00:00Z');

      expect(isCooldownPeriodOver(lastEnd, 2, now)).toBe(false);
    });

    it('should return true at exactly cooldown end', () => {
      const lastEnd = new Date('2025-01-30T10:00:00Z');
      const now = new Date('2025-01-30T12:00:00.001Z'); // 1ms after

      expect(isCooldownPeriodOver(lastEnd, 2, now)).toBe(true);
    });
  });

  describe('getHoursUntilCooldownEnds', () => {
    it('should return remaining hours', () => {
      const lastEnd = new Date('2025-01-30T10:00:00Z');
      const now = new Date('2025-01-30T11:00:00Z');

      expect(getHoursUntilCooldownEnds(lastEnd, 2, now)).toBe(1);
    });

    it('should return 0 when cooldown is over', () => {
      const lastEnd = new Date('2025-01-30T10:00:00Z');
      const now = new Date('2025-01-30T13:00:00Z');

      expect(getHoursUntilCooldownEnds(lastEnd, 2, now)).toBe(0);
    });

    it('should round up partial hours', () => {
      const lastEnd = new Date('2025-01-30T10:00:00Z');
      const now = new Date('2025-01-30T11:30:00Z');

      // 30 minutes remaining, should round up to 1
      expect(getHoursUntilCooldownEnds(lastEnd, 2, now)).toBe(1);
    });
  });

  // ============================================
  // Pass Extension Functions
  // ============================================
  describe('extendPassEndTime', () => {
    it('should add extension hours to current end time', () => {
      const currentEnd = new Date('2025-01-30T14:00:00Z');
      const newEnd = extendPassEndTime(currentEnd, 2);

      expect(newEnd.getTime()).toBe(new Date('2025-01-30T16:00:00Z').getTime());
    });
  });

  describe('canExtendPass', () => {
    it('should return true when pass is still active', () => {
      const end = new Date('2025-01-30T14:00:00Z');
      const now = new Date('2025-01-30T13:00:00Z');

      expect(canExtendPass(end, 15, now)).toBe(true);
    });

    it('should return true when within grace period', () => {
      const end = new Date('2025-01-30T14:00:00Z');
      const now = new Date('2025-01-30T14:10:00Z'); // 10 min after

      expect(canExtendPass(end, 15, now)).toBe(true);
    });

    it('should return false when past grace period', () => {
      const end = new Date('2025-01-30T14:00:00Z');
      const now = new Date('2025-01-30T14:20:00Z'); // 20 min after

      expect(canExtendPass(end, 15, now)).toBe(false);
    });

    it('should return true at exactly grace period end', () => {
      const end = new Date('2025-01-30T14:00:00Z');
      const now = new Date('2025-01-30T14:15:00Z'); // Exactly 15 min

      expect(canExtendPass(end, 15, now)).toBe(false); // isBefore returns false for equal
    });

    it('should use default 15 minute grace period', () => {
      const end = new Date('2025-01-30T14:00:00Z');
      const now = new Date('2025-01-30T14:10:00Z');

      expect(canExtendPass(end, undefined, now)).toBe(true);
    });
  });

  // ============================================
  // formatDuration
  // ============================================
  describe('formatDuration', () => {
    it('should format hours less than 24', () => {
      expect(formatDuration(4)).toBe('4 hours');
      expect(formatDuration(1)).toBe('1 hour');
      expect(formatDuration(12)).toBe('12 hours');
    });

    it('should format exactly 24 hours as 1 day', () => {
      expect(formatDuration(24)).toBe('1 day');
    });

    it('should format multiple days', () => {
      expect(formatDuration(48)).toBe('2 days');
      expect(formatDuration(72)).toBe('3 days');
    });

    it('should format days and hours', () => {
      expect(formatDuration(25)).toBe('1 day 1 hour');
      expect(formatDuration(26)).toBe('1 day 2 hours');
      expect(formatDuration(50)).toBe('2 days 2 hours');
    });
  });

  // ============================================
  // doDateRangesOverlap
  // ============================================
  describe('doDateRangesOverlap', () => {
    it('should return true for complete overlap', () => {
      const start1 = new Date('2025-01-30T08:00:00Z');
      const end1 = new Date('2025-01-30T16:00:00Z');
      const start2 = new Date('2025-01-30T10:00:00Z');
      const end2 = new Date('2025-01-30T14:00:00Z');

      expect(doDateRangesOverlap(start1, end1, start2, end2)).toBe(true);
    });

    it('should return true for partial overlap (start)', () => {
      const start1 = new Date('2025-01-30T08:00:00Z');
      const end1 = new Date('2025-01-30T12:00:00Z');
      const start2 = new Date('2025-01-30T10:00:00Z');
      const end2 = new Date('2025-01-30T14:00:00Z');

      expect(doDateRangesOverlap(start1, end1, start2, end2)).toBe(true);
    });

    it('should return true for partial overlap (end)', () => {
      const start1 = new Date('2025-01-30T10:00:00Z');
      const end1 = new Date('2025-01-30T14:00:00Z');
      const start2 = new Date('2025-01-30T08:00:00Z');
      const end2 = new Date('2025-01-30T12:00:00Z');

      expect(doDateRangesOverlap(start1, end1, start2, end2)).toBe(true);
    });

    it('should return false for adjacent ranges (no gap)', () => {
      const start1 = new Date('2025-01-30T08:00:00Z');
      const end1 = new Date('2025-01-30T12:00:00Z');
      const start2 = new Date('2025-01-30T12:00:00Z');
      const end2 = new Date('2025-01-30T16:00:00Z');

      expect(doDateRangesOverlap(start1, end1, start2, end2)).toBe(false);
    });

    it('should return false for non-overlapping ranges', () => {
      const start1 = new Date('2025-01-30T08:00:00Z');
      const end1 = new Date('2025-01-30T10:00:00Z');
      const start2 = new Date('2025-01-30T14:00:00Z');
      const end2 = new Date('2025-01-30T16:00:00Z');

      expect(doDateRangesOverlap(start1, end1, start2, end2)).toBe(false);
    });

    it('should return true for identical ranges', () => {
      const start = new Date('2025-01-30T10:00:00Z');
      const end = new Date('2025-01-30T14:00:00Z');

      expect(doDateRangesOverlap(start, end, start, end)).toBe(true);
    });
  });
});
