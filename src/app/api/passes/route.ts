import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { normalizeLicensePlate } from '@/lib/utils/license-plate';
import { calculateEndTime } from '@/lib/utils/date-time';
import { validatePassRequest } from '@/services/validation-service';
import { PassStatus, PassType } from '@prisma/client';

// Schema for creating a new pass
const createPassSchema = z.object({
  licensePlate: z.string().min(2).max(10),
  unitNumber: z.string().min(1),
  buildingSlug: z.string().min(1),
  duration: z.number().int().min(1).max(24),
  visitorName: z.string().min(1).max(100).optional(),
  visitorPhone: z.string().max(20).optional(),
  visitorEmail: z.string().email().optional(),
  vehicleMake: z.string().max(50).optional(),
  vehicleModel: z.string().max(50).optional(),
  vehicleColor: z.string().max(30).optional(),
  vehicleState: z.string().max(10).optional(),
  passType: z.nativeEnum(PassType).optional(),
  parkingZoneCode: z.string().optional(),
});

// GET /api/passes - List passes (requires auth)
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as PassStatus | null;
  const buildingId = searchParams.get('buildingId');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search');

  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    deletedAt: null,
  };

  if (status) {
    where.status = status;
  }

  if (buildingId) {
    where.unit = { buildingId };
  }

  if (search) {
    where.OR = [
      { vehicle: { normalizedPlate: { contains: normalizeLicensePlate(search) } } },
      { visitorName: { contains: search, mode: 'insensitive' } },
      { confirmationCode: { contains: search } },
    ];
  }

  try {
    const [passes, total] = await Promise.all([
      prisma.parkingPass.findMany({
        where,
        include: {
          vehicle: {
            select: {
              id: true,
              licensePlate: true,
              make: true,
              model: true,
              color: true,
              isBlacklisted: true,
              violationCount: true,
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
          parkingZone: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
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
    console.error('Error fetching passes:', error);
    return NextResponse.json({ error: 'Failed to fetch passes' }, { status: 500 });
  }
}

// POST /api/passes - Create a new pass (public endpoint for visitor registration)
export async function POST(request: NextRequest) {
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

    // Find the building
    const building = await prisma.building.findUnique({
      where: { slug: data.buildingSlug, isActive: true, deletedAt: null },
      include: { parkingRules: true },
    });

    if (!building) {
      return NextResponse.json({ error: 'Building not found' }, { status: 404 });
    }

    // Find the unit
    const unit = await prisma.unit.findFirst({
      where: {
        buildingId: building.id,
        unitNumber: data.unitNumber,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    // Find parking zone if specified
    let parkingZone = null;
    if (data.parkingZoneCode) {
      parkingZone = await prisma.parkingZone.findFirst({
        where: {
          buildingId: building.id,
          code: data.parkingZoneCode,
          isActive: true,
          deletedAt: null,
        },
      });
    }

    // Validate the pass request using business rules
    const validationResult = await validatePassRequest({
      licensePlate: normalizedPlate,
      unitId: unit.id,
      buildingId: building.id,
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
          make: data.vehicleMake ?? null,
          model: data.vehicleModel ?? null,
          color: data.vehicleColor ?? null,
          state: data.vehicleState ?? null,
        },
      });
    } else if (data.vehicleMake || data.vehicleModel || data.vehicleColor) {
      // Update vehicle details if provided
      vehicle = await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: {
          make: data.vehicleMake ?? vehicle.make,
          model: data.vehicleModel ?? vehicle.model,
          color: data.vehicleColor ?? vehicle.color,
          state: data.vehicleState ?? vehicle.state,
        },
      });
    }

    // Calculate timing
    const startTime = new Date();
    const endTime = calculateEndTime(startTime, data.duration);

    // Get IP address and user agent
    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      null;
    const userAgent = request.headers.get('user-agent') || null;

    // Create the parking pass
    const pass = await prisma.parkingPass.create({
      data: {
        vehicleId: vehicle.id,
        unitId: unit.id,
        parkingZoneId: parkingZone?.id ?? null,
        startTime,
        endTime,
        originalEndTime: endTime,
        duration: data.duration,
        status: PassStatus.ACTIVE,
        passType: data.passType ?? PassType.VISITOR,
        visitorName: data.visitorName ?? null,
        visitorPhone: data.visitorPhone ?? null,
        visitorEmail: data.visitorEmail ?? null,
        registeredVia: 'WEB_FORM',
        ipAddress,
        userAgent,
      },
      include: {
        vehicle: true,
        unit: {
          include: {
            building: true,
          },
        },
        parkingZone: true,
      },
    });

    // Log the QR scan if applicable
    if (parkingZone) {
      await prisma.qRCodeScan.create({
        data: {
          parkingZoneId: parkingZone.id,
          buildingId: building.id,
          resultedInPass: true,
          passId: pass.id,
          ipAddress,
          userAgent,
        },
      });
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
    console.error('Error creating pass:', error);
    return NextResponse.json({ error: 'Failed to create pass' }, { status: 500 });
  }
}
