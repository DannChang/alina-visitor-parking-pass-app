import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { consumeResidentInvite, ResidentInviteError } from '@/services/resident-invite-service';
import { PRIVACY_POLICY_VERSION } from '@/lib/privacy-policy';
import {
  assignedStallNumberSchema,
  residentStrataLotSchema,
  strictLicensePlateSchema,
  strongPasswordSchema,
} from '@/lib/validation';

const consumeSchema = z
  .object({
    token: z.string().min(1),
    recipientName: z.string().trim().min(1, 'Resident name is required').max(100).optional(),
    recipientEmail: z.string().trim().email('A valid email is required').optional(),
    password: strongPasswordSchema,
    hasVehicle: z.boolean(),
    strataLotNumber: residentStrataLotSchema,
    assignedStallNumbers: z
      .array(assignedStallNumberSchema)
      .min(1, 'At least one assigned stall number is required'),
    personalLicensePlates: z.array(strictLicensePlateSchema),
    privacyConsent: z.literal(true, {
      errorMap: () => ({
        message: 'You must accept the privacy policy before activating your account',
      }),
    }),
    privacyPolicyVersion: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    if (data.hasVehicle && data.personalLicensePlates.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['personalLicensePlates'],
        message: 'At least one personal license plate is required',
      });
    }

    if (!data.hasVehicle && data.personalLicensePlates.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['personalLicensePlates'],
        message: 'Personal license plates must be empty when no vehicle is selected',
      });
    }
  });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = consumeSchema.parse(body);

    if (data.privacyPolicyVersion !== PRIVACY_POLICY_VERSION) {
      return NextResponse.json(
        { error: 'Privacy policy acknowledgement is out of date. Please review and try again.' },
        { status: 400 }
      );
    }

    const ipAddress =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
    const userAgent = request.headers.get('user-agent');

    const result = await consumeResidentInvite({
      token: data.token,
      recipientName: data.recipientName,
      recipientEmail: data.recipientEmail,
      password: data.password,
      hasVehicle: data.hasVehicle,
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
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    console.error('Error consuming resident invite:', error);
    return NextResponse.json({ error: 'Failed to complete registration' }, { status: 500 });
  }
}
