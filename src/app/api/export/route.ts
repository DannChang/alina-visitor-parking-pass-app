import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { generateExport, logExport, ExportType } from '@/services/export-service';

const validTypes: ExportType[] = ['passes', 'violations', 'vehicles', 'analytics', 'audit-logs'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as ExportType;

    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid export type. Valid types: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Audit logs require audit_logs:view permission, other exports require reports:export
    const requiredPermission = type === 'audit-logs' ? 'audit_logs:view' : 'reports:export';
    const authResult = await requirePermission(requiredPermission);
    if (!authResult.authorized) {
      return authResult.response;
    }

    const { userId } = authResult.request;

    const format = searchParams.get('format') as 'csv' | 'json' | undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const buildingId = searchParams.get('buildingId');

    const result = await generateExport({
      type,
      format: format || 'csv',
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      buildingId: buildingId || undefined,
    });

    // Log the export action
    await logExport(userId, type, {
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
