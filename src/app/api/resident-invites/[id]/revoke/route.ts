import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/api-auth';
import {
  revokeResidentInvite,
  ResidentInviteError,
} from '@/services/resident-invite-service';

const revokeSchema = z.object({
  reason: z.string().min(3, 'A revoke reason is required').max(500),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission('resident_invites:manage');
    if (!authResult.authorized) {
      return authResult.response;
    }

    const { id } = await params;
    const body = await request.json();
    const data = revokeSchema.parse(body);

    const invite = await revokeResidentInvite({
      issuerId: authResult.request.userId,
      issuerRole: authResult.request.role,
      inviteId: id,
      reason: data.reason,
    });

    return NextResponse.json({ invite });
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

    console.error('Error revoking resident invite:', error);
    return NextResponse.json(
      { error: 'Failed to revoke registration pass' },
      { status: 500 }
    );
  }
}
