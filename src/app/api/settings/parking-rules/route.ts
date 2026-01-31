import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const parkingRulesSchema = z.object({
  maxVehiclesPerUnit: z.number().min(1).max(10).default(2),
  maxConsecutiveHours: z.number().min(1).max(168).default(24),
  cooldownHours: z.number().min(0).max(48).default(2),
  maxExtensions: z.number().min(0).max(5).default(1),
  extensionMaxHours: z.number().min(1).max(24).default(4),
  requireUnitConfirmation: z.boolean().default(false),
  operatingStartHour: z.number().min(0).max(23).nullable().optional(),
  operatingEndHour: z.number().min(0).max(23).nullable().optional(),
  allowedDurations: z.array(z.number()).default([2, 4, 8, 12, 24]),
  gracePeriodMinutes: z.number().min(0).max(60).default(15),
  allowEmergencyOverride: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get('buildingId');

    if (!buildingId) {
      return NextResponse.json({ error: 'Building ID is required' }, { status: 400 });
    }

    const parkingRules = await prisma.parkingRule.findUnique({
      where: { buildingId },
    });

    return NextResponse.json({ parkingRules });
  } catch (error) {
    console.error('Error fetching parking rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch parking rules' },
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
    const buildingId = searchParams.get('buildingId');

    if (!buildingId) {
      return NextResponse.json({ error: 'Building ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = parkingRulesSchema.partial().parse(body);

    // Filter out undefined values for Prisma compatibility
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(validatedData)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    const existing = await prisma.parkingRule.findUnique({
      where: { buildingId },
    });

    let parkingRules;
    if (existing) {
      parkingRules = await prisma.parkingRule.update({
        where: { buildingId },
        data: updateData,
      });
    } else {
      parkingRules = await prisma.parkingRule.create({
        data: {
          buildingId,
          ...updateData,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        action: 'SETTING_CHANGE',
        entityType: 'ParkingRule',
        entityId: parkingRules.id,
        userId: session.user.id,
        details: JSON.parse(JSON.stringify({ buildingId, changes: updateData })),
      },
    });

    return NextResponse.json(parkingRules);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }
    console.error('Error updating parking rules:', error);
    return NextResponse.json(
      { error: 'Failed to update parking rules' },
      { status: 500 }
    );
  }
}
