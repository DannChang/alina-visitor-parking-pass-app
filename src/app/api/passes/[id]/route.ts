import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { PassStatus } from '@prisma/client';

const updatePassSchema = z.object({
  status: z.nativeEnum(PassStatus).optional(),
  visitorName: z.string().optional(),
  visitorPhone: z.string().optional(),
  visitorEmail: z.string().email().optional(),
  deletionReason: z.string().optional(),
});

// GET /api/passes/[id] - Get a single pass
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const pass = await prisma.parkingPass.findUnique({
      where: { id, deletedAt: null },
      include: {
        vehicle: {
          select: {
            id: true,
            licensePlate: true,
            make: true,
            model: true,
            color: true,
            state: true,
            isBlacklisted: true,
            violationCount: true,
            riskScore: true,
          },
        },
        unit: {
          select: {
            id: true,
            unitNumber: true,
            floor: true,
            section: true,
            building: {
              select: {
                id: true,
                name: true,
                slug: true,
                address: true,
                timezone: true,
              },
            },
          },
        },
        parkingZone: {
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
          },
        },
      },
    });

    if (!pass) {
      return NextResponse.json({ error: 'Pass not found' }, { status: 404 });
    }

    // Increment view count
    await prisma.parkingPass.update({
      where: { id },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
    });

    return NextResponse.json({ pass });
  } catch (error) {
    console.error('Error fetching pass:', error);
    return NextResponse.json({ error: 'Failed to fetch pass' }, { status: 500 });
  }
}

// PATCH /api/passes/[id] - Update a pass (requires auth)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = updatePassSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existingPass = await prisma.parkingPass.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingPass) {
      return NextResponse.json({ error: 'Pass not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.data.status) {
      updateData.status = parsed.data.status;
    }
    if (parsed.data.visitorName !== undefined) {
      updateData.visitorName = parsed.data.visitorName;
    }
    if (parsed.data.visitorPhone !== undefined) {
      updateData.visitorPhone = parsed.data.visitorPhone;
    }
    if (parsed.data.visitorEmail !== undefined) {
      updateData.visitorEmail = parsed.data.visitorEmail;
    }

    const pass = await prisma.parkingPass.update({
      where: { id },
      data: updateData,
      include: {
        vehicle: true,
        unit: {
          include: { building: true },
        },
        parkingZone: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'ParkingPass',
        entityId: id,
        userId: session.user.id,
        details: { changes: parsed.data },
      },
    });

    return NextResponse.json({ pass });
  } catch (error) {
    console.error('Error updating pass:', error);
    return NextResponse.json({ error: 'Failed to update pass' }, { status: 500 });
  }
}

// DELETE /api/passes/[id] - Soft delete a pass (requires auth)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { searchParams } = new URL(request.url);
    const reason = searchParams.get('reason') || 'Deleted by administrator';

    const existingPass = await prisma.parkingPass.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingPass) {
      return NextResponse.json({ error: 'Pass not found' }, { status: 404 });
    }

    await prisma.parkingPass.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: session.user.id,
        deletionReason: reason,
        status: PassStatus.CANCELLED,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        entityType: 'ParkingPass',
        entityId: id,
        userId: session.user.id,
        details: { reason },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pass:', error);
    return NextResponse.json({ error: 'Failed to delete pass' }, { status: 500 });
  }
}
