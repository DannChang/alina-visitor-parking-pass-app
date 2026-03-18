import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  consumeResidentInvite,
  ResidentInviteError,
} from '@/services/resident-invite-service';

const consumeSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  strataLotNumber: z.string().trim().min(1, 'Strata lot number is required'),
  assignedStallNumbers: z
    .array(z.string().trim().min(1, 'Assigned stall number is required'))
    .min(1, 'At least one assigned stall number is required'),
  personalLicensePlates: z
    .array(z.string().trim().min(2, 'License plate must be at least 2 characters'))
    .min(1, 'At least one personal license plate is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = consumeSchema.parse(body);

    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      null;
    const userAgent = request.headers.get('user-agent');

    const result = await consumeResidentInvite({
      token: data.token,
      password: data.password,
      strataLotNumber: data.strataLotNumber,
      assignedStallNumbers: data.assignedStallNumbers,
      personalLicensePlates: data.personalLicensePlates,
      ipAddress,
      userAgent,
    });

    return NextResponse.json(result);
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

    console.error('Error consuming resident invite:', error);
    return NextResponse.json(
      { error: 'Failed to complete registration' },
      { status: 500 }
    );
  }
}
