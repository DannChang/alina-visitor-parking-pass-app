import { Suspense } from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { startOfDay, subDays, subMonths } from 'date-fns';
import { Car, AlertTriangle, Clock, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TopOffendersChart,
  type OffenderTimeScale,
  type TopOffender,
  type TopOffenderChartData,
} from '@/components/dashboard/top-offenders-chart';
import { getTranslations } from 'next-intl/server';

async function getStats() {
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  const todayStart = new Date(now.setHours(0, 0, 0, 0));

  const [activePasses, expiringSoon, todayViolations, totalVehicles] = await Promise.all([
    prisma.parkingPass.count({
      where: {
        status: 'ACTIVE',
        endTime: { gt: new Date() },
        deletedAt: null,
      },
    }),
    prisma.parkingPass.count({
      where: {
        status: 'ACTIVE',
        endTime: { gt: new Date(), lte: oneHourFromNow },
        deletedAt: null,
      },
    }),
    prisma.violation.count({
      where: {
        createdAt: { gte: todayStart },
        deletedAt: null,
      },
    }),
    prisma.vehicle.count({
      where: { deletedAt: null },
    }),
  ]);

  return { activePasses, expiringSoon, todayViolations, totalVehicles };
}

async function getRecentPasses() {
  return prisma.parkingPass.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      status: true,
      endTime: true,
      vehicle: {
        select: {
          licensePlate: true,
          make: true,
          color: true,
        },
      },
      unit: {
        select: {
          unitNumber: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
}

async function getRecentViolations() {
  return prisma.violation.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      vehicle: {
        select: {
          licensePlate: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
}

function getVehicleDescription(vehicle: {
  year: number | null;
  color: string | null;
  make: string | null;
  model: string | null;
}) {
  return (
    [vehicle.year, vehicle.color, vehicle.make, vehicle.model].filter(Boolean).join(' ') ||
    'Vehicle details not provided'
  );
}

function getOffenderAction(offender: {
  violations: number;
  unresolvedViolations: number;
  severeViolations: number;
  patrolSightings: number;
  isBlacklisted: boolean;
  riskScore: number;
  hasTowNotice: boolean;
}): TopOffender['action'] {
  if (
    offender.isBlacklisted ||
    offender.hasTowNotice ||
    offender.riskScore >= 75 ||
    offender.severeViolations >= 2
  ) {
    return 'tow_review';
  }

  if (
    offender.unresolvedViolations >= 2 ||
    offender.violations >= 3 ||
    offender.severeViolations >= 1
  ) {
    return 'escalate';
  }

  if (offender.patrolSightings >= 2 || offender.violations >= 1) {
    return 'issue_violation';
  }

  return 'monitor';
}

async function getTopOffendersForPeriod(startDate: Date | null): Promise<TopOffender[]> {
  const violationWhere = {
    deletedAt: null,
    ...(startDate ? { createdAt: { gte: startDate } } : {}),
  };
  const patrolWhere = {
    ...(startDate ? { createdAt: { gte: startDate } } : {}),
  };

  const [violationGroups, openViolationGroups, severeViolationGroups, patrolGroups] =
    await Promise.all([
      prisma.violation.groupBy({
        by: ['vehicleId'],
        where: violationWhere,
        _count: { _all: true },
      }),
      prisma.violation.groupBy({
        by: ['vehicleId'],
        where: { ...violationWhere, isResolved: false },
        _count: { _all: true },
      }),
      prisma.violation.groupBy({
        by: ['vehicleId'],
        where: { ...violationWhere, severity: { in: ['HIGH', 'CRITICAL'] } },
        _count: { _all: true },
      }),
      prisma.patrolLogEntry.groupBy({
        by: ['normalizedPlate'],
        where: patrolWhere,
        _count: { _all: true },
      }),
    ]);

  const vehicleIds = violationGroups.map((group) => group.vehicleId);
  const normalizedPlates = patrolGroups.map((group) => group.normalizedPlate);

  if (vehicleIds.length === 0 && normalizedPlates.length === 0) {
    return [];
  }

  const vehicles = await prisma.vehicle.findMany({
    where: {
      deletedAt: null,
      OR: [
        vehicleIds.length > 0 ? { id: { in: vehicleIds } } : undefined,
        normalizedPlates.length > 0 ? { normalizedPlate: { in: normalizedPlates } } : undefined,
      ].filter(Boolean) as Array<Record<string, unknown>>,
    },
    select: {
      id: true,
      licensePlate: true,
      normalizedPlate: true,
      year: true,
      color: true,
      make: true,
      model: true,
      isBlacklisted: true,
      riskScore: true,
    },
  });

  const knownVehicleIds = vehicles.map((vehicle) => vehicle.id);
  const knownNormalizedPlates = vehicles.map((vehicle) => vehicle.normalizedPlate);

  const [latestViolations, latestPatrolLogs] = await Promise.all([
    knownVehicleIds.length > 0
      ? prisma.violation.findMany({
          where: { ...violationWhere, vehicleId: { in: knownVehicleIds } },
          select: {
            vehicleId: true,
            type: true,
            location: true,
            createdAt: true,
            escalationLevel: true,
          },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
    normalizedPlates.length > 0
      ? prisma.patrolLogEntry.findMany({
          where: { ...patrolWhere, normalizedPlate: { in: normalizedPlates } },
          select: {
            normalizedPlate: true,
            licensePlate: true,
            location: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
  ]);

  const violationCountByVehicle = new Map(
    violationGroups.map((group) => [group.vehicleId, group._count._all])
  );
  const openCountByVehicle = new Map(
    openViolationGroups.map((group) => [group.vehicleId, group._count._all])
  );
  const severeCountByVehicle = new Map(
    severeViolationGroups.map((group) => [group.vehicleId, group._count._all])
  );
  const patrolCountByPlate = new Map(
    patrolGroups.map((group) => [group.normalizedPlate, group._count._all])
  );
  const latestViolationByVehicle = new Map<string, (typeof latestViolations)[number]>();
  const hasTowNoticeByVehicle = new Map<string, boolean>();
  const latestPatrolByPlate = new Map<string, (typeof latestPatrolLogs)[number]>();

  latestViolations.forEach((violation) => {
    if (!latestViolationByVehicle.has(violation.vehicleId)) {
      latestViolationByVehicle.set(violation.vehicleId, violation);
    }
    if (violation.escalationLevel === 'TOW_NOTICE') {
      hasTowNoticeByVehicle.set(violation.vehicleId, true);
    }
  });

  latestPatrolLogs.forEach((entry) => {
    if (!latestPatrolByPlate.has(entry.normalizedPlate)) {
      latestPatrolByPlate.set(entry.normalizedPlate, entry);
    }
  });

  const offendersByPlate = new Map<string, TopOffender>();

  vehicles.forEach((vehicle) => {
    const latestViolation = latestViolationByVehicle.get(vehicle.id);
    const latestPatrol = latestPatrolByPlate.get(vehicle.normalizedPlate);
    const violations = violationCountByVehicle.get(vehicle.id) ?? 0;
    const unresolvedViolations = openCountByVehicle.get(vehicle.id) ?? 0;
    const severeViolations = severeCountByVehicle.get(vehicle.id) ?? 0;
    const patrolSightings = patrolCountByPlate.get(vehicle.normalizedPlate) ?? 0;
    const latestActivity =
      latestViolation && latestPatrol
        ? latestViolation.createdAt > latestPatrol.createdAt
          ? latestViolation.createdAt
          : latestPatrol.createdAt
        : (latestViolation?.createdAt ?? latestPatrol?.createdAt ?? null);
    const actionInput = {
      violations,
      unresolvedViolations,
      severeViolations,
      patrolSightings,
      isBlacklisted: vehicle.isBlacklisted,
      riskScore: vehicle.riskScore,
      hasTowNotice: hasTowNoticeByVehicle.get(vehicle.id) ?? false,
    };

    offendersByPlate.set(vehicle.normalizedPlate, {
      vehicleId: vehicle.id,
      licensePlate: vehicle.licensePlate,
      vehicleDescription: getVehicleDescription(vehicle),
      violations,
      unresolvedViolations,
      severeViolations,
      patrolSightings,
      score:
        violations * 10 +
        unresolvedViolations * 6 +
        severeViolations * 8 +
        Math.min(patrolSightings, 10) * 2 +
        Math.min(vehicle.riskScore, 100) / 10 +
        (vehicle.isBlacklisted ? 20 : 0),
      latestActivity: latestActivity?.toISOString() ?? null,
      latestLocation: latestViolation?.location ?? latestPatrol?.location ?? null,
      latestViolationType: latestViolation?.type ?? null,
      isBlacklisted: vehicle.isBlacklisted,
      riskScore: vehicle.riskScore,
      action: getOffenderAction(actionInput),
    });
  });

  patrolGroups.forEach((group) => {
    if (knownNormalizedPlates.includes(group.normalizedPlate)) {
      return;
    }

    const latestPatrol = latestPatrolByPlate.get(group.normalizedPlate);
    const patrolSightings = patrolCountByPlate.get(group.normalizedPlate) ?? 0;
    const actionInput = {
      violations: 0,
      unresolvedViolations: 0,
      severeViolations: 0,
      patrolSightings,
      isBlacklisted: false,
      riskScore: 0,
      hasTowNotice: false,
    };

    offendersByPlate.set(group.normalizedPlate, {
      vehicleId: null,
      licensePlate: latestPatrol?.licensePlate ?? group.normalizedPlate,
      vehicleDescription: 'Unregistered or unmatched patrol plate',
      violations: 0,
      unresolvedViolations: 0,
      severeViolations: 0,
      patrolSightings,
      score: Math.min(patrolSightings, 10) * 2,
      latestActivity: latestPatrol?.createdAt.toISOString() ?? null,
      latestLocation: latestPatrol?.location ?? null,
      latestViolationType: null,
      isBlacklisted: false,
      riskScore: 0,
      action: getOffenderAction(actionInput),
    });
  });

  return Array.from(offendersByPlate.values())
    .filter((offender) => offender.violations > 0 || offender.patrolSightings > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

async function getTopOffenders(): Promise<TopOffenderChartData> {
  const now = new Date();
  const periods: Record<OffenderTimeScale, Date | null> = {
    today: startOfDay(now),
    week: subDays(now, 7),
    month: subMonths(now, 1),
    overall: null,
  };

  const [today, week, month, overall] = await Promise.all([
    getTopOffendersForPeriod(periods.today),
    getTopOffendersForPeriod(periods.week),
    getTopOffendersForPeriod(periods.month),
    getTopOffendersForPeriod(periods.overall),
  ]);

  return { today, week, month, overall };
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  href,
  variant = 'default',
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ElementType;
  href: string;
  variant?: 'default' | 'warning' | 'success' | 'destructive';
}) {
  const iconColors = {
    default: 'text-primary',
    warning: 'text-warning',
    success: 'text-success',
    destructive: 'text-destructive',
  };

  return (
    <Link href={href} className="block focus-visible:outline-none">
      <Card className="h-full transition-shadow focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2 md:p-6 md:pb-2">
          <CardTitle className="text-xs font-medium md:text-sm">{title}</CardTitle>
          <Icon className={`h-4 w-4 ${iconColors[variant]}`} />
        </CardHeader>
        <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
          <div className="text-xl font-bold md:text-2xl">{value}</div>
          <p className="truncate text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function StatsLoading() {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2 md:p-6 md:pb-2">
            <Skeleton className="h-4 w-16 md:w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            <Skeleton className="h-7 w-12 md:h-8 md:w-16" />
            <Skeleton className="mt-1 h-3 w-20 md:w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function StatsSection() {
  const [stats, t] = await Promise.all([getStats(), getTranslations('dashboard.home')]);

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      <StatCard
        title={t('activePassesTitle')}
        value={stats.activePasses}
        description={t('activePassesDesc')}
        icon={Car}
        href="/dashboard/passes?status=ACTIVE"
        variant="success"
      />
      <StatCard
        title={t('expiringSoonTitle')}
        value={stats.expiringSoon}
        description={t('expiringSoonDesc')}
        icon={Clock}
        href="/dashboard/passes?status=EXPIRING_SOON"
        variant="warning"
      />
      <StatCard
        title={t('todayViolationsTitle')}
        value={stats.todayViolations}
        description={t('todayViolationsDesc')}
        icon={AlertTriangle}
        href="/dashboard/violations?date=today"
        variant="destructive"
      />
      <StatCard
        title={t('totalVehiclesTitle')}
        value={stats.totalVehicles}
        description={t('totalVehiclesDesc')}
        icon={Users}
        href="/dashboard/vehicles"
      />
    </div>
  );
}

async function RecentPassesSection() {
  const [passes, t] = await Promise.all([getRecentPasses(), getTranslations('dashboard.home')]);
  const now = new Date();

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>{t('recentPasses')}</CardTitle>
        <CardDescription>{t('recentPassesDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {passes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noRecentPasses')}</p>
          ) : (
            passes.map((pass) => {
              const effectiveStatus =
                pass.status === 'ACTIVE' && pass.endTime < now ? 'EXPIRED' : pass.status;
              return (
                <Link
                  key={pass.id}
                  href={`/dashboard/passes?passId=${pass.id}`}
                  className="-mx-1 flex items-center justify-between rounded-md p-1 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                      <Car className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{pass.vehicle.licensePlate}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('unitLabel', { number: pass.unit.unitNumber })}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      effectiveStatus === 'ACTIVE'
                        ? 'default'
                        : effectiveStatus === 'EXPIRED'
                          ? 'secondary'
                          : 'outline'
                    }
                  >
                    {effectiveStatus}
                  </Badge>
                </Link>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}

async function RecentViolationsSection() {
  const [violations, t] = await Promise.all([
    getRecentViolations(),
    getTranslations('dashboard.home'),
  ]);

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>{t('recentViolations')}</CardTitle>
        <CardDescription>{t('recentViolationsDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {violations.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noRecentViolations')}</p>
          ) : (
            violations.map((violation) => (
              <div key={violation.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{violation.vehicle.licensePlate}</p>
                    <p className="text-xs text-muted-foreground">{violation.type}</p>
                  </div>
                </div>
                <Badge variant={violation.isResolved ? 'outline' : 'destructive'}>
                  {violation.isResolved ? 'Resolved' : violation.severity}
                </Badge>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

async function TopOffendersSection() {
  const offenders = await getTopOffenders();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top offender plates</CardTitle>
        <CardDescription>
          Prioritized from violation severity, unresolved enforcement, patrol sightings, and vehicle
          risk.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TopOffendersChart data={offenders} />
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Residents don't need the admin overview — send them to their passes
  if (session.user.role === 'RESIDENT') {
    redirect('/resident/passes');
  }

  const t = await getTranslations('dashboard.home');

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('title')}</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          {t('welcomeBack', { name: session.user.name || 'Manager' })} {t('todaySummary')}
        </p>
      </div>

      <Suspense fallback={<StatsLoading />}>
        <StatsSection />
      </Suspense>

      <Suspense
        fallback={
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[420px]" />
            </CardContent>
          </Card>
        }
      >
        <TopOffendersSection />
      </Suspense>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Suspense
          fallback={
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-40" />
              </CardContent>
            </Card>
          }
        >
          <RecentPassesSection />
        </Suspense>
        <Suspense
          fallback={
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-40" />
              </CardContent>
            </Card>
          }
        >
          <RecentViolationsSection />
        </Suspense>
      </div>
    </div>
  );
}
