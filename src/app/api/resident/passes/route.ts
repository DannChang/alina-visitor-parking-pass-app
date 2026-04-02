import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { parkingPassDetailsSelect, parkingPassListSelect } from '@/lib/prisma/parking-pass-selects';
import { normalizeLicensePlate } from '@/lib/utils/license-plate';
import { calculateEndTime } from '@/lib/utils/date-time';
import { validatePassRequest } from '@/services/validation-service';
import { PassStatus, PassType } from '@prisma/client';

const createPassSchema = z.object({
  licensePlate: z.string().min(2).max(10),
  duration: z.number().int().min(1).max(24),
  visitorName: z.string().min(1).max(100),
  visitorPhone: z.string().max(20).optional(),
  vehicleMake: z.string().trim().min(1).max(50),
  vehicleModel: z.string().trim().min(1).max(50),
  vehicleYear: z.number().int().min(1900).max(new Date().getFullYear() + 1),
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
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  try {
    const where: Record<string, unknown> = {
      unitId,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    const [passes, total] = await Promise.all([
      prisma.parkingPass.findMany({
        where,
        select: parkingPassListSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.parkingPass.count({ where }),
    ]);

    return NextResponse.json({
      passes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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
    let vehicle = await prisma.vehicle.findUnique({
      where: { normalizedPlate },
    });

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
        isRecurring: false,
        recurringDays: [],
        visitorName: data.visitorName,
        visitorPhone: data.visitorPhone ?? null,
        registeredVia: 'RESIDENT_PORTAL',
        createdByResidentId: residentId,
      },
      select: parkingPassDetailsSelect,
    });

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
