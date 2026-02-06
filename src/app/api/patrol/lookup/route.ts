import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-auth';
import { normalizeLicensePlate } from '@/lib/utils/license-plate';

const lookupSchema = z.object({
  licensePlate: z.string().min(2).max(10),
});

export type VehicleStatus =
  | 'VALID' // Active pass exists
  | 'EXPIRED' // Pass recently expired
  | 'EXPIRING_SOON' // Pass expires within 30 minutes
  | 'NOT_FOUND' // No vehicle record
  | 'UNREGISTERED' // Vehicle exists but no active pass
  | 'BLACKLISTED'; // Vehicle is blacklisted

export interface PassInfo {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  visitorName: string | null;
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

export interface PatrolLookupResult {
  status: VehicleStatus;
  statusMessage: string;
  vehicle: VehicleInfo | null;
  activePass: PassInfo | null;
  recentPasses: PassInfo[];
  violations: ViolationInfo[];
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
                building: true,
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
          visitorName: pass.visitorName,
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
        pass.status === 'ACTIVE' &&
        pass.startTime <= now &&
        pass.endTime > now
    );

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
      // Check for recently expired pass (within last hour)
      const recentExpired = vehicle.parkingPasses.find(
        (pass) =>
          (pass.status === 'EXPIRED' || pass.status === 'ACTIVE') &&
          pass.endTime <= now &&
          pass.endTime > new Date(now.getTime() - 60 * 60 * 1000)
      );

      if (recentExpired) {
        status = 'EXPIRED';
        const minutesAgo = Math.round(
          (now.getTime() - recentExpired.endTime.getTime()) / 60000
        );
        statusMessage = `Pass expired ${minutesAgo} minutes ago`;
      } else {
        status = 'UNREGISTERED';
        statusMessage = 'Vehicle has no active parking pass';
      }
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
            visitorName: activePass.visitorName,
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
        visitorName: pass.visitorName,
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
