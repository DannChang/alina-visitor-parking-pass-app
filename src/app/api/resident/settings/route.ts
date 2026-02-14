import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

const updateSettingsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  accessCode: z.string().min(4).max(10).optional(),
  password: z.string().min(8).max(100).optional(),
  currentPassword: z.string().min(1).optional(),
}).refine(
  (data) => {
    // If password is provided, currentPassword must also be provided
    if (data.password && !data.currentPassword) {
      return false;
    }
    return true;
  },
  {
    message: 'Current password is required when setting a new password',
    path: ['currentPassword'],
  }
);

// GET /api/resident/settings - Get resident info
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const residentId = (session as unknown as Record<string, string>).residentId;
  const unitId = (session as unknown as Record<string, string>).unitId;
  if (!residentId || !unitId) {
    return NextResponse.json({ error: 'Not a resident session' }, { status: 403 });
  }

  try {
    const resident = await prisma.resident.findUnique({
      where: { id: residentId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isPrimary: true,
        notifyOnVisitorRegistration: true,
        notifyOnViolation: true,
        unit: {
          select: {
            id: true,
            unitNumber: true,
            accessCodeHash: true,
            building: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!resident) {
      return NextResponse.json({ error: 'Resident not found' }, { status: 404 });
    }

    return NextResponse.json({
      resident: {
        id: resident.id,
        name: resident.name,
        email: resident.email,
        phone: resident.phone,
        isPrimary: resident.isPrimary,
        notifyOnVisitorRegistration: resident.notifyOnVisitorRegistration,
        notifyOnViolation: resident.notifyOnViolation,
        hasAccessCode: !!resident.unit.accessCodeHash,
        unit: {
          id: resident.unit.id,
          unitNumber: resident.unit.unitNumber,
          building: resident.unit.building,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching resident settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// PATCH /api/resident/settings - Update resident info
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const residentId = (session as unknown as Record<string, string>).residentId;
  const unitId = (session as unknown as Record<string, string>).unitId;
  if (!residentId || !unitId) {
    return NextResponse.json({ error: 'Not a resident session' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = updateSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Handle password change
    if (data.password && data.currentPassword) {
      const resident = await prisma.resident.findUnique({
        where: { id: residentId },
        select: { passwordHash: true },
      });

      if (!resident) {
        return NextResponse.json({ error: 'Resident not found' }, { status: 404 });
      }

      if (!resident.passwordHash) {
        return NextResponse.json(
          { error: 'No password set. Contact management to set initial password.' },
          { status: 400 }
        );
      }

      const isValidPassword = await bcrypt.compare(data.currentPassword, resident.passwordHash);
      if (!isValidPassword) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }

      const newPasswordHash = await bcrypt.hash(data.password, 12);
      await prisma.resident.update({
        where: { id: residentId },
        data: { passwordHash: newPasswordHash },
      });
    }

    // Handle access code update
    if (data.accessCode) {
      const accessCodeHash = await bcrypt.hash(data.accessCode, 12);
      await prisma.unit.update({
        where: { id: unitId },
        data: { accessCodeHash },
      });
    }

    // Update resident profile fields
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;

    if (Object.keys(updateData).length > 0) {
      await prisma.resident.update({
        where: { id: residentId },
        data: updateData,
      });
    }

    return NextResponse.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating resident settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
