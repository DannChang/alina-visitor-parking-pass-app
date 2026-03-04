import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { sendPassLink } from '@/services/sms-notification-service';

const sendPassSchema = z.object({
  phone: z.string().min(1).max(20),
  guestName: z.string().min(1).max(100),
  licensePlate: z.string().max(10).optional(),
  duration: z.number().int().min(1).max(24).optional(),
});

// POST /api/resident/send-pass - Send an SMS link to a guest for registration
export async function POST(request: NextRequest) {
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
    const parsed = sendPassSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Get the unit with building info to generate the registration URL
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        building: {
          select: { slug: true },
        },
      },
    });

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    // Build the registration URL with pre-filled query params
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const registrationUrl = new URL(`/register/${unit.building.slug}`, baseUrl);
    registrationUrl.searchParams.set('unit', unit.unitNumber);
    registrationUrl.searchParams.set('guest', data.guestName);

    if (data.licensePlate) {
      registrationUrl.searchParams.set('plate', data.licensePlate);
    }
    if (data.duration) {
      registrationUrl.searchParams.set('duration', data.duration.toString());
    }

    // Send SMS via notification service
    const sent = await sendPassLink(data.phone, registrationUrl.toString());

    if (!sent) {
      return NextResponse.json({ error: 'Failed to send SMS' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'SMS sent successfully' });
  } catch (error) {
    console.error('Error sending pass link:', error);
    return NextResponse.json({ error: 'Failed to send pass link' }, { status: 500 });
  }
}
