import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const buildingSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  address: z.string().min(1),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  emergencyPhone: z.string().nullable().optional(),
  timezone: z.string().default('America/New_York'),
  isActive: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const [building, parkingRules] = await Promise.all([
        prisma.building.findUnique({
          where: { id, deletedAt: null },
        }),
        prisma.parkingRule.findUnique({
          where: { buildingId: id },
        }),
      ]);

      if (!building) {
        return NextResponse.json({ error: 'Building not found' }, { status: 404 });
      }

      return NextResponse.json({ building, parkingRules });
    }

    const buildings = await prisma.building.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ buildings });
  } catch (error) {
    console.error('Error fetching buildings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch buildings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Building ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = buildingSchema.partial().parse(body);

    // Filter out undefined values for Prisma compatibility
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(validatedData)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    const building = await prisma.building.update({
      where: { id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        action: 'SETTING_CHANGE',
        entityType: 'Building',
        entityId: id,
        userId: session.user.id,
        details: JSON.parse(JSON.stringify(updateData)),
      },
    });

    return NextResponse.json(building);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }
    console.error('Error updating building:', error);
    return NextResponse.json(
      { error: 'Failed to update building' },
      { status: 500 }
    );
  }
}
