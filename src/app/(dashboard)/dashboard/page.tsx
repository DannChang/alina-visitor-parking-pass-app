import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Car, AlertTriangle, Clock, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

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
    include: {
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

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  variant = 'default',
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ElementType;
  variant?: 'default' | 'warning' | 'success' | 'destructive';
}) {
  const iconColors = {
    default: 'text-primary',
    warning: 'text-warning',
    success: 'text-success',
    destructive: 'text-destructive',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6 md:pb-2">
        <CardTitle className="text-xs md:text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColors[variant]}`} />
      </CardHeader>
      <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
        <div className="text-xl md:text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </CardContent>
    </Card>
  );
}

function StatsLoading() {
  return (
    <div className="grid gap-3 grid-cols-2 md:gap-4 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6 md:pb-2">
            <Skeleton className="h-4 w-16 md:w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
            <Skeleton className="h-7 md:h-8 w-12 md:w-16" />
            <Skeleton className="mt-1 h-3 w-20 md:w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function StatsSection() {
  const stats = await getStats();

  return (
    <div className="grid gap-3 grid-cols-2 md:gap-4 lg:grid-cols-4">
      <StatCard
        title="Active Passes"
        value={stats.activePasses}
        description="Currently valid passes"
        icon={Car}
        variant="success"
      />
      <StatCard
        title="Expiring Soon"
        value={stats.expiringSoon}
        description="Within the next hour"
        icon={Clock}
        variant="warning"
      />
      <StatCard
        title="Today's Violations"
        value={stats.todayViolations}
        description="Logged today"
        icon={AlertTriangle}
        variant="destructive"
      />
      <StatCard
        title="Total Vehicles"
        value={stats.totalVehicles}
        description="In the system"
        icon={Users}
      />
    </div>
  );
}

async function RecentPassesSection() {
  const passes = await getRecentPasses();

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Recent Passes</CardTitle>
        <CardDescription>Latest parking registrations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {passes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent passes</p>
          ) : (
            passes.map((pass) => (
              <div key={pass.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                    <Car className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{pass.vehicle.licensePlate}</p>
                    <p className="text-xs text-muted-foreground">
                      Unit {pass.unit.unitNumber}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    pass.status === 'ACTIVE'
                      ? 'default'
                      : pass.status === 'EXPIRED'
                        ? 'secondary'
                        : 'outline'
                  }
                >
                  {pass.status}
                </Badge>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

async function RecentViolationsSection() {
  const violations = await getRecentViolations();

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Recent Violations</CardTitle>
        <CardDescription>Latest logged violations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {violations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent violations</p>
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

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Welcome back, {session.user.name || 'Manager'}. Here&apos;s what&apos;s happening today.
        </p>
      </div>

      <Suspense fallback={<StatsLoading />}>
        <StatsSection />
      </Suspense>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
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
