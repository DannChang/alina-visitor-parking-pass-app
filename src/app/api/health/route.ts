import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface ServiceStatus {
  status: 'operational' | 'degraded' | 'down';
  latency?: number;
  lastCheck: string;
  message?: string;
}

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  services: {
    database: ServiceStatus;
    api: ServiceStatus;
    email: ServiceStatus;
  };
  metrics: {
    activePasses: number;
    expiringSoon: number;
    todayViolations: number;
    pendingNotifications: number;
    avgResponseTime: number;
  };
  resources: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

export async function GET(): Promise<NextResponse<HealthCheckResult>> {
  const now = new Date();
  const timestamp = now.toISOString();

  // Initialize service statuses
  const services: HealthCheckResult['services'] = {
    database: { status: 'down', lastCheck: timestamp },
    api: { status: 'operational', latency: 0, lastCheck: timestamp },
    email: { status: 'operational', lastCheck: timestamp },
  };

  // Initialize metrics
  let activePasses = 0;
  let expiringSoon = 0;
  let todayViolations = 0;
  let pendingNotifications = 0;

  // Check database
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;

    services.database = dbLatency > 1000
      ? { status: 'degraded', latency: dbLatency, lastCheck: timestamp, message: 'High latency detected' }
      : { status: 'operational', latency: dbLatency, lastCheck: timestamp };

    // Get metrics
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const [active, expiring, violations, notifications] = await Promise.all([
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
      prisma.violation.count({
        where: {
          createdAt: { gte: todayStart },
          deletedAt: null,
        },
      }),
      prisma.notificationQueue.count({
        where: { status: 'PENDING' },
      }),
    ]);

    activePasses = active;
    expiringSoon = expiring;
    todayViolations = violations;
    pendingNotifications = notifications;
  } catch (error) {
    console.error('Health check database error:', error);
    services.database = {
      status: 'down',
      lastCheck: timestamp,
      message: 'Database connection failed',
    };
  }

  // Check email service (Resend API key presence)
  if (!process.env.RESEND_API_KEY) {
    services.email = {
      status: 'degraded',
      lastCheck: timestamp,
      message: 'Email service not configured',
    };
  }

  // Calculate API response time (this request)
  const apiLatency = Date.now() - now.getTime();
  services.api.latency = apiLatency;

  // Get memory usage
  const memUsage = process.memoryUsage();
  const usedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const totalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

  // Determine overall status
  let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';

  if (services.database.status === 'down') {
    overallStatus = 'critical';
  } else if (
    services.database.status === 'degraded' ||
    services.email.status === 'degraded' ||
    services.api.status === 'degraded'
  ) {
    overallStatus = 'degraded';
  }

  const result: HealthCheckResult = {
    status: overallStatus,
    timestamp,
    version: process.env.npm_package_version || '0.2.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    services,
    metrics: {
      activePasses,
      expiringSoon,
      todayViolations,
      pendingNotifications,
      avgResponseTime: apiLatency,
    },
    resources: {
      memory: {
        used: usedMB,
        total: totalMB,
        percentage: Math.round((usedMB / totalMB) * 100),
      },
    },
  };

  return NextResponse.json(result, {
    status: overallStatus === 'critical' ? 503 : 200,
  });
}
