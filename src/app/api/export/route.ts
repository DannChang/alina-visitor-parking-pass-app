import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateExport, logExport, ExportType } from '@/services/export-service';

const validTypes: ExportType[] = ['passes', 'violations', 'vehicles', 'analytics', 'audit-logs'];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as ExportType;
    const format = searchParams.get('format') as 'csv' | 'json' | undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const buildingId = searchParams.get('buildingId');

    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid export type. Valid types: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Only admins can export audit logs
    if (type === 'audit-logs' && !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await generateExport({
      type,
      format: format || 'csv',
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      buildingId: buildingId || undefined,
    });

    // Log the export action
    await logExport(session.user.id, type, {
      format: format || 'csv',
      startDate,
      endDate,
      buildingId,
    });

    return new NextResponse(result.data, {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate export' },
      { status: 500 }
    );
  }
}
