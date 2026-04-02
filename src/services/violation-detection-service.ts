/**
 * Violation Detection Service
 *
 * Automatically detects and creates violations based on vehicle status.
 * Used by both patrol lookup (real-time) and background cron (scheduled).
 */

import { prisma } from '@/lib/prisma';
import { ViolationType, ViolationSeverity } from '@prisma/client';
import { SYSTEM_USER_EMAIL } from '@/lib/constants';

export type DetectionStatus =
  | 'VALID'
  | 'EXPIRED'
  | 'EXPIRING_SOON'
  | 'IN_GRACE_PERIOD'
  | 'NOT_FOUND'
  | 'UNREGISTERED'
  | 'BLACKLISTED'
  | 'RESIDENT_IN_VISITOR';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DetectionContext {
  vehicleId: string;
  licensePlate: string;
  normalizedPlate: string;
  status: DetectionStatus;
  loggedById: string;
  location?: string;
  parkingZoneId?: string;
  /** Most recent expired pass data, if any */
  expiredPass?: {
    endTime: Date;
    startTime: Date;
    duration: number;
  } | null;
  /** Active pass that may be overstaying */
  activePass?: {
    startTime: Date;
    endTime: Date;
  } | null;
  /** Building-level parking rules */
  buildingRules?: {
    maxConsecutiveHours: number;
    gracePeriodMinutes: number;
  } | null;
  /** Current vehicle stats (if vehicle exists) */
  vehicleStats?: {
    violationCount: number;
    riskScore: number;
    isBlacklisted: boolean;
  } | null;
}

export interface DetectionResult {
  violated: boolean;
  violation?: {
    id: string;
    type: ViolationType;
    severity: ViolationSeverity;
    createdAt: Date;
    location: string | null;
  };
  skippedReason?: string;
}

export interface SeverityContext {
  violationCount: number;
  riskScore: number;
  isBlacklisted: boolean;
  minutesPastExpiry?: number;
}

export interface BulkScanResult {
  scanned: number;
  violationsCreated: number;
  duplicatesSkipped: number;
  errors: number;
}

// ---------------------------------------------------------------------------
// Status → ViolationType mapping
// ---------------------------------------------------------------------------

const STATUS_TO_VIOLATION_TYPE: Partial<Record<DetectionStatus, ViolationType>> = {
  EXPIRED: ViolationType.EXPIRED_PASS,
  UNREGISTERED: ViolationType.UNREGISTERED,
};

// ---------------------------------------------------------------------------
// Severity calculation
// ---------------------------------------------------------------------------

const SEVERITY_ORDER: ViolationSeverity[] = [
  ViolationSeverity.LOW,
  ViolationSeverity.MEDIUM,
  ViolationSeverity.HIGH,
  ViolationSeverity.CRITICAL,
];

function bumpSeverity(current: ViolationSeverity): ViolationSeverity {
  const idx = SEVERITY_ORDER.indexOf(current);
  if (idx >= 0 && idx < SEVERITY_ORDER.length - 1) {
    return SEVERITY_ORDER[idx + 1]!;
  }
  return current;
}

export function calculateSeverity(
  type: ViolationType,
  ctx: SeverityContext
): ViolationSeverity {
  let severity: ViolationSeverity;

  if (type === ViolationType.UNREGISTERED) {
    severity = ctx.violationCount === 0
      ? ViolationSeverity.LOW
      : ViolationSeverity.MEDIUM;
  } else if (type === ViolationType.EXPIRED_PASS) {
    const mins = ctx.minutesPastExpiry ?? 0;
    if (mins < 60) {
      severity = ViolationSeverity.LOW;
    } else if (mins < 240) {
      severity = ViolationSeverity.MEDIUM;
    } else {
      severity = ViolationSeverity.HIGH;
    }
  } else if (type === ViolationType.OVERSTAY) {
    severity = ViolationSeverity.HIGH;
  } else {
    severity = ViolationSeverity.MEDIUM;
  }

  // Bump for high-risk vehicles
  if (ctx.isBlacklisted) {
    return ViolationSeverity.CRITICAL;
  }
  if (ctx.riskScore >= 75 || ctx.violationCount >= 5) {
    severity = bumpSeverity(severity);
  }

  return severity;
}

// ---------------------------------------------------------------------------
// Duplicate check
// ---------------------------------------------------------------------------

export async function checkDuplicateViolation(
  vehicleId: string,
  type: ViolationType,
  windowHours = 24
): Promise<boolean> {
  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000);

  const existing = await prisma.violation.findFirst({
    where: {
      vehicleId,
      type,
      deletedAt: null,
      isResolved: false,
      createdAt: { gte: cutoff },
    },
    select: { id: true },
  });

  return existing !== null;
}

// ---------------------------------------------------------------------------
// Risk score increment by severity
// ---------------------------------------------------------------------------

