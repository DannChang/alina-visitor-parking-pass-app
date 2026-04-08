import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PasswordResetError, resetPassword } from '@/services/password-reset-service';
import { strongPasswordSchema } from '@/lib/validation';

const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: strongPasswordSchema,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = passwordResetConfirmSchema.parse(body);

    const result = await resetPassword({
      token: data.token,
      password: data.password,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    if (error instanceof PasswordResetError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    console.error('Error confirming password reset:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
