import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import {
  createUnitRegistrationLink,
  ResidentInviteError,
} from '@/services/resident-invite-service';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requirePermission('resident_invites:manage');
    if (!authResult.authorized) {
      return authResult.response;
    }

    const { id } = await params;
    const result = await createUnitRegistrationLink({
      issuerId: authResult.request.userId,
      issuerRole: authResult.request.role,
      unitId: id,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ResidentInviteError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    console.error('Error creating unit registration link:', error);
    return NextResponse.json({ error: 'Failed to create registration link' }, { status: 500 });
  }
}
