import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import {
  reissueResidentInvite,
  ResidentInviteError,
} from '@/services/resident-invite-service';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requirePermission('resident_invites:manage');
    if (!authResult.authorized) {
      return authResult.response;
    }

    const { id } = await params;
    const result = await reissueResidentInvite({
      issuerId: authResult.request.userId,
      issuerRole: authResult.request.role,
      inviteId: id,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ResidentInviteError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    console.error('Error reissuing resident invite:', error);
    return NextResponse.json(
      { error: 'Failed to reissue registration pass' },
      { status: 500 }
    );
  }
}
