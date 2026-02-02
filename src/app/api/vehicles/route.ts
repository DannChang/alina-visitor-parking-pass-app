import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-auth';
import { normalizeLicensePlate } from '@/lib/utils/license-plate';

const updateVehicleSchema = z.object({
  isBlacklisted: z.boolean().optional(),
  blacklistReason: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  state: z.string().optional(),
});

// GET /api/vehicles - Search vehicles (requires vehicles:view permission)
export async function GET(request: NextRequest) {
  const authResult = await requirePermission('vehicles:view');
  if (!authResult.authorized) {
    return authResult.response;
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const blacklisted = searchParams.get('blacklisted');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    deletedAt: null,
  };

  if (search) {
    const normalizedSearch = normalizeLicensePlate(search);
    where.normalizedPlate = { contains: normalizedSearch };
  }

  if (blacklisted === 'true') {
    where.isBlacklisted = true;
  } else if (blacklisted === 'false') {
    where.isBlacklisted = false;
  }

  try {
    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        include: {
          _count: {
            select: {
              parkingPasses: true,
              violations: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.vehicle.count({ where }),
    ]);

    return NextResponse.json({
      vehicles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
  }
}

// PATCH /api/vehicles - Update a vehicle (requires vehicles:blacklist permission for blacklisting)
export async function PATCH(request: NextRequest) {
  const authResult = await requirePermission('vehicles:blacklist');
  if (!authResult.authorized) {
    return authResult.response;
  }

  const { userId } = authResult.request;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Vehicle ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateVehicleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existingVehicle = await prisma.vehicle.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingVehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.data.isBlacklisted !== undefined) {
      updateData.isBlacklisted = parsed.data.isBlacklisted;
      if (parsed.data.isBlacklisted) {
        updateData.blacklistedAt = new Date();
        updateData.blacklistedBy = userId;
        updateData.blacklistReason = parsed.data.blacklistReason || 'Blacklisted by administrator';
      } else {
        updateData.blacklistedAt = null;
        updateData.blacklistedBy = null;
        updateData.blacklistReason = null;
      }
    }

    if (parsed.data.make !== undefined) updateData.make = parsed.data.make;
    if (parsed.data.model !== undefined) updateData.model = parsed.data.model;
    if (parsed.data.color !== undefined) updateData.color = parsed.data.color;
    if (parsed.data.state !== undefined) updateData.state = parsed.data.state;

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: updateData,
    });

    // Create audit log for blacklist actions
    if (parsed.data.isBlacklisted !== undefined) {
      await prisma.auditLog.create({
        data: {
          action: 'BLACKLIST_VEHICLE',
          entityType: 'Vehicle',
          entityId: id,
          userId: userId,
          details: {
            isBlacklisted: parsed.data.isBlacklisted,
            reason: parsed.data.blacklistReason,
          },
        },
      });
    }

    return NextResponse.json({ vehicle });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    return NextResponse.json({ error: 'Failed to update vehicle' }, { status: 500 });
  }
}
