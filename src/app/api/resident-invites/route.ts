import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/api-auth';
import {
  createResidentInvite,
  listResidentInvites,
  ResidentInviteError,
} from '@/services/resident-invite-service';

const createResidentInviteSchema = z.object({
  buildingId: z.string().min(1, 'Building is required'),
  unitId: z.string().min(1, 'Unit is required'),
  recipientName: z.string().min(1, 'Resident name is required').max(100),
  recipientEmail: z.string().email('A valid email is required'),
  recipientPhone: z.string().max(20).optional(),
});

const statusSchema = z.enum(['PENDING', 'EXPIRED', 'REVOKED', 'CONSUMED']);

export async function GET(request: NextRequest) {
  try {
    const authResult = await requirePermission('resident_invites:manage');
    if (!authResult.authorized) {
      return authResult.response;
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const buildingId = searchParams.get('buildingId');
    const statusValue = searchParams.get('status');
    const parsedStatus = statusValue ? statusSchema.safeParse(statusValue) : null;

    if (statusValue && !parsedStatus?.success) {
      return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
    }

    const result = await listResidentInvites({
      userId: authResult.request.userId,
      role: authResult.request.role,
      search,
      buildingId,
      status: parsedStatus?.success ? parsedStatus.data : null,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ResidentInviteError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    console.error('Error listing resident invites:', error);
    return NextResponse.json(
      { error: 'Failed to load registration passes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requirePermission('resident_invites:manage');
    if (!authResult.authorized) {
      return authResult.response;
    }

    const body = await request.json();
    const data = createResidentInviteSchema.parse(body);

    const result = await createResidentInvite({
      issuerId: authResult.request.userId,
      issuerRole: authResult.request.role,
      buildingId: data.buildingId,
      unitId: data.unitId,
      recipientName: data.recipientName,
      recipientEmail: data.recipientEmail,
      recipientPhone: data.recipientPhone,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    if (error instanceof ResidentInviteError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    console.error('Error creating resident invite:', error);
    return NextResponse.json(
      { error: 'Failed to create registration pass' },
      { status: 500 }
    );
  }
}
