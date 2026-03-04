import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-auth';
import { EscalationLevel } from '@prisma/client';

const escalateSchema = z.object({
  level: z.nativeEnum(EscalationLevel),
  notes: z.string().optional(),
});

const ESCALATION_ORDER: EscalationLevel[] = [
  EscalationLevel.NONE,
  EscalationLevel.WARNING,
  EscalationLevel.FORMAL_LETTER,
  EscalationLevel.TOW_NOTICE,
];

function getEscalationRank(level: EscalationLevel): number {
  return ESCALATION_ORDER.indexOf(level);
}

// POST /api/violations/[id]/escalate - Escalate a violation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requirePermission('violations:update');
  if (!authResult.authorized) {
    return authResult.response;
  }

  const { userId } = authResult.request;
  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = escalateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { level, notes } = parsed.data;

    // Fetch the existing violation
    const violation = await prisma.violation.findUnique({
      where: { id, deletedAt: null },
    });

    if (!violation) {
      return NextResponse.json(
        { error: 'Violation not found' },
        { status: 404 }
      );
    }

    // Validate that the new level is higher than the current level
    const currentRank = getEscalationRank(violation.escalationLevel);
    const newRank = getEscalationRank(level);

    if (newRank <= currentRank) {
      return NextResponse.json(
        {
          error: 'Cannot escalate to the same or lower level',
          currentLevel: violation.escalationLevel,
          requestedLevel: level,
        },
        { status: 400 }
      );
    }

    // Build the update data with the corresponding timestamp
    const now = new Date();
    const updateData: Record<string, unknown> = {
      escalationLevel: level,
    };

    if (level === EscalationLevel.WARNING) {
      updateData.warningIssuedAt = now;
    } else if (level === EscalationLevel.FORMAL_LETTER) {
      updateData.formalLetterIssuedAt = now;
    } else if (level === EscalationLevel.TOW_NOTICE) {
      updateData.towNoticeIssuedAt = now;
    }

    // Update the violation
    const updatedViolation = await prisma.violation.update({
      where: { id },
      data: updateData,
      include: {
        vehicle: {
          select: {
            id: true,
            licensePlate: true,
            make: true,
            model: true,
            color: true,
            isBlacklisted: true,
          },
        },
        loggedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'Violation',
        entityId: id,
        userId: userId,
        details: {
          action: 'escalation',
          previousLevel: violation.escalationLevel,
          newLevel: level,
          notes: notes ?? null,
        },
      },
    });

    return NextResponse.json({ violation: updatedViolation });
  } catch (error) {
    console.error('Error escalating violation:', error);
    return NextResponse.json(
      { error: 'Failed to escalate violation' },
      { status: 500 }
    );
  }
}
