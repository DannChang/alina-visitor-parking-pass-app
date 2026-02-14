import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/passes/[id]/reactivate - Reactivate unexpired pass
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const pass = await prisma.parkingPass.findUnique({
      where: { id },
    });

    if (!pass) {
      return NextResponse.json({ error: 'Pass not found' }, { status: 404 });
    }

    const now = new Date();
    if (now > pass.endTime) {
      return NextResponse.json(
        { error: 'Pass has expired and cannot be reactivated' },
        { status: 400 }
      );
    }

    if (pass.status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'Pass is already active' },
        { status: 400 }
      );
    }

    if (pass.status === 'CANCELLED' || pass.status === 'SUSPENDED') {
      return NextResponse.json(
        { error: `Cannot reactivate a ${pass.status.toLowerCase()} pass` },
        { status: 400 }
      );
    }

    const updatedPass = await prisma.parkingPass.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        reactivatedAt: now,
        lastEntryTime: now,
      },
    });

    return NextResponse.json({
      pass: updatedPass,
      reactivatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('Reactivation error:', error);
    return NextResponse.json({ error: 'Failed to reactivate pass' }, { status: 500 });
  }
}
