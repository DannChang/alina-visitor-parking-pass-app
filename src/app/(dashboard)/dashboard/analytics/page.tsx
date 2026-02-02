import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { format, subDays, startOfDay, endOfDay, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { TrendingUp, TrendingDown, Clock, Car, AlertTriangle, Users, Calendar, Download } from 'lucide-react';
import { hasPermission } from '@/lib/authorization';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

async function getAnalytics() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekAgo = subDays(now, 7);
  const monthAgo = subMonths(now, 1);
  const lastMonthStart = startOfMonth(monthAgo);
  const lastMonthEnd = endOfMonth(monthAgo);
  const thisMonthStart = startOfMonth(now);

  const [
    todayPasses,
    weekPasses,
    thisMonthPasses,
    lastMonthPasses,
    todayViolations,
    weekViolations,
    thisMonthViolations,
    lastMonthViolations,
    totalVehicles,
    blacklistedVehicles,
    activeUnits,
    totalUnits,
    passesByDuration,
    violationsByType,
    passesLast7Days,
    violationsLast7Days,
    peakHours,
    topUnits,
  ] = await Promise.all([
    // Today's passes
    prisma.parkingPass.count({
      where: { createdAt: { gte: todayStart, lte: todayEnd }, deletedAt: null },
    }),
    // This week's passes
    prisma.parkingPass.count({
      where: { createdAt: { gte: weekAgo }, deletedAt: null },
    }),
    // This month's passes
    prisma.parkingPass.count({
      where: { createdAt: { gte: thisMonthStart }, deletedAt: null },
    }),
    // Last month's passes
    prisma.parkingPass.count({
      where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, deletedAt: null },
    }),
    // Today's violations
    prisma.violation.count({
      where: { createdAt: { gte: todayStart, lte: todayEnd }, deletedAt: null },
    }),
    // This week's violations
    prisma.violation.count({
      where: { createdAt: { gte: weekAgo }, deletedAt: null },
    }),
    // This month's violations
    prisma.violation.count({
      where: { createdAt: { gte: thisMonthStart }, deletedAt: null },
    }),
    // Last month's violations
    prisma.violation.count({
      where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, deletedAt: null },
    }),
    // Total vehicles
    prisma.vehicle.count({ where: { deletedAt: null } }),
    // Blacklisted vehicles
    prisma.vehicle.count({ where: { isBlacklisted: true, deletedAt: null } }),
    // Active units
    prisma.unit.count({ where: { isActive: true, deletedAt: null } }),
    // Total units
    prisma.unit.count({ where: { deletedAt: null } }),
    // Passes by duration
    prisma.parkingPass.groupBy({
      by: ['duration'],
      where: { createdAt: { gte: monthAgo }, deletedAt: null },
      _count: true,
      orderBy: { _count: { duration: 'desc' } },
    }),
    // Violations by type
    prisma.violation.groupBy({
      by: ['type'],
      where: { createdAt: { gte: monthAgo }, deletedAt: null },
      _count: true,
      orderBy: { _count: { type: 'desc' } },
    }),
    // Passes last 7 days
    Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const date = subDays(now, 6 - i);
        return prisma.parkingPass.count({
          where: {
            createdAt: { gte: startOfDay(date), lte: endOfDay(date) },
            deletedAt: null,
          },
        }).then((count) => ({ date: format(date, 'EEE'), count }));
      })
    ),
    // Violations last 7 days
    Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const date = subDays(now, 6 - i);
        return prisma.violation.count({
          where: {
            createdAt: { gte: startOfDay(date), lte: endOfDay(date) },
            deletedAt: null,
          },
        }).then((count) => ({ date: format(date, 'EEE'), count }));
      })
    ),
    // Peak registration hours
    prisma.$queryRaw`
      SELECT EXTRACT(HOUR FROM "createdAt") as hour, COUNT(*)::int as count
      FROM parking_passes
      WHERE "deletedAt" IS NULL AND "createdAt" >= ${monthAgo}
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 5
    ` as Promise<{ hour: number; count: number }[]>,
    // Top units by passes
    prisma.parkingPass.groupBy({
      by: ['unitId'],
      where: { createdAt: { gte: monthAgo }, deletedAt: null },
      _count: true,
      orderBy: { _count: { unitId: 'desc' } },
      take: 5,
    }),
  ]);

  // Get unit details for top units
  const unitIds = topUnits.map((u) => u.unitId);
  const units = await prisma.unit.findMany({
    where: { id: { in: unitIds } },
    select: { id: true, unitNumber: true },
  });

  const topUnitsWithDetails = topUnits.map((u) => ({
    unitNumber: units.find((unit) => unit.id === u.unitId)?.unitNumber || 'Unknown',
    count: u._count,
  }));

  return {
    passes: {
      today: todayPasses,
      week: weekPasses,
      thisMonth: thisMonthPasses,
      lastMonth: lastMonthPasses,
      monthlyChange: lastMonthPasses > 0
        ? Math.round(((thisMonthPasses - lastMonthPasses) / lastMonthPasses) * 100)
        : thisMonthPasses > 0 ? 100 : 0,
    },
    violations: {
      today: todayViolations,
      week: weekViolations,
      thisMonth: thisMonthViolations,
      lastMonth: lastMonthViolations,
      monthlyChange: lastMonthViolations > 0
        ? Math.round(((thisMonthViolations - lastMonthViolations) / lastMonthViolations) * 100)
        : thisMonthViolations > 0 ? 100 : 0,
    },
    vehicles: {
      total: totalVehicles,
      blacklisted: blacklistedVehicles,
    },
    units: {
      active: activeUnits,
      total: totalUnits,
    },
    passesByDuration: passesByDuration.slice(0, 5),
    violationsByType: violationsByType.slice(0, 5),
    passesLast7Days,
    violationsLast7Days,
    peakHours,
    topUnits: topUnitsWithDetails,
  };
}

