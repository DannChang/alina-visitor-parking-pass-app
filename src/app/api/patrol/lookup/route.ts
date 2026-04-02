import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-auth';
import { normalizeLicensePlate } from '@/lib/utils/license-plate';
import { detectAndCreateViolation } from '@/services/violation-detection-service';
import type { ViolationType, ViolationSeverity } from '@prisma/client';

const lookupSchema = z.object({
  licensePlate: z.string().min(2).max(10),
});

export type VehicleStatus =
  | 'VALID' // Active pass exists
  | 'EXPIRED' // Pass recently expired
  | 'EXPIRING_SOON' // Pass expires within 30 minutes
  | 'IN_GRACE_PERIOD' // Expired but within grace period
  | 'NOT_FOUND' // No vehicle record
  | 'UNREGISTERED' // Vehicle exists but no active pass
  | 'BLACKLISTED' // Vehicle is blacklisted
  | 'RESIDENT_IN_VISITOR'; // Resident vehicle in visitor parking

export interface PassInfo {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  visitorPhone: string | null;
  visitorEmail: string | null;
  unitNumber: string;
  buildingName: string;
  passType: string;
  isEmergency: boolean;
  confirmationCode: string;
}

export interface ViolationInfo {
  id: string;
  type: string;
  severity: string;
  createdAt: string;
  isResolved: boolean;
  location: string | null;
}

export interface VehicleInfo {
  id: string;
  licensePlate: string;
  make: string | null;
  model: string | null;
  color: string | null;
  isBlacklisted: boolean;
  blacklistReason: string | null;
  violationCount: number;
  riskScore: number;
}

export interface AutoCreatedViolation {
  id: string;
  type: ViolationType;
  severity: ViolationSeverity;
  isNew: boolean;
  skippedReason?: string;
}

export interface PatrolLookupResult {
  status: VehicleStatus;
  statusMessage: string;
  vehicle: VehicleInfo | null;
  activePass: PassInfo | null;
  recentPasses: PassInfo[];
  violations: ViolationInfo[];
  autoCreatedViolation?: AutoCreatedViolation;
  lookupTime: string;
}

