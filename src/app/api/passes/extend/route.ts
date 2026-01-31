import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { validatePassExtension } from '@/services/validation-service';
import { PassStatus } from '@prisma/client';

const extendPassSchema = z.object({
  passId: z.string().min(1),
  additionalHours: z.number().int().min(1).max(4),
});

// POST /api/passes/extend - Extend an existing pass
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = extendPassSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { passId, additionalHours } = parsed.data;

    // Find the pass
    const pass = await prisma.parkingPass.findUnique({
      where: { id: passId, deletedAt: null },
      include: {
        unit: {
          include: { building: { include: { parkingRules: true } } },
        },
        vehicle: true,
      },
    });

    if (!pass) {
      return NextResponse.json({ error: 'Pass not found' }, { status: 404 });
    }

    // Validate the extension
    const validationResult = await validatePassExtension(passId, additionalHours);

    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          error: 'Extension validation failed',
          errors: validationResult.errors,
          warnings: validationResult.warnings,
        },
        { status: 400 }
      );
    }

    // Calculate new end time
    const newEndTime = new Date(pass.endTime.getTime() + additionalHours * 60 * 60 * 1000);

    // Update the pass
    const updatedPass = await prisma.parkingPass.update({
      where: { id: passId },
      data: {
        endTime: newEndTime,
        extensionCount: { increment: 1 },
        lastExtendedAt: new Date(),
        status: PassStatus.EXTENDED,
      },
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
        action: 'EXTEND_PASS',
        entityType: 'ParkingPass',
        entityId: passId,
        details: {
          previousEndTime: pass.endTime.toISOString(),
          newEndTime: newEndTime.toISOString(),
          additionalHours,
          extensionCount: updatedPass.extensionCount,
        },
      },
    });

    return NextResponse.json({
      pass: updatedPass,
      previousEndTime: pass.endTime,
      newEndTime,
      warnings: validationResult.warnings,
    });
  } catch (error) {
    console.error('Error extending pass:', error);
    return NextResponse.json({ error: 'Failed to extend pass' }, { status: 500 });
  }
}
