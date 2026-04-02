import { NextRequest, NextResponse } from 'next/server';
import { processPassExpirationWarnings } from '@/services/notification-service';

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    return process.env.NODE_ENV !== 'production';
  }

  return request.headers.get('authorization') === `Bearer ${cronSecret}`;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const processed = await processPassExpirationWarnings();
    return NextResponse.json({ processed });
  } catch (error) {
    console.error('Error processing pass reminders:', error);
    return NextResponse.json({ error: 'Failed to process reminders' }, { status: 500 });
  }
}
