import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/passes/[id]/entry - Record vehicle re-entry
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

    if (!pass.isInOutEnabled) {
      return NextResponse.json(
        { error: 'In-out privileges are not enabled for this pass' },
        { status: 400 }
      );
    }

    const now = new Date();
    if (now > pass.endTime) {
      return NextResponse.json(
        { error: 'Pass has expired' },
        { status: 400 }
      );
    }

    const updatedPass = await prisma.parkingPass.update({
      where: { id },
      data: { lastEntryTime: now },
    });

    return NextResponse.json({
      pass: updatedPass,
      entryTime: now.toISOString(),
    });
  } catch (error) {
    console.error('Entry recording error:', error);
    return NextResponse.json({ error: 'Failed to record entry' }, { status: 500 });
  }
}