// POST /api/patrol/lookup - Look up a license plate for patrol mode
export async function POST(request: NextRequest) {
  // Require passes:view_all permission (patrol users)
  const authResult = await requirePermission('passes:view_all');
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const parsed = lookupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const normalizedPlate = normalizeLicensePlate(parsed.data.licensePlate);
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

    // Look up the vehicle
    const vehicle = await prisma.vehicle.findUnique({
      where: { normalizedPlate },
      include: {
        parkingPasses: {
          where: {
            deletedAt: null,
          },
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
          orderBy: { endTime: 'desc' },
          take: 10, // Get recent passes
        },
        violations: {
          where: {
            deletedAt: null,
          },
          orderBy: { createdAt: 'desc' },
          take: 5, // Get recent violations
        },
      },
    });

    // No vehicle found
    if (!vehicle) {
      const result: PatrolLookupResult = {
        status: 'NOT_FOUND',
        statusMessage: 'No vehicle record found for this license plate',
        vehicle: null,
        activePass: null,
        recentPasses: [],
        violations: [],
        lookupTime: now.toISOString(),
      };
      return NextResponse.json(result);
    }

    // Check for blacklist
    if (vehicle.isBlacklisted) {
      const result: PatrolLookupResult = {
        status: 'BLACKLISTED',
        statusMessage: `Vehicle is BLACKLISTED: ${vehicle.blacklistReason || 'No reason provided'}`,
        vehicle: {
          id: vehicle.id,
          licensePlate: vehicle.licensePlate,
          make: vehicle.make,
          model: vehicle.model,
          color: vehicle.color,
          isBlacklisted: vehicle.isBlacklisted,
          blacklistReason: vehicle.blacklistReason,
          violationCount: vehicle.violationCount,
          riskScore: vehicle.riskScore,
        },
        activePass: null,
        recentPasses: vehicle.parkingPasses.map((pass) => ({
          id: pass.id,
          status: pass.status,
          startTime: pass.startTime.toISOString(),
          endTime: pass.endTime.toISOString(),
          visitorPhone: pass.visitorPhone,
          visitorEmail: pass.visitorEmail,
          unitNumber: pass.unit.unitNumber,
          buildingName: pass.unit.building.name,
          passType: pass.passType,
          isEmergency: pass.isEmergency,
          confirmationCode: pass.confirmationCode,
        })),
        violations: vehicle.violations.map((v) => ({
          id: v.id,
          type: v.type,
          severity: v.severity,
          createdAt: v.createdAt.toISOString(),
          isResolved: v.isResolved,
          location: v.location,
        })),
        lookupTime: now.toISOString(),
      };
      return NextResponse.json(result);
    }

    // Check if this is a resident vehicle in visitor parking
    if (vehicle.isResidentVehicle) {
      const result: PatrolLookupResult = {
        status: 'RESIDENT_IN_VISITOR',
        statusMessage: 'Resident vehicle detected in visitor parking area',
        vehicle: {
          id: vehicle.id,
          licensePlate: vehicle.licensePlate,
          make: vehicle.make,
          model: vehicle.model,
          color: vehicle.color,
          isBlacklisted: vehicle.isBlacklisted,
          blacklistReason: vehicle.blacklistReason,
          violationCount: vehicle.violationCount,
          riskScore: vehicle.riskScore,
        },
        activePass: null,
        recentPasses: vehicle.parkingPasses.slice(0, 5).map((pass) => ({
          id: pass.id,
          status: pass.status,
          startTime: pass.startTime.toISOString(),
          endTime: pass.endTime.toISOString(),
          visitorPhone: pass.visitorPhone,
          visitorEmail: pass.visitorEmail,
          unitNumber: pass.unit.unitNumber,
          buildingName: pass.unit.building.name,
          passType: pass.passType,
          isEmergency: pass.isEmergency,
          confirmationCode: pass.confirmationCode,
        })),
        violations: vehicle.violations.map((v) => ({
          id: v.id,
          type: v.type,
          severity: v.severity,
          createdAt: v.createdAt.toISOString(),
          isResolved: v.isResolved,
          location: v.location,
        })),
        lookupTime: now.toISOString(),
      };
      return NextResponse.json(result);
    }

    // Find active pass
    const activePass = vehicle.parkingPasses.find(
      (pass) =>
        (pass.status === 'ACTIVE' || pass.status === 'EXTENDED') &&
        pass.startTime <= now &&
        pass.endTime > now
    );
    const recentExpired = vehicle.parkingPasses.find(
      (pass) =>
        (pass.status === 'EXPIRED' || pass.status === 'ACTIVE' || pass.status === 'EXTENDED') &&
        pass.endTime <= now &&
        pass.endTime > new Date(now.getTime() - 60 * 60 * 1000)
    );
    const passForRules = activePass ?? recentExpired ?? vehicle.parkingPasses[0] ?? null;

    const parkingRules = passForRules?.unit.building.parkingRules ?? null;
    const gracePeriodMinutes = parkingRules?.gracePeriodMinutes ?? 15;

    // Determine status
    let status: VehicleStatus;
    let statusMessage: string;

    if (activePass) {
      if (activePass.endTime <= thirtyMinutesFromNow) {
        status = 'EXPIRING_SOON';
        const minutesLeft = Math.round(
          (activePass.endTime.getTime() - now.getTime()) / 60000
        );
        statusMessage = `Pass expires in ${minutesLeft} minutes`;
      } else {
        status = 'VALID';
        statusMessage = `Valid pass until ${activePass.endTime.toLocaleTimeString()}`;
      }
    } else {
      if (recentExpired) {
        const minutesAgo = Math.round(
          (now.getTime() - recentExpired.endTime.getTime()) / 60000
        );

        // Check grace period
        if (minutesAgo <= gracePeriodMinutes) {
          status = 'IN_GRACE_PERIOD';
          const graceRemaining = gracePeriodMinutes - minutesAgo;
          statusMessage = `Pass expired ${minutesAgo} min ago. Grace period: ${graceRemaining} min remaining`;
        } else {
          status = 'EXPIRED';
          statusMessage = `Pass expired ${minutesAgo} minutes ago`;
        }
      } else {
        status = 'UNREGISTERED';
        statusMessage = 'Vehicle has no active parking pass';
      }
    }

    // Auto-detect and create violation for actionable statuses
    let autoCreatedViolation: AutoCreatedViolation | undefined;
    const VIOLATION_STATUSES: VehicleStatus[] = ['EXPIRED', 'UNREGISTERED'];

    if (VIOLATION_STATUSES.includes(status)) {
      const detection = await detectAndCreateViolation({
        vehicleId: vehicle.id,
        licensePlate: vehicle.licensePlate,
        normalizedPlate,
        status,
        loggedById: authResult.request.userId,
        expiredPass: recentExpired
          ? {
              endTime: recentExpired.endTime,
              startTime: recentExpired.startTime,
            duration: recentExpired.duration,
          }
          : null,
        buildingRules: parkingRules
          ? {
              maxConsecutiveHours: parkingRules.maxConsecutiveHours,
              gracePeriodMinutes: parkingRules.gracePeriodMinutes,
            }
          : null,
        vehicleStats: {
          violationCount: vehicle.violationCount,
          riskScore: vehicle.riskScore,
          isBlacklisted: vehicle.isBlacklisted,
        },
      });

      if (detection.violated && detection.violation) {
        autoCreatedViolation = {
          id: detection.violation.id,
          type: detection.violation.type,
          severity: detection.violation.severity,
          isNew: true,
        };
      }
    }

    // Check for overstay on active passes
    if (
      !autoCreatedViolation?.isNew &&
      activePass &&
      parkingRules
    ) {
      const hoursParked =
        (now.getTime() - activePass.startTime.getTime()) / (1000 * 60 * 60);
      if (hoursParked > (parkingRules.maxConsecutiveHours ?? 24)) {
        const detection = await detectAndCreateViolation({
          vehicleId: vehicle.id,
          licensePlate: vehicle.licensePlate,
          normalizedPlate,
          status: 'VALID',
          loggedById: authResult.request.userId,
          activePass: {
            startTime: activePass.startTime,
            endTime: activePass.endTime,
          },
          buildingRules: {
            maxConsecutiveHours: parkingRules.maxConsecutiveHours,
            gracePeriodMinutes: parkingRules.gracePeriodMinutes,
          },
          vehicleStats: {
            violationCount: vehicle.violationCount,
            riskScore: vehicle.riskScore,
            isBlacklisted: vehicle.isBlacklisted,
          },
        });

        if (detection.violated && detection.violation) {
          autoCreatedViolation = {
            id: detection.violation.id,
            type: detection.violation.type,
            severity: detection.violation.severity,
            isNew: true,
          };
        }
      }
    }

    const violations = vehicle.violations.map((v) => ({
      id: v.id,
      type: v.type,
      severity: v.severity,
      createdAt: v.createdAt.toISOString(),
      isResolved: v.isResolved,
      location: v.location,
    }));

    if (autoCreatedViolation?.isNew) {
      violations.unshift({
        id: autoCreatedViolation.id,
        type: autoCreatedViolation.type,
        severity: autoCreatedViolation.severity,
        createdAt: now.toISOString(),
        isResolved: false,
        location: null,
      });
    }

    const result: PatrolLookupResult = {
      status,
      statusMessage,
      vehicle: {
        id: vehicle.id,
        licensePlate: vehicle.licensePlate,
        make: vehicle.make,
        model: vehicle.model,
        color: vehicle.color,
        isBlacklisted: vehicle.isBlacklisted,
        blacklistReason: vehicle.blacklistReason,
        violationCount: vehicle.violationCount,
        riskScore: vehicle.riskScore,
      },
      activePass: activePass
        ? {
            id: activePass.id,
            status: activePass.status,
            startTime: activePass.startTime.toISOString(),
            endTime: activePass.endTime.toISOString(),
            visitorPhone: activePass.visitorPhone,
            visitorEmail: activePass.visitorEmail,
            unitNumber: activePass.unit.unitNumber,
            buildingName: activePass.unit.building.name,
            passType: activePass.passType,
            isEmergency: activePass.isEmergency,
            confirmationCode: activePass.confirmationCode,
          }
        : null,
      recentPasses: vehicle.parkingPasses.slice(0, 5).map((pass) => ({
        id: pass.id,
        status: pass.status,
        startTime: pass.startTime.toISOString(),
        endTime: pass.endTime.toISOString(),
        visitorPhone: pass.visitorPhone,
        visitorEmail: pass.visitorEmail,
        unitNumber: pass.unit.unitNumber,
        buildingName: pass.unit.building.name,
        passType: pass.passType,
        isEmergency: pass.isEmergency,
        confirmationCode: pass.confirmationCode,
      })),
      violations,
      ...(autoCreatedViolation ? { autoCreatedViolation } : {}),
      lookupTime: now.toISOString(),
    };

    // Create audit log for the lookup
    await prisma.auditLog.create({
      data: {
        action: 'READ',
        entityType: 'Vehicle',
        entityId: vehicle.id,
        userId: authResult.request.userId,
        details: {
          action: 'patrol_lookup',
          licensePlate: vehicle.licensePlate,
          status,
        },
        dataAccessed: ['vehicle', 'passes', 'violations'],
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Patrol lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to look up vehicle' },
      { status: 500 }
    );
  }
}
