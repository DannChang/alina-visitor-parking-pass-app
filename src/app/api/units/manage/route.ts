import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const unitSchema = z.object({
  unitNumber: z.string().min(1, 'Unit number is required'),
  floor: z.number().nullable().optional(),
  section: z.string().nullable().optional(),
  primaryPhone: z.string().nullable().optional(),
  primaryEmail: z.string().email().nullable().optional().or(z.literal('')),
  buildingId: z.string().min(1, 'Building is required'),
  isOccupied: z.boolean().optional().default(true),
  isActive: z.boolean().optional().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get('buildingId');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (buildingId && buildingId !== 'all') {
      where.buildingId = buildingId;
    }

    if (search) {
      where.OR = [
        { unitNumber: { contains: search, mode: 'insensitive' } },
        { section: { contains: search, mode: 'insensitive' } },
        { primaryEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [units, buildings] = await Promise.all([
      prisma.unit.findMany({
        where,
        include: {
          building: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              parkingPasses: true,
              residents: true,
            },
          },
        },
        orderBy: [
          { building: { name: 'asc' } },
          { unitNumber: 'asc' },
        ],
      }),
      prisma.building.findMany({
        where: { deletedAt: null, isActive: true },
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return NextResponse.json({ units, buildings });
  } catch (error) {
    console.error('Error fetching units:', error);
    return NextResponse.json(
      { error: 'Failed to fetch units' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin role
    if (!['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = unitSchema.parse(body);

    // Check for duplicate unit number in the same building
    const existing = await prisma.unit.findUnique({
      where: {
        buildingId_unitNumber: {
          buildingId: validatedData.buildingId,
          unitNumber: validatedData.unitNumber,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A unit with this number already exists in the building' },
        { status: 400 }
      );
    }

    const unit = await prisma.unit.create({
      data: {
        unitNumber: validatedData.unitNumber,
        floor: validatedData.floor ?? null,
        section: validatedData.section ?? null,
        primaryPhone: validatedData.primaryPhone ?? null,
        primaryEmail: validatedData.primaryEmail ?? null,
        buildingId: validatedData.buildingId,
        isOccupied: validatedData.isOccupied ?? true,
        isActive: validatedData.isActive ?? true,
      },
      include: {
        building: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        entityType: 'Unit',
        entityId: unit.id,
        userId: session.user.id,
        details: { unitNumber: unit.unitNumber, buildingId: unit.buildingId },
      },
    });

    return NextResponse.json(unit, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || "Validation error" },
        { status: 400 }
      );
    }
    console.error('Error creating unit:', error);
    return NextResponse.json(
      { error: 'Failed to create unit' },
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
      return NextResponse.json({ error: 'Unit ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = unitSchema.partial().parse(body);

    // Check if unit exists
    const existingUnit = await prisma.unit.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingUnit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    // Check for duplicate if changing unit number
    if (validatedData.unitNumber && validatedData.unitNumber !== existingUnit.unitNumber) {
      const duplicate = await prisma.unit.findUnique({
        where: {
          buildingId_unitNumber: {
            buildingId: validatedData.buildingId || existingUnit.buildingId,
            unitNumber: validatedData.unitNumber,
          },
        },
      });

      if (duplicate && duplicate.id !== id) {
        return NextResponse.json(
          { error: 'A unit with this number already exists in the building' },
          { status: 400 }
        );
      }
    }

    // Build update data object, filtering out undefined values
    const updateData: Record<string, unknown> = {};
    if (validatedData.unitNumber !== undefined) updateData.unitNumber = validatedData.unitNumber;
    if (validatedData.floor !== undefined) updateData.floor = validatedData.floor;
    if (validatedData.section !== undefined) updateData.section = validatedData.section;
    if (validatedData.primaryPhone !== undefined) updateData.primaryPhone = validatedData.primaryPhone;
    if (validatedData.primaryEmail !== undefined) updateData.primaryEmail = validatedData.primaryEmail || null;
    if (validatedData.buildingId !== undefined) updateData.buildingId = validatedData.buildingId;
    if (validatedData.isOccupied !== undefined) updateData.isOccupied = validatedData.isOccupied;
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;

    const unit = await prisma.unit.update({
      where: { id },
      data: updateData,
      include: {
        building: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'Unit',
        entityId: unit.id,
        userId: session.user.id,
        details: JSON.parse(JSON.stringify({ changes: updateData })),
      },
    });

    return NextResponse.json(unit);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || "Validation error" },
        { status: 400 }
      );
    }
    console.error('Error updating unit:', error);
    return NextResponse.json(
      { error: 'Failed to update unit' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
      return NextResponse.json({ error: 'Unit ID is required' }, { status: 400 });
    }

    const unit = await prisma.unit.findUnique({
      where: { id, deletedAt: null },
    });

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    // Soft delete
    await prisma.unit.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        entityType: 'Unit',
        entityId: id,
        userId: session.user.id,
        details: { unitNumber: unit.unitNumber },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting unit:', error);
    return NextResponse.json(
      { error: 'Failed to delete unit' },
      { status: 500 }
    );
  }
}
