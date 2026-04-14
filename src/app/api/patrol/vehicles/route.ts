import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-auth';
import { normalizeLicensePlate, validateLicensePlate } from '@/lib/utils/license-plate';

const createPatrolVehicleSchema = z.object({
  licensePlate: z.string().min(1).max(20),
  make: z.string().trim().max(50).optional(),
  model: z.string().trim().max(50).optional(),
  color: z.string().trim().max(30).optional(),
  state: z.string().trim().max(30).optional(),
  year: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1)
    .optional(),
});

// POST /api/patrol/vehicles - Manually add a vehicle record from patrol mode
export async function POST(request: NextRequest) {
  const authResult = await requirePermission('passes:view_all');
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const parsed = createPatrolVehicleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const normalizedPlate = normalizeLicensePlate(data.licensePlate);
    const validation = validateLicensePlate(normalizedPlate);

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error ?? 'Invalid license plate format' },
        { status: 400 }
      );
    }

    const existingVehicle = await prisma.vehicle.findUnique({
      where: { normalizedPlate },
    });

    if (existingVehicle && existingVehicle.deletedAt === null) {
      return NextResponse.json({
        created: false,
        restored: false,
        vehicle: existingVehicle,
      });
    }

    if (existingVehicle) {
      const restoredVehicle = await prisma.vehicle.update({
        where: { id: existingVehicle.id },
        data: {
          licensePlate: data.licensePlate.trim().toUpperCase(),
          normalizedPlate,
          make: data.make?.trim() || existingVehicle.make,
          model: data.model?.trim() || existingVehicle.model,
          color: data.color?.trim() || existingVehicle.color,
          state: data.state?.trim() || existingVehicle.state,
          year: data.year ?? existingVehicle.year,
          deletedAt: null,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'Vehicle',
          entityId: restoredVehicle.id,
          userId: authResult.request.userId,
          details: {
            action: 'patrol_add_vehicle',
            licensePlate: restoredVehicle.licensePlate,
            restored: true,
          },
        },
      });

      return NextResponse.json({
        created: false,
        restored: true,
        vehicle: restoredVehicle,
      });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        licensePlate: data.licensePlate.trim().toUpperCase(),
        normalizedPlate,
        make: data.make?.trim() || null,
        model: data.model?.trim() || null,
        color: data.color?.trim() || null,
        state: data.state?.trim() || null,
        year: data.year ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'Vehicle',
        entityId: vehicle.id,
        userId: authResult.request.userId,
        details: {
          action: 'patrol_add_vehicle',
          licensePlate: vehicle.licensePlate,
          created: true,
        },
      },
    });

    return NextResponse.json(
      {
        created: true,
        restored: false,
        vehicle,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating patrol vehicle:', error);
    return NextResponse.json({ error: 'Failed to add vehicle from patrol mode' }, { status: 500 });
  }
}
