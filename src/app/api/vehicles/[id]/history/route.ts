import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-auth';

// GET /api/vehicles/[id]/history - Fetch full vehicle history
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requirePermission('vehicles:view');
  if (!authResult.authorized) {
    return authResult.response;
  }

  const { id } = await params;

  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        parkingPasses: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            unit: {
              include: {
                building: true,
              },
            },
          },
        },
        violations: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            loggedBy: {
              select: { id: true, name: true },
            },
          },
        },
        patrolLogEntries: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            patroller: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    const passes = vehicle.parkingPasses.map((pass) => ({
      id: pass.id,
      status: pass.status,
      startTime: pass.startTime.toISOString(),
      endTime: pass.endTime.toISOString(),
      visitorName: pass.visitorName,
      unitNumber: pass.unit.unitNumber,
      buildingName: pass.unit.building.name,
      passType: pass.passType,
      confirmationCode: pass.confirmationCode,
    }));

    const violations = vehicle.violations.map((v) => ({
      id: v.id,
      type: v.type,
      severity: v.severity,
      description: v.description,
      location: v.location,
      isResolved: v.isResolved,
      createdAt: v.createdAt.toISOString(),
      loggedBy: v.loggedBy.name,
    }));

    const patrolLogs = vehicle.patrolLogEntries.map((entry) => ({
      id: entry.id,
      entryType: entry.entryType,
      licensePlate: entry.licensePlate,
      location: entry.location,
      notes: entry.notes,
      createdAt: entry.createdAt.toISOString(),
      patroller: entry.patroller.name,
    }));

    return NextResponse.json({
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
        isResidentVehicle: vehicle.isResidentVehicle,
      },
      passes,
      violations,
      patrolLogs,
    });
  } catch (error) {
    console.error('Error fetching vehicle history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicle history' },
      { status: 500 }
    );
  }
}
