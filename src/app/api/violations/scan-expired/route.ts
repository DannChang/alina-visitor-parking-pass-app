import { NextRequest, NextResponse } from 'next/server';
import { getSystemUserId, scanExpiredPasses } from '@/services/violation-detection-service';

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    return process.env.NODE_ENV !== 'production';
  }

  return request.headers.get('authorization') === `Bearer ${cronSecret}`;
}

// POST /api/violations/scan-expired
// Called by Vercel Cron every 15 minutes to detect expired/overstay violations
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const systemUserId = await getSystemUserId();
    const result = await scanExpiredPasses(systemUserId);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error scanning for expired passes:', error);
    return NextResponse.json(
      { error: 'Failed to scan expired passes' },
      { status: 500 }
    );
  }
}
