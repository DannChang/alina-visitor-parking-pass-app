import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/passes/[id]/entry - Record vehicle re-entry
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { confirmationCode } = body;

    if (!confirmationCode) {
      return NextResponse.json(
        { error: 'Confirmation code required' },
        { status: 401 }
      );
    }

    const pass = await prisma.parkingPass.findUnique({
      where: { id },
    });

    if (!pass) {
      return NextResponse.json({ error: 'Pass not found' }, { status: 404 });
    }

    // Verify confirmation code matches this pass
    if (pass.confirmationCode !== confirmationCode) {
      return NextResponse.json(
        { error: 'Invalid confirmation code' },
        { status: 403 }
      );
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
