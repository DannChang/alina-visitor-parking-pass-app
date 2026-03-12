import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { APP_CONFIG } from '@/lib/constants';
import { requestPasswordReset } from '@/services/password-reset-service';

const passwordResetRequestSchema = z
  .object({
    accountType: z.enum(['staff', 'resident']),
    email: z.string().email('A valid email is required'),
    buildingSlug: z.string().optional(),
    unitNumber: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (value.accountType === 'resident') {
      if (!value.unitNumber?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['unitNumber'],
          message: 'Unit number is required',
        });
      }
    }
  });

const genericResponse = {
  success: true,
  message:
    'If a matching account exists, a password reset link has been sent to the email address on file.',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = passwordResetRequestSchema.parse(body);

    await requestPasswordReset({
      accountType: data.accountType,
      email: data.email,
      ...(data.accountType === 'resident'
        ? {
            buildingSlug:
              data.buildingSlug || APP_CONFIG.resident.defaultBuildingSlug,
          }
        : {}),
      ...(data.unitNumber ? { unitNumber: data.unitNumber } : {}),
    });

    return NextResponse.json(genericResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    console.error('Error requesting password reset:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}
