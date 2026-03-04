import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { PassStatus } from '@prisma/client';

// DELETE /api/resident/passes/[id] - Cancel a pass (soft delete)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const residentId = (session as unknown as Record<string, string>).residentId;
  const unitId = (session as unknown as Record<string, string>).unitId;
  if (!residentId || !unitId) {
    return NextResponse.json({ error: 'Not a resident session' }, { status: 403 });
  }

  const { id } = await params;

  try {
    // Verify the pass exists and belongs to the resident's unit
    const pass = await prisma.parkingPass.findUnique({
      where: { id, deletedAt: null },
    });

    if (!pass) {
      return NextResponse.json({ error: 'Pass not found' }, { status: 404 });
    }

    if (pass.unitId !== unitId) {
      return NextResponse.json({ error: 'Pass does not belong to your unit' }, { status: 403 });
    }

    // Soft delete: set deletedAt and status to CANCELLED
    await prisma.parkingPass.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: residentId,
        deletionReason: 'Cancelled by resident',
        status: PassStatus.CANCELLED,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling pass:', error);
    return NextResponse.json({ error: 'Failed to cancel pass' }, { status: 500 });
  }
}
