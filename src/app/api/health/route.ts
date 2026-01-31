import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: {
      status: 'up' | 'down';
      latencyMs: number;
    };
    activePassCount: number;
    expiringSoonCount: number;
  };
}

export async function GET(): Promise<NextResponse<HealthCheckResult>> {

  let dbStatus: 'up' | 'down' = 'down';
  let dbLatency = 0;
  let activePassCount = 0;
  let expiringSoonCount = 0;

  try {
    // Check database connection
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - dbStart;
    dbStatus = 'up';

    // Get pass counts
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    const [active, expiring] = await Promise.all([
      prisma.parkingPass.count({
        where: {
          status: 'ACTIVE',
          endTime: { gt: now },
          deletedAt: null,
        },
      }),
      prisma.parkingPass.count({
        where: {
          status: 'ACTIVE',
          endTime: { gt: now, lte: oneHourFromNow },
          deletedAt: null,
        },
      }),
    ]);

    activePassCount = active;
    expiringSoonCount = expiring;
  } catch (error) {
    console.error('Health check database error:', error);
  }

  const overallStatus = dbStatus === 'up' ? 'healthy' : 'unhealthy';

  const result: HealthCheckResult = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    checks: {
      database: {
        status: dbStatus,
        latencyMs: dbLatency,
      },
      activePassCount,
      expiringSoonCount,
    },
  };

  return NextResponse.json(result, {
    status: overallStatus === 'healthy' ? 200 : 503,
  });
}
