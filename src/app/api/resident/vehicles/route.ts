import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { normalizeLicensePlate } from '@/lib/utils/license-plate';

const createVehicleSchema = z.object({
  licensePlate: z.string().min(2).max(10),
  make: z.string().max(50).optional(),
  model: z.string().max(50).optional(),
  color: z.string().max(30).optional(),
});

// GET /api/resident/vehicles - List resident's vehicles
export async function GET() {
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
    const vehicles = await prisma.vehicle.findMany({
      where: {
        residentId,
        deletedAt: null,
      },
      select: {
        id: true,
        licensePlate: true,
        normalizedPlate: true,
        make: true,
        model: true,
        color: true,
        state: true,
        isResidentVehicle: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ vehicles });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
  }
}

// POST /api/resident/vehicles - Register a resident vehicle
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
    const parsed = createVehicleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const normalizedPlate = normalizeLicensePlate(data.licensePlate);

    // Check if vehicle already exists
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { normalizedPlate },
    });

    if (existingVehicle) {
      // If the vehicle exists but is not yet assigned to a resident, claim it
      if (!existingVehicle.residentId) {
        const vehicle = await prisma.vehicle.update({
          where: { id: existingVehicle.id },
          data: {
            residentId,
            isResidentVehicle: true,
            make: data.make ?? existingVehicle.make,
            model: data.model ?? existingVehicle.model,
            color: data.color ?? existingVehicle.color,
          },
        });
        return NextResponse.json({ vehicle }, { status: 200 });
      }

      if (existingVehicle.residentId === residentId) {
        return NextResponse.json(
          { error: 'Vehicle is already registered to you' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Vehicle is already registered to another resident' },
        { status: 409 }
      );
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        licensePlate: data.licensePlate.toUpperCase(),
        normalizedPlate,
        make: data.make ?? null,
        model: data.model ?? null,
        color: data.color ?? null,
        isResidentVehicle: true,
        residentId,
      },
    });

    return NextResponse.json({ vehicle }, { status: 201 });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json({ error: 'Failed to create vehicle' }, { status: 500 });
  }
}

// DELETE /api/resident/vehicles - Remove a vehicle from resident
export async function DELETE(request: NextRequest) {
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
  const vehicleId = searchParams.get('vehicleId');

  if (!vehicleId) {
    return NextResponse.json({ error: 'vehicleId is required' }, { status: 400 });
  }

  try {
    // Verify the vehicle belongs to the resident
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    if (vehicle.residentId !== residentId) {
      return NextResponse.json({ error: 'Vehicle does not belong to you' }, { status: 403 });
    }

    // Disassociate vehicle from resident
    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        residentId: null,
        isResidentVehicle: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing vehicle:', error);
    return NextResponse.json({ error: 'Failed to remove vehicle' }, { status: 500 });
  }
}
