import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { createDefaultParkingRule } from '@/lib/parking-rules';
import { normalizeLicensePlate } from '@/lib/utils/license-plate';
import { calculateEndTime, getTimeBankWindowStart } from '@/lib/utils/date-time';
import { validatePassRequest } from '@/services/validation-service';
import { sendPassConfirmationNotifications } from '@/services/notification-service';
import { PassStatus, PassType } from '@prisma/client';

const createPassSchema = z.object({
  licensePlate: z.string().min(2).max(10),
  duration: z.number().int().min(1).max(24),
  visitorPhone: z.string().trim().min(1).max(20),
  visitorEmail: z.string().trim().email(),
  vehicleMake: z.string().trim().min(1).max(50),
  vehicleModel: z.string().trim().min(1).max(50),
  vehicleYear: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1),
});

// GET /api/resident/passes - List passes for the resident's unit
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const residentId = (session as unknown as Record<string, string>).residentId;
  const unitId = (session as unknown as Record<string, string>).unitId;
  if (!residentId || !unitId) {
    return NextResponse.json({ error: 'Not a resident session' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as PassStatus | null;
  const scope = searchParams.get('scope');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  try {
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        building: {
          include: {
            parkingRules: true,
          },
        },
      },
    });

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    const parkingRules = unit.building.parkingRules ?? createDefaultParkingRule(unit.buildingId);
    const timeBankWindowStart = getTimeBankWindowStart(
      parkingRules.timeBankPeriod,
      unit.building.timezone
    );

    const now = new Date();
    const where: Record<string, unknown> = {
      unitId,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    } else if (scope === 'active') {
      where.status = { in: [PassStatus.ACTIVE, PassStatus.EXTENDED] };
      where.endTime = { gt: now };
    } else if (scope === 'expired') {
      where.status = { in: [PassStatus.ACTIVE, PassStatus.EXPIRED, PassStatus.EXTENDED] };
      where.endTime = { lte: now };
    }

    const [passes, total, activePassCount, timeBankPasses] = await Promise.all([
      prisma.parkingPass.findMany({
        where,
        include: {
          vehicle: {
            select: {
              id: true,
              licensePlate: true,
              make: true,
              model: true,
              year: true,
              color: true,
            },
          },
          unit: {
            select: {
              id: true,
              unitNumber: true,
              building: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.parkingPass.count({ where }),
      prisma.parkingPass.count({
        where: {
          unitId,
          deletedAt: null,
          endTime: { gt: now },
          status: { in: [PassStatus.ACTIVE, PassStatus.EXTENDED] },
        },
      }),
      prisma.parkingPass.findMany({
        where: {
          unitId,
          startTime: { gte: timeBankWindowStart },
          deletedAt: null,
          status: { in: [PassStatus.ACTIVE, PassStatus.EXPIRED, PassStatus.EXTENDED] },
        },
        select: {
          duration: true,
        },
      }),
    ]);

    const timeBankHoursUsed = timeBankPasses.reduce(
      (totalHours, pass) => totalHours + pass.duration,
      0
    );

    return NextResponse.json({
      passes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      limits: {
        allowedDurations: parkingRules.allowedDurations,
        maxActivePasses: parkingRules.maxVehiclesPerUnit,
        monthlyHourBank: parkingRules.monthlyHourBank,
        timeBankPeriod: parkingRules.timeBankPeriod,
      },
      usage: {
        activePassCount,
        activePassLimit: parkingRules.maxVehiclesPerUnit,
        monthlyHoursUsed: timeBankHoursUsed,
        monthlyHoursRemaining: Math.max(parkingRules.monthlyHourBank - timeBankHoursUsed, 0),
      },
    });
  } catch (error) {
    console.error('Error fetching resident passes:', error);
    return NextResponse.json({ error: 'Failed to fetch passes' }, { status: 500 });
  }
}

// POST /api/resident/passes - Create a pass for a guest
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const residentId = (session as unknown as Record<string, string>).residentId;
  const unitId = (session as unknown as Record<string, string>).unitId;
  if (!residentId || !unitId) {
    return NextResponse.json({ error: 'Not a resident session' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createPassSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const normalizedPlate = normalizeLicensePlate(data.licensePlate);
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { normalizedPlate },
    });

    if (existingVehicle?.residentId === residentId) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          errors: [
            {
              code: 'RESIDENT_SELF_PLATE',
              message: "You can't create a visitor pass for your own vehicle.",
              field: 'licensePlate',
            },
          ],
          warnings: [],
        },
        { status: 400 }
      );
    }

    // Get the unit with building info for validation
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: { building: true },
    });

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    // Validate the pass request using business rules
    const validationResult = await validatePassRequest({
      licensePlate: normalizedPlate,
      unitId,
      buildingId: unit.buildingId,
      timezone: unit.building.timezone,
      durationHours: data.duration,
    });

    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          errors: validationResult.errors,
          warnings: validationResult.warnings,
        },
        { status: 400 }
      );
    }

    // Find or create the vehicle
    let vehicle = existingVehicle;

    if (!vehicle) {
      vehicle = await prisma.vehicle.create({
        data: {
          licensePlate: data.licensePlate.toUpperCase(),
          normalizedPlate,
          make: data.vehicleMake,
          model: data.vehicleModel,
          year: data.vehicleYear,
        },
      });
    } else {
      vehicle = await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: {
          make: data.vehicleMake,
          model: data.vehicleModel,
          year: data.vehicleYear,
        },
      });
    }

    // Calculate timing
    const startTime = new Date();
    const endTime = calculateEndTime(startTime, data.duration);

    // Create the parking pass
    const pass = await prisma.parkingPass.create({
      data: {
        vehicleId: vehicle.id,
        unitId,
        startTime,
        endTime,
        originalEndTime: endTime,
        duration: data.duration,
        status: PassStatus.ACTIVE,
        passType: PassType.VISITOR,
        visitorPhone: data.visitorPhone,
        visitorEmail: data.visitorEmail,
        registeredVia: 'RESIDENT_PORTAL',
        createdByResidentId: residentId,
      },
      include: {
        vehicle: true,
        unit: {
          include: { building: true },
        },
      },
    });

    try {
      await sendPassConfirmationNotifications(pass.id);
    } catch (error) {
      console.error('Error sending resident pass confirmation emails:', error);
    }

    return NextResponse.json(
      {
        pass,
        confirmationCode: pass.confirmationCode,
        warnings: validationResult.warnings,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating resident pass:', error);
    return NextResponse.json({ error: 'Failed to create pass' }, { status: 500 });
  }
}
