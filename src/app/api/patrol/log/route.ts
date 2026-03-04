import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-auth';
import { normalizeLicensePlate } from '@/lib/utils/license-plate';
import { PatrolEntryType } from '@prisma/client';

const createLogEntrySchema = z.object({
  licensePlate: z.string().min(2).max(10),
  entryType: z.nativeEnum(PatrolEntryType),
  location: z.string().optional(),
  notes: z.string().optional(),
  photoUrls: z.array(z.string()).optional(),
  buildingId: z.string().optional(),
});

// GET /api/patrol/log - List patrol log entries
export async function GET(request: NextRequest) {
  const authResult = await requirePermission('passes:view_all');
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const entryType = searchParams.get('entryType') as PatrolEntryType | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (entryType) {
      where.entryType = entryType;
    }

    if (startDate || endDate) {
      const createdAt: Record<string, Date> = {};
      if (startDate) {
        createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        createdAt.lte = new Date(endDate);
      }
      where.createdAt = createdAt;
    }

    const [entries, total] = await Promise.all([
      prisma.patrolLogEntry.findMany({
        where,
        include: {
          patroller: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.patrolLogEntry.count({ where }),
    ]);

    return NextResponse.json({
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching patrol log entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patrol log entries' },
      { status: 500 }
    );
  }
}

// POST /api/patrol/log - Create a new patrol log entry
export async function POST(request: NextRequest) {
  const authResult = await requirePermission('passes:view_all');
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const body = await request.json();
    const parsed = createLogEntrySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const normalizedPlate = normalizeLicensePlate(data.licensePlate);

    // Look up vehicle by normalized plate (optional - don't fail if not found)
    const vehicle = await prisma.vehicle.findUnique({
      where: { normalizedPlate },
    });

    const entry = await prisma.patrolLogEntry.create({
      data: {
        licensePlate: data.licensePlate.toUpperCase(),
        normalizedPlate,
        entryType: data.entryType,
        location: data.location ?? null,
        notes: data.notes ?? null,
        photoUrls: data.photoUrls ?? [],
        buildingId: data.buildingId ?? null,
        vehicleId: vehicle?.id ?? null,
        patrollerId: authResult.request.userId,
      },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error('Error creating patrol log entry:', error);
    return NextResponse.json(
      { error: 'Failed to create patrol log entry' },
      { status: 500 }
    );
  }
}