function riskScoreIncrement(severity: ViolationSeverity): number {
  switch (severity) {
    case ViolationSeverity.CRITICAL: return 25;
    case ViolationSeverity.HIGH: return 15;
    case ViolationSeverity.MEDIUM: return 10;
    case ViolationSeverity.LOW: return 5;
  }
}

export async function detectAndCreateViolation(
  ctx: DetectionContext
): Promise<DetectionResult> {
  const now = new Date();

  // Determine violation type from status
  let violationType = STATUS_TO_VIOLATION_TYPE[ctx.status] ?? null;

  // Check for overstay on active passes
  if (
    !violationType &&
    ctx.activePass &&
    ctx.buildingRules
  ) {
    const hoursParked =
      (now.getTime() - ctx.activePass.startTime.getTime()) / (1000 * 60 * 60);
    if (hoursParked > ctx.buildingRules.maxConsecutiveHours) {
      violationType = ViolationType.OVERSTAY;
    }
  }

  // No violation needed
  if (!violationType) {
    return { violated: false, skippedReason: 'no_violation_condition' };
  }

  if (!ctx.vehicleId) {
    return { violated: false, skippedReason: 'no_vehicle_context' };
  }

  const vehicleId = ctx.vehicleId;
  const stats = ctx.vehicleStats ?? {
    violationCount: 0,
    riskScore: 0,
    isBlacklisted: false,
  };

  // Duplicate check
  const isDuplicate = await checkDuplicateViolation(vehicleId, violationType);
  if (isDuplicate) {
    return { violated: false, skippedReason: 'duplicate_within_24h' };
  }

  // Calculate severity
  const minutesPastExpiry =
    ctx.expiredPass && violationType === ViolationType.EXPIRED_PASS
      ? Math.round((now.getTime() - ctx.expiredPass.endTime.getTime()) / 60000)
      : 0;

  const severity = calculateSeverity(violationType, {
    violationCount: stats.violationCount,
    riskScore: stats.riskScore,
    isBlacklisted: stats.isBlacklisted,
    minutesPastExpiry,
  });

  // Build description
  const description = buildDescription(violationType, minutesPastExpiry);

  // Create violation + update vehicle + audit log in a transaction
  const violation = await prisma.$transaction(async (tx) => {
    const created = await tx.violation.create({
      data: {
        vehicleId,
        type: violationType,
        severity,
        description,
        location: ctx.location ?? null,
        parkingZoneId: ctx.parkingZoneId ?? null,
        loggedById: ctx.loggedById,
      },
      select: { id: true, type: true, severity: true, createdAt: true, location: true },
    });

    await tx.vehicle.update({
      where: { id: vehicleId },
      data: {
        violationCount: { increment: 1 },
        riskScore: { increment: riskScoreIncrement(severity) },
      },
    });

    await tx.auditLog.create({
      data: {
        action: 'LOG_VIOLATION',
        entityType: 'Violation',
        entityId: created.id,
        userId: ctx.loggedById,
        details: {
          vehicleId,
          licensePlate: ctx.licensePlate,
          type: violationType,
          severity,
          automated: true,
        },
      },
    });

    return created;
  });

  return {
    violated: true,
    violation: {
      id: violation.id,
      type: violation.type,
      severity: violation.severity,
      createdAt: violation.createdAt,
      location: violation.location,
    },
  };
}

// ---------------------------------------------------------------------------
// Description builder
// ---------------------------------------------------------------------------

function buildDescription(
  type: ViolationType,
  minutesPastExpiry?: number
): string {
  switch (type) {
    case ViolationType.EXPIRED_PASS: {
      if (minutesPastExpiry !== undefined) {
        const hours = Math.floor(minutesPastExpiry / 60);
        const mins = minutesPastExpiry % 60;
        const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        return `Pass expired ${timeStr} ago (auto-detected)`;
      }
      return 'Expired parking pass (auto-detected)';
    }
    case ViolationType.UNREGISTERED:
      return 'Vehicle has no active parking pass (auto-detected)';
    case ViolationType.OVERSTAY:
      return 'Vehicle exceeded maximum consecutive parking hours (auto-detected)';
    default:
      return 'Violation auto-detected';
  }
}

// ---------------------------------------------------------------------------
// System user lookup
// ---------------------------------------------------------------------------

export async function getSystemUserId(): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { email: SYSTEM_USER_EMAIL },
    select: { id: true },
  });

  if (!user) {
    throw new Error(
      `System user not found (${SYSTEM_USER_EMAIL}). Run "pnpm db:seed" to create it.`
    );
  }

  return user.id;
}

// ---------------------------------------------------------------------------
// Bulk scan for expired passes (background cron)
// ---------------------------------------------------------------------------