function StatCard({
  title,
  value,
  change,
  description,
  icon: Icon,
}: {
  title: string;
  value: number | string;
  change?: number;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold">{value}</span>
          {change !== undefined && (
            <span className={`flex items-center text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
              {Math.abs(change)}%
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function SimpleBarChart({ data, label }: { data: { date: string; count: number }[]; label: string }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex h-32 items-end gap-1">
        {data.map((item, index) => (
          <div key={index} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full bg-primary rounded-t transition-all"
              style={{ height: `${(item.count / maxCount) * 100}%`, minHeight: item.count > 0 ? '4px' : '0' }}
            />
            <span className="text-xs text-muted-foreground">{item.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-1 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function AnalyticsContent() {
  const analytics = await getAnalytics();

  const violationLabels: Record<string, string> = {
    OVERSTAY: 'Overstay',
    UNREGISTERED: 'Unregistered',
    IMPROPER_PARKING: 'Improper Parking',
    BLOCKING: 'Blocking',
    RESERVED_SPOT: 'Reserved Spot',
    EXPIRED_PASS: 'Expired Pass',
    FRAUDULENT_REGISTRATION: 'Fraudulent',
    EMERGENCY_LANE_VIOLATION: 'Emergency Lane',
    HANDICAP_VIOLATION: 'Handicap',
    OTHER: 'Other',
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="This Month's Passes"
          value={analytics.passes.thisMonth}
          change={analytics.passes.monthlyChange}
          description={`${analytics.passes.today} registered today`}
          icon={Car}
        />
        <StatCard
          title="This Month's Violations"
          value={analytics.violations.thisMonth}
          change={-analytics.violations.monthlyChange}
          description={`${analytics.violations.today} logged today`}
          icon={AlertTriangle}
        />
        <StatCard
          title="Registered Vehicles"
          value={analytics.vehicles.total}
          description={`${analytics.vehicles.blacklisted} blacklisted`}
          icon={Users}
        />
        <StatCard
          title="Active Units"
          value={`${analytics.units.active}/${analytics.units.total}`}
          description="Units accepting visitors"
          icon={Calendar}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Passes (Last 7 Days)</CardTitle>
            <CardDescription>Daily parking pass registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart data={analytics.passesLast7Days} label="" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Violations (Last 7 Days)</CardTitle>
            <CardDescription>Daily violations logged</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleBarChart data={analytics.violationsLast7Days} label="" />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Pass Durations</CardTitle>
            <CardDescription>Most popular durations (30 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.passesByDuration.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data available</p>
              ) : (
                analytics.passesByDuration.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{item.duration} hours</span>
                    </div>
                    <Badge variant="secondary">{item._count}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Violation Types</CardTitle>
            <CardDescription>Most common violations (30 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.violationsByType.length === 0 ? (
                <p className="text-sm text-muted-foreground">No violations recorded</p>
              ) : (
                analytics.violationsByType.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{violationLabels[item.type] || item.type}</span>
                    <Badge variant="destructive">{item._count}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Units</CardTitle>
            <CardDescription>Most visitor passes (30 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topUnits.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data available</p>
              ) : (
                analytics.topUnits.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">Unit {item.unitNumber}</span>
                    <Badge variant="outline">{item.count} passes</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Peak Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Peak Registration Hours</CardTitle>
          <CardDescription>Busiest times for visitor registration (30 days)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {analytics.peakHours.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data available</p>
            ) : (
              analytics.peakHours.map((item, index) => (
                <Badge key={index} variant={index === 0 ? 'default' : 'secondary'} className="text-sm">
                  {item.hour === 0 ? '12' : item.hour > 12 ? item.hour - 12 : item.hour}
                  {item.hour >= 12 ? 'PM' : 'AM'}: {item.count} passes
                </Badge>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function AnalyticsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Defense in depth: verify permission at page level
  if (!hasPermission(session.user.role, 'analytics:view')) {
    redirect('/dashboard?error=access_denied');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">Parking system insights and trends</p>
        </div>
        <Button variant="outline" asChild>
          <a href="/api/export?type=analytics" download>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </a>
        </Button>
      </div>

      <Suspense fallback={<AnalyticsLoading />}>
        <AnalyticsContent />
      </Suspense>
    </div>
  );
}
