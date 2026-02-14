import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { checkAutoExtensionEligibility } from '@/services/validation-service';

const autoExtendSchema = z.object({
  passId: z.string().min(1),
});

// POST /api/passes/auto-extend - Apply auto-extension to a pass
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = autoExtendSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const eligibility = await checkAutoExtensionEligibility(parsed.data.passId);

    if (!eligibility.eligible) {
      return NextResponse.json(
        { error: eligibility.reason, eligible: false },
        { status: 400 }
      );
    }

    const pass = await prisma.parkingPass.findUnique({
      where: { id: parsed.data.passId },
    });

    if (!pass) {
      return NextResponse.json({ error: 'Pass not found' }, { status: 404 });
    }

    const newEndTime = new Date(
      Date.now() + (eligibility.extensionHours ?? 25) * 60 * 60 * 1000
    );

    const updatedPass = await prisma.parkingPass.update({
      where: { id: parsed.data.passId },
      data: {
        endTime: newEndTime,
        extensionCount: { increment: 1 },
        lastExtendedAt: new Date(),
        status: 'EXTENDED',
      },
    });

    return NextResponse.json({
      pass: updatedPass,
      extended: true,
      newEndTime: newEndTime.toISOString(),
    });
  } catch (error) {
    console.error('Auto-extend error:', error);
    return NextResponse.json({ error: 'Failed to extend pass' }, { status: 500 });
  }
}
