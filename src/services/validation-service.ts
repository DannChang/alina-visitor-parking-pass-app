/**
 * Validation Service
 * Mission-critical parking pass validation logic
 * Enforces all business rules for hospital parking management
 */

import prisma from '@/lib/prisma';
import { normalizeLicensePlate } from '@/lib/utils/license-plate';
import {
  calculateConsecutiveHours,
  isCooldownPeriodOver,
  getHoursUntilCooldownEnds,
  isWithinOperatingHours,
} from '@/lib/utils/date-time';
import { ERROR_CODES, VALIDATION_MESSAGES } from '@/lib/constants';
import type { ParkingRule } from '@prisma/client';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  metadata?: Record<string, unknown>;
}

export interface ValidationWarning {
  code: string;
  message: string;
  metadata?: Record<string, unknown>;
}

interface PassRequestData {
  buildingId: string;
  licensePlate: string;
  unitId: string;
  durationHours: number;
  isEmergency?: boolean;
}

/**
 * Validate a parking pass request against all business rules
 * This is the PRIMARY validation function for all pass creation
 */
export async function validatePassRequest(
  data: PassRequestData
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  try {
    // Fetch all necessary data in parallel for performance
    const [rules, vehicle, activePassesForUnit, recentPassesForPlate] = await Promise.all([
      fetchBuildingRules(data.buildingId),
      fetchVehicle(data.licensePlate),
      countActivePassesForUnit(data.unitId),
      fetchRecentPassesForPlate(data.licensePlate),
    ]);

    // Emergency override - skip most validations
    if (data.isEmergency && rules.allowEmergencyOverride) {
      warnings.push({
        code: 'EMERGENCY_OVERRIDE',
        message: 'Emergency pass - standard restrictions bypassed',
      });
      return { isValid: true, errors, warnings };
    }

    // 1. BLACKLIST CHECK (HIGHEST PRIORITY - SECURITY)
    if (vehicle?.isBlacklisted) {
      errors.push({
        code: ERROR_CODES.BLACKLISTED,
        message: vehicle.blacklistReason ?? VALIDATION_MESSAGES.licensePlate.blacklisted,
        field: 'licensePlate',
        metadata: {
          blacklistedAt: vehicle.blacklistedAt,
          blacklistedBy: vehicle.blacklistedBy,
        },
      });
    }

    // 2. MAXIMUM VEHICLES PER UNIT
    if (activePassesForUnit >= rules.maxVehiclesPerUnit) {
      errors.push({
        code: ERROR_CODES.MAX_VEHICLES_EXCEEDED,
        message: `Maximum ${rules.maxVehiclesPerUnit} vehicle${rules.maxVehiclesPerUnit !== 1 ? 's' : ''} allowed per unit at one time. Currently ${activePassesForUnit} registered.`,
        field: 'unitNumber',
        metadata: {
          maxAllowed: rules.maxVehiclesPerUnit,
          currentCount: activePassesForUnit,
        },
      });
    }

    // 3. CONSECUTIVE HOURS LIMIT
    if (recentPassesForPlate.length > 0) {
      const totalConsecutiveHours = calculateConsecutiveHours(
        recentPassesForPlate.map((p) => ({
          startTime: p.startTime,
          endTime: p.endTime,
        }))
      );

      if (totalConsecutiveHours + data.durationHours > rules.maxConsecutiveHours) {
        errors.push({
          code: ERROR_CODES.MAX_CONSECUTIVE_HOURS,
          message: `Vehicle has ${totalConsecutiveHours} consecutive hours. Maximum ${rules.maxConsecutiveHours} hours allowed. Adding ${data.durationHours} hours would exceed limit.`,
          field: 'duration',
          metadata: {
            currentConsecutiveHours: totalConsecutiveHours,
            requestedHours: data.durationHours,
            maxAllowed: rules.maxConsecutiveHours,
          },
        });
      }
    }

    // 4. COOLDOWN PERIOD
    if (recentPassesForPlate.length > 0) {
      const lastPass = recentPassesForPlate[0];
      if (!lastPass) {
        throw new Error('Expected last pass but got undefined');
      }

      const cooldownOver = isCooldownPeriodOver(lastPass.endTime, rules.cooldownHours);

      if (!cooldownOver) {
        const hoursRemaining = getHoursUntilCooldownEnds(lastPass.endTime, rules.cooldownHours);

        errors.push({
          code: ERROR_CODES.COOLDOWN_PERIOD,
          message: `Vehicle must wait ${rules.cooldownHours} hour${rules.cooldownHours !== 1 ? 's' : ''} after last pass expires. ${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''} remaining.`,
          field: 'licensePlate',
          metadata: {
            cooldownHours: rules.cooldownHours,
            hoursRemaining,
            lastPassEndTime: lastPass.endTime,
          },
        });
      }
    }

    // 5. DURATION VALIDATION
    if (!rules.allowedDurations.includes(data.durationHours)) {
      errors.push({
        code: ERROR_CODES.INVALID_DURATION,
        message: `${data.durationHours} hour${data.durationHours !== 1 ? 's' : ''} is not an available duration. Allowed: ${rules.allowedDurations.join(', ')} hours.`,
        field: 'duration',
        metadata: {
          requestedDuration: data.durationHours,
          allowedDurations: rules.allowedDurations,
        },
      });
    }

    // 6. OPERATING HOURS CHECK
    if (!isWithinOperatingHours(rules.operatingStartHour, rules.operatingEndHour)) {
      const startHour = rules.operatingStartHour ?? 0;
      const endHour = rules.operatingEndHour ?? 24;

      errors.push({
        code: ERROR_CODES.OUTSIDE_OPERATING_HOURS,
        message: `Visitor parking is only available between ${formatHour(startHour)} and ${formatHour(endHour)}.`,
        metadata: {
          operatingHours: {
            start: startHour,
            end: endHour,
          },
        },
      });
    }

    // WARNINGS (non-blocking)

    // Long duration warning
    if (data.durationHours >= 24) {
      warnings.push({
        code: 'LONG_DURATION',
        message: `Pass duration is ${data.durationHours} hours. Ensure this is intentional.`,
        metadata: {
          durationHours: data.durationHours,
        },
      });
    }

    // High violation count warning
    if (vehicle && vehicle.violationCount > 0) {
      warnings.push({
        code: 'VIOLATION_HISTORY',
        message: `This vehicle has ${vehicle.violationCount} previous violation${vehicle.violationCount !== 1 ? 's' : ''}.`,
        metadata: {
          violationCount: vehicle.violationCount,
          riskScore: vehicle.riskScore,
        },
      });
    }

    // High risk score warning
    if (vehicle && vehicle.riskScore >= 50) {
      warnings.push({
        code: 'HIGH_RISK_VEHICLE',
        message: `This vehicle has a risk score of ${vehicle.riskScore}/100. Consider additional verification.`,
        metadata: {
          riskScore: vehicle.riskScore,
        },
      });
    }

    // Check approaching unit vehicle limit
    if (
      activePassesForUnit >= rules.maxVehiclesPerUnit - 1 &&
      activePassesForUnit < rules.maxVehiclesPerUnit
    ) {
      warnings.push({
        code: 'APPROACHING_VEHICLE_LIMIT',
        message: `This will be the ${activePassesForUnit + 1}${getOrdinalSuffix(activePassesForUnit + 1)} vehicle for this unit (limit: ${rules.maxVehiclesPerUnit}).`,
        metadata: {
          currentCount: activePassesForUnit,
          maxAllowed: rules.maxVehiclesPerUnit,
        },
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    console.error('Validation error:', error);

    // Return critical error
    return {
      isValid: false,
      errors: [
        {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'An error occurred during validation. Please try again.',
        },
      ],
      warnings: [],
    };
  }
}

/**
 * Validate pass extension request
 */
export async function validatePassExtension(
  passId: string,
  extensionHours: number
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  try {
    const pass = await prisma.parkingPass.findUnique({
      where: { id: passId },
      include: {
        unit: {
          include: {
            building: {
              include: {
                parkingRules: true,
              },
            },
          },
        },
      },
    });

    if (!pass) {
      errors.push({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Parking pass not found',
      });
      return { isValid: false, errors, warnings };
    }

    const rules = pass.unit.building.parkingRules;
    if (!rules) {
      throw new Error('Parking rules not found for building');
    }

    // Check extension count
    if (pass.extensionCount >= rules.maxExtensions) {
      errors.push({
        code: 'MAX_EXTENSIONS_EXCEEDED',
        message: `Maximum ${rules.maxExtensions} extension${rules.maxExtensions !== 1 ? 's' : ''} allowed. This pass has already been extended ${pass.extensionCount} time${pass.extensionCount !== 1 ? 's' : ''}.`,
        metadata: {
          currentExtensions: pass.extensionCount,
          maxAllowed: rules.maxExtensions,
        },
      });
    }

    // Check extension hours
    if (extensionHours > rules.extensionMaxHours) {
      errors.push({
        code: 'EXTENSION_TOO_LONG',
        message: `Extension cannot exceed ${rules.extensionMaxHours} hour${rules.extensionMaxHours !== 1 ? 's' : ''}. Requested: ${extensionHours} hour${extensionHours !== 1 ? 's' : ''}.`,
        metadata: {
          requestedHours: extensionHours,
          maxAllowed: rules.extensionMaxHours,
        },
      });
    }

    // Check if pass is already expired (with grace period)
    const now = new Date();
    const gracePeriodEnd = new Date(pass.endTime.getTime() + rules.gracePeriodMinutes * 60000);

    if (now > gracePeriodEnd) {
      errors.push({
        code: 'PASS_EXPIRED',
        message: `Pass expired more than ${rules.gracePeriodMinutes} minutes ago and cannot be extended.`,
        metadata: {
          expiredAt: pass.endTime,
          gracePeriodMinutes: rules.gracePeriodMinutes,
        },
      });
    }

    // Check if pass is cancelled or suspended
    if (pass.status === 'CANCELLED' || pass.status === 'SUSPENDED') {
      errors.push({
        code: 'INVALID_STATUS',
        message: `Cannot extend a ${pass.status.toLowerCase()} pass.`,
        metadata: {
          status: pass.status,
        },
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    console.error('Extension validation error:', error);

    return {
      isValid: false,
      errors: [
        {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'An error occurred during validation. Please try again.',
        },
      ],
      warnings: [],
    };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Fetch building rules with default fallback
 */
async function fetchBuildingRules(buildingId: string): Promise<ParkingRule> {
  const rules = await prisma.parkingRule.findUnique({
    where: { buildingId },
  });

  if (!rules) {
    // Return default rules if not configured
    return {
      id: 'default',
      buildingId,
      maxVehiclesPerUnit: 2,
      maxConsecutiveHours: 24,
      cooldownHours: 2,
      maxExtensions: 1,
      extensionMaxHours: 4,
      requireUnitConfirmation: false,
      operatingStartHour: null,
      operatingEndHour: null,
      allowedDurations: [2, 4, 8, 12, 24],
      gracePeriodMinutes: 15,
      allowEmergencyOverride: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  return rules;
}

/**
 * Fetch vehicle by license plate
 */
async function fetchVehicle(licensePlate: string) {
  const normalizedPlate = normalizeLicensePlate(licensePlate);

  return prisma.vehicle.findUnique({
    where: { normalizedPlate },
  });
}

/**
 * Count active passes for a unit
 */
async function countActivePassesForUnit(unitId: string): Promise<number> {
  const now = new Date();

  return prisma.parkingPass.count({
    where: {
      unitId,
      status: 'ACTIVE',
      endTime: { gt: now },
      deletedAt: null,
    },
  });
}

/**
 * Fetch recent passes for a license plate (last 48 hours)
 */
async function fetchRecentPassesForPlate(licensePlate: string) {
  const normalizedPlate = normalizeLicensePlate(licensePlate);
  const lookbackTime = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago

  return prisma.parkingPass.findMany({
    where: {
      vehicle: { normalizedPlate },
      createdAt: { gte: lookbackTime },
      deletedAt: null,
    },
    orderBy: {
      endTime: 'desc',
    },
    select: {
      startTime: true,
      endTime: true,
      duration: true,
    },
  });
}

/**
 * Format hour for display (24h to 12h format)
 */
function formatHour(hour: number): string {
  if (hour === 0) return '12:00 AM';
  if (hour === 12) return '12:00 PM';
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
}

/**
 * Get ordinal suffix for numbers (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;

  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}
