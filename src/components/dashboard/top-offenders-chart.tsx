'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, Car, Eye, ShieldAlert, Truck } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export type OffenderTimeScale = 'today' | 'week' | 'month' | 'overall';

export interface TopOffender {
  vehicleId: string | null;
  licensePlate: string;
  vehicleDescription: string;
  violations: number;
  unresolvedViolations: number;
  severeViolations: number;
  patrolSightings: number;
  score: number;
  latestActivity: string | null;
  latestLocation: string | null;
  latestViolationType: string | null;
  isBlacklisted: boolean;
  riskScore: number;
  action: 'tow_review' | 'escalate' | 'issue_violation' | 'monitor';
}

export type TopOffenderChartData = Record<OffenderTimeScale, TopOffender[]>;

const SCALE_LABELS: Record<OffenderTimeScale, string> = {
  today: 'Today',
  week: 'Last week',
  month: 'Last month',
  overall: 'Overall',
};

const ACTION_COPY: Record<
  TopOffender['action'],
  {
    label: string;
    description: string;
    icon: typeof Eye;
    variant: 'default' | 'destructive' | 'outline' | 'secondary';
  }
> = {
  tow_review: {
    label: 'Tow review',
    description: 'Open violations or critical history warrant manager review before towing.',
    icon: Truck,
    variant: 'destructive',
  },
  escalate: {
    label: 'Escalate',
    description: 'Repeated open or severe violations should move to the next enforcement step.',
    icon: ShieldAlert,
    variant: 'default',
  },
  issue_violation: {
    label: 'Issue violation',
    description: 'Patrol sightings show recurring presence without enough resolved enforcement.',
    icon: AlertTriangle,
    variant: 'secondary',
  },
  monitor: {
    label: 'Monitor',
    description: 'Keep this plate visible during patrol, but no immediate escalation is indicated.',
    icon: Eye,
    variant: 'outline',
  },
};

function formatActivity(value: string | null) {
  if (!value) {
    return 'No recent activity';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: TopOffender }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const firstPayload = payload[0];

  if (!firstPayload) {
    return null;
  }

  const item = firstPayload.payload;

  return (
    <div className="rounded-md border bg-background p-3 text-sm shadow-md">
      <p className="font-mono font-semibold">{item.licensePlate}</p>
      <p className="text-muted-foreground">{item.vehicleDescription}</p>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
        <span>Violations</span>
        <span className="text-right font-medium">{item.violations}</span>
        <span>Open</span>
        <span className="text-right font-medium">{item.unresolvedViolations}</span>
        <span>Patrol hits</span>
        <span className="text-right font-medium">{item.patrolSightings}</span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[300px] items-center justify-center rounded-md border border-dashed">
      <div className="max-w-sm text-center">
        <Car className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">No repeat offenders found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Patrol sightings and violation records will appear here once activity is logged.
        </p>
      </div>
    </div>
  );
}

export function TopOffendersChart({ data }: { data: TopOffenderChartData }) {
  const defaultScale: OffenderTimeScale =
    data.today.length > 0
      ? 'today'
      : data.week.length > 0
        ? 'week'
        : data.month.length > 0
          ? 'month'
          : 'overall';

  return (
    <Tabs defaultValue={defaultScale} className="space-y-4">
      <div className="overflow-x-auto">
        <TabsList className="min-w-max">
          {(Object.keys(SCALE_LABELS) as OffenderTimeScale[]).map((scale) => (
            <TabsTrigger key={scale} value={scale}>
              {SCALE_LABELS[scale]}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {(Object.keys(SCALE_LABELS) as OffenderTimeScale[]).map((scale) => {
        const offenders = data[scale];
        const topOffender = offenders[0] ?? null;

        return (
          <TabsContent key={scale} value={scale} className="mt-0">
            {offenders.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={offenders}
                      margin={{ left: -20, right: 12, top: 8, bottom: 16 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="licensePlate"
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                      <Bar
                        dataKey="score"
                        radius={[4, 4, 0, 0]}
                        onClick={(item: TopOffender) => {
                          window.location.href = `/dashboard/violations?search=${encodeURIComponent(
                            item.licensePlate
                          )}`;
                        }}
                      >
                        {offenders.map((item) => (
                          <Cell
                            key={item.licensePlate}
                            fill={
                              item.action === 'tow_review'
                                ? 'hsl(var(--destructive))'
                                : item.action === 'escalate'
                                  ? 'hsl(var(--warning))'
                                  : 'hsl(var(--primary))'
                            }
                            className="cursor-pointer"
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-md border p-4">
                  {topOffender ? (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium uppercase text-muted-foreground">
                            Highest priority
                          </p>
                          <p className="font-mono text-2xl font-bold">{topOffender.licensePlate}</p>
                          <p className="text-sm text-muted-foreground">
                            {topOffender.vehicleDescription}
                          </p>
                        </div>
                        <Badge variant={ACTION_COPY[topOffender.action].variant}>
                          {ACTION_COPY[topOffender.action].label}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-md bg-muted p-3">
                          <p className="text-muted-foreground">Violations</p>
                          <p className="text-xl font-semibold">{topOffender.violations}</p>
                        </div>
                        <div className="rounded-md bg-muted p-3">
                          <p className="text-muted-foreground">Open</p>
                          <p className="text-xl font-semibold">
                            {topOffender.unresolvedViolations}
                          </p>
                        </div>
                        <div className="rounded-md bg-muted p-3">
                          <p className="text-muted-foreground">Patrol hits</p>
                          <p className="text-xl font-semibold">{topOffender.patrolSightings}</p>
                        </div>
                        <div className="rounded-md bg-muted p-3">
                          <p className="text-muted-foreground">Risk score</p>
                          <p className="text-xl font-semibold">{topOffender.riskScore}</p>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <p>
                          <span className="font-medium">Last activity:</span>{' '}
                          {formatActivity(topOffender.latestActivity)}
                        </p>
                        <p>
                          <span className="font-medium">Location:</span>{' '}
                          {topOffender.latestLocation || 'Not specified'}
                        </p>
                        <p>
                          <span className="font-medium">Latest violation:</span>{' '}
                          {topOffender.latestViolationType?.replace(/_/g, ' ') || 'None in range'}
                        </p>
                      </div>

                      <div className="rounded-md bg-muted/60 p-3 text-sm">
                        {ACTION_COPY[topOffender.action].description}
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                        <Button asChild size="sm">
                          <Link
                            href={`/dashboard/violations?search=${encodeURIComponent(
                              topOffender.licensePlate
                            )}`}
                          >
                            Review violations
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={`/dashboard/vehicles?search=${encodeURIComponent(
                              topOffender.licensePlate
                            )}`}
                          >
                            Vehicle history
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="lg:col-span-2">
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                    {offenders.map((offender, index) => {
                      const ActionIcon = ACTION_COPY[offender.action].icon;

                      return (
                        <Link
                          key={offender.licensePlate}
                          href={`/dashboard/violations?search=${encodeURIComponent(
                            offender.licensePlate
                          )}`}
                          className={cn(
                            'rounded-md border p-3 transition-colors hover:bg-accent',
                            index === 0 && 'border-primary'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-mono font-semibold">{offender.licensePlate}</p>
                              <p className="line-clamp-1 text-xs text-muted-foreground">
                                {offender.vehicleDescription}
                              </p>
                            </div>
                            <ActionIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant="outline">{offender.violations} violations</Badge>
                            <Badge variant="secondary">{offender.patrolSightings} patrol</Badge>
                            {offender.isBlacklisted ? (
                              <Badge variant="destructive">Blacklisted</Badge>
                            ) : null}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
