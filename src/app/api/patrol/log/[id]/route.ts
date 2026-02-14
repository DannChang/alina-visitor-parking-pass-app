import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/api-auth';

const updateLogEntrySchema = z.object({
  notes: z.string().optional(),
  location: z.string().optional(),
});

// PATCH /api/patrol/log/[id] - Update a patrol log entry
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requirePermission('passes:view_all');
  if (!authResult.authorized) {
    return authResult.response;
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = updateLogEntrySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existingEntry = await prisma.patrolLogEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Patrol log entry not found' },
        { status: 404 }
      );
    }

    const entry = await prisma.patrolLogEntry.update({
      where: { id },
      data: {
        ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
        ...(parsed.data.location !== undefined && { location: parsed.data.location }),
      },
    });

    return NextResponse.json({ entry });
  } catch (error) {
    console.error('Error updating patrol log entry:', error);
    return NextResponse.json(
      { error: 'Failed to update patrol log entry' },
      { status: 500 }
    );
  }
}

// DELETE /api/patrol/log/[id] - Delete a patrol log entry
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requirePermission('passes:view_all');
  if (!authResult.authorized) {
    return authResult.response;
  }

  const { id } = await params;

  try {
    const existingEntry = await prisma.patrolLogEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Patrol log entry not found' },
        { status: 404 }
      );
    }

    await prisma.patrolLogEntry.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting patrol log entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete patrol log entry' },
      { status: 500 }
    );
  }
}
