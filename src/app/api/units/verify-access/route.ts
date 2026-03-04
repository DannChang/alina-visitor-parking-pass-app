import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const verifySchema = z.object({
  unitId: z.string().min(1),
  accessCode: z.string().min(1),
});

// POST /api/units/verify-access - Verify unit access code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', verified: false },
        { status: 400 }
      );
    }

    const unit = await prisma.unit.findUnique({
      where: { id: parsed.data.unitId },
      select: { accessCodeHash: true },
    });

    if (!unit || !unit.accessCodeHash) {
      return NextResponse.json({ verified: false });
    }

    const isValid = await bcrypt.compare(parsed.data.accessCode, unit.accessCodeHash);

    return NextResponse.json({ verified: isValid });
  } catch (error) {
    console.error('Access code verification error:', error);
    return NextResponse.json({ error: 'Verification failed', verified: false }, { status: 500 });
  }
}