export async function scanExpiredPasses(
  loggedById: string
): Promise<BulkScanResult> {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const BATCH_SIZE = 50;

  const result: BulkScanResult = {
    scanned: 0,
    violationsCreated: 0,
    duplicatesSkipped: 0,
    errors: 0,
  };

  // 1. Find expired passes (past grace period)
  const expiredPasses = await prisma.parkingPass.findMany({
    where: {
      status: { in: ['ACTIVE', 'EXTENDED'] },
      endTime: { lt: now, gt: twentyFourHoursAgo },
      deletedAt: null,
    },
    include: {
      vehicle: {
        select: {
          id: true,
          licensePlate: true,
          normalizedPlate: true,
          violationCount: true,
          riskScore: true,
          isBlacklisted: true,
        },
      },
      unit: {
        include: {
          building: {
            include: { parkingRules: true },
          },
        },
      },
    },
    take: BATCH_SIZE * 10, // Process up to 500 at a time
  });

  for (let i = 0; i < expiredPasses.length; i += BATCH_SIZE) {
    const batch = expiredPasses.slice(i, i + BATCH_SIZE);

    for (const pass of batch) {
      result.scanned++;

      const gracePeriod = pass.unit.building.parkingRules?.gracePeriodMinutes ?? 15;
      const minutesSinceExpiry = (now.getTime() - pass.endTime.getTime()) / 60000;

      // Skip if still within grace period
      if (minutesSinceExpiry <= gracePeriod) {
        continue;
      }

      try {
        const detection = await detectAndCreateViolation({
          vehicleId: pass.vehicle.id,
          licensePlate: pass.vehicle.licensePlate,
          normalizedPlate: pass.vehicle.normalizedPlate,
          status: 'EXPIRED',
          loggedById,
          expiredPass: {
            endTime: pass.endTime,
            startTime: pass.startTime,
            duration: pass.duration,
          },
          buildingRules: pass.unit.building.parkingRules
            ? {
                maxConsecutiveHours: pass.unit.building.parkingRules.maxConsecutiveHours,
                gracePeriodMinutes: pass.unit.building.parkingRules.gracePeriodMinutes,
              }
            : null,
          vehicleStats: {
            violationCount: pass.vehicle.violationCount,
            riskScore: pass.vehicle.riskScore,
            isBlacklisted: pass.vehicle.isBlacklisted,
          },
        });

        if (detection.violated) {
          result.violationsCreated++;
        } else if (detection.skippedReason === 'duplicate_within_24h') {
          result.duplicatesSkipped++;
        }
      } catch (error) {
        console.error(
          `Error processing expired pass ${pass.id} for vehicle ${pass.vehicle.licensePlate}:`,
          error
        );
        result.errors++;
      }
    }
  }

  // 2. Find overstaying active passes
  const overstayPasses = await prisma.parkingPass.findMany({
    where: {
      status: { in: ['ACTIVE', 'EXTENDED'] },
      endTime: { gt: now }, // Still active
      deletedAt: null,
    },
    include: {
      vehicle: {
        select: {
          id: true,
          licensePlate: true,
          normalizedPlate: true,
          violationCount: true,
          riskScore: true,
          isBlacklisted: true,
        },
      },
      unit: {
        include: {
          building: {
            include: { parkingRules: true },
          },
        },
      },
    },
    take: BATCH_SIZE * 10,
  });

  for (let i = 0; i < overstayPasses.length; i += BATCH_SIZE) {
    const batch = overstayPasses.slice(i, i + BATCH_SIZE);

    for (const pass of batch) {
      result.scanned++;

      const maxHours = pass.unit.building.parkingRules?.maxConsecutiveHours ?? 24;
      const hoursParked =
        (now.getTime() - pass.startTime.getTime()) / (1000 * 60 * 60);

      if (hoursParked <= maxHours) {
        continue;
      }

      try {
        const detection = await detectAndCreateViolation({
          vehicleId: pass.vehicle.id,
          licensePlate: pass.vehicle.licensePlate,
          normalizedPlate: pass.vehicle.normalizedPlate,
          status: 'VALID', // Pass is still active but overstaying
          loggedById,
          activePass: {
            startTime: pass.startTime,
            endTime: pass.endTime,
          },
          buildingRules: pass.unit.building.parkingRules
            ? {
                maxConsecutiveHours: pass.unit.building.parkingRules.maxConsecutiveHours,
                gracePeriodMinutes: pass.unit.building.parkingRules.gracePeriodMinutes,
              }
            : null,
          vehicleStats: {
            violationCount: pass.vehicle.violationCount,
            riskScore: pass.vehicle.riskScore,
            isBlacklisted: pass.vehicle.isBlacklisted,
          },
        });

        if (detection.violated) {
          result.violationsCreated++;
        } else if (detection.skippedReason === 'duplicate_within_24h') {
          result.duplicatesSkipped++;
        }
      } catch (error) {
        console.error(
          `Error processing overstay pass ${pass.id} for vehicle ${pass.vehicle.licensePlate}:`,
          error
        );
        result.errors++;
      }
    }
  }

  return result;
}
