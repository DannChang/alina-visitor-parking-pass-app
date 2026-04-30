'use client';

import { useCallback, useState } from 'react';
import type { TimeBankPeriod } from '@prisma/client';
import { useMountEffect } from '@/hooks/use-mount-effect';
import { useLocale, useTranslations } from 'next-intl';
import {
  AlertCircle,
  Building2,
  Car,
  ChevronDown,
  ChevronRight,
  Clock3,
  Loader2,
  Phone,
  Plus,
  Ticket,
} from 'lucide-react';
import { toast } from 'sonner';
import { CountdownTimer } from '@/components/pass/countdown-timer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatPassContact, toTelephoneHref } from '@/lib/utils/contact';
import { CreatePassDialog } from './create-pass-dialog';
import { useCountdown } from '@/hooks/use-countdown';

interface ResidentPass {
  id: string;
  status: string;
  duration: number;
  startTime: string;
  endTime: string;
  createdAt: string;
  confirmationCode: string;
  visitorPhone: string | null;
  visitorEmail: string | null;
  deletionReason: string | null;
  vehicle: {
    id: string;
    licensePlate: string;
    make: string | null;
    model: string | null;
    color: string | null;
  };
  unit: {
    id: string;
    unitNumber: string;
    building: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

interface ResidentPassLimits {
  allowedDurations: number[];
  maxActivePasses: number;
  monthlyHourBank: number;
  timeBankPeriod: TimeBankPeriod;
}

interface ResidentPassUsage {
  activePassCount: number;
  activePassLimit: number;
  monthlyHoursUsed: number;
  monthlyHoursRemaining: number;
}

const ACTIVE_STATUSES = new Set(['ACTIVE', 'EXTENDED']);

function formatStatusLabel(status: string, t: ReturnType<typeof useTranslations<'resident'>>) {
  switch (status) {
    case 'ACTIVE':
      return t('statusActive');
    case 'EXTENDED':
      return t('statusExtended');
    case 'EXPIRED':
      return t('statusExpired');
    case 'CANCELLED':
      return t('statusCancelled');
    case 'SUSPENDED':
      return t('statusSuspended');
    default:
      return status;
  }
}

function isActivePass(pass: ResidentPass) {
  return ACTIVE_STATUSES.has(pass.status) && new Date(pass.endTime) > new Date();
}

function getDisplayStatus(pass: ResidentPass) {
  if (ACTIVE_STATUSES.has(pass.status) && new Date(pass.endTime) <= new Date()) {
    return 'EXPIRED';
  }

  return pass.status;
}

function getStatusClasses(status: string) {
  switch (status) {
    case 'ACTIVE':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'EXTENDED':
      return 'border-sky-200 bg-sky-50 text-sky-700';
    case 'EXPIRED':
      return 'border-slate-200 bg-slate-100 text-slate-600';
    case 'CANCELLED':
      return 'border-slate-200 bg-white text-slate-600';
    case 'SUSPENDED':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border-slate-200 bg-white text-slate-700';
  }
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatShortDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatRelativeTime(value: string, locale: string) {
  const deltaSeconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const absSeconds = Math.abs(deltaSeconds);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (absSeconds < 60) {
    return formatter.format(deltaSeconds, 'second');
  }
  if (absSeconds < 3600) {
    return formatter.format(Math.round(deltaSeconds / 60), 'minute');
  }
  if (absSeconds < 86400) {
    return formatter.format(Math.round(deltaSeconds / 3600), 'hour');
  }

  return formatter.format(Math.round(deltaSeconds / 86400), 'day');
}

function formatVehicleDetails(pass: ResidentPass) {
  return [pass.vehicle.color, pass.vehicle.make, pass.vehicle.model].filter(Boolean).join(' ');
}

function PassCountdownPill({ endTime }: { endTime: string }) {
  const t = useTranslations('resident');
  const { hours, minutes, seconds, isExpired, isExpiringSoon } = useCountdown(endTime);

  const toneClass = isExpired
    ? 'border-slate-200 bg-slate-100 text-slate-600'
    : isExpiringSoon
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800';

  const pad = (value: number) => String(value).padStart(2, '0');

  return (
    <div
      className={cn('flex items-center justify-between rounded-2xl border px-4 py-3', toneClass)}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <Clock3 className="h-4 w-4" />
        {isExpired ? t('statusExpired') : t('expiresIn')}
      </div>
      <div className="font-mono text-lg font-semibold tabular-nums">
        {isExpired ? '00:00:00' : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`}
      </div>
    </div>
  );
}

function PassListSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((item) => (
        <Card key={item} className="overflow-hidden rounded-[28px] border-slate-200 shadow-sm">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-16 w-full rounded-2xl" />
            <div className="grid gap-3 sm:grid-cols-3">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ResidentPassesHub() {
  const t = useTranslations('resident');
  const locale = useLocale();
  const [passes, setPasses] = useState<ResidentPass[]>([]);
  const [expiredPasses, setExpiredPasses] = useState<ResidentPass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpiredLoading, setIsExpiredLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [hasLoadedExpired, setHasLoadedExpired] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expiredLoadError, setExpiredLoadError] = useState<string | null>(null);
  const [showExpiredPasses, setShowExpiredPasses] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedPassId, setSelectedPassId] = useState<string | null>(null);
  const [limits, setLimits] = useState<ResidentPassLimits>({
    allowedDurations: [2, 4, 8, 12, 24],
    maxActivePasses: 3,
    monthlyHourBank: 72,
    timeBankPeriod: 'MONTHLY',
  });
  const [usage, setUsage] = useState<ResidentPassUsage>({
    activePassCount: 0,
    activePassLimit: 3,
    monthlyHoursUsed: 0,
    monthlyHoursRemaining: 72,
  });

  const fetchPasses = useCallback(async () => {
    setIsLoading(true);

    try {
      const res = await fetch('/api/resident/passes?scope=active&limit=100');

      if (!res.ok) {
        throw new Error(t('couldNotLoadPasses'));
      }

      const data = await res.json();
      setPasses(data.passes);
      if (data.limits) {
        setLimits(data.limits);
      }
      if (data.usage) {
        setUsage(data.usage);
      }
      setLoadError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('couldNotLoadPasses');

      setLoadError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
      setHasLoadedOnce(true);
    }
  }, [t]);

  const fetchExpiredPasses = useCallback(async () => {
    setIsExpiredLoading(true);

    try {
      const res = await fetch('/api/resident/passes?scope=expired&limit=100');

      if (!res.ok) {
        throw new Error(t('couldNotLoadPasses'));
      }

      const data = await res.json();
      setExpiredPasses(data.passes);
      setExpiredLoadError(null);
      setHasLoadedExpired(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('couldNotLoadPasses');

      setExpiredLoadError(message);
      toast.error(message);
    } finally {
      setIsExpiredLoading(false);
    }
  }, [t]);

  useMountEffect(() => {
    fetchPasses();
  });

  const handleExpiredToggle = () => {
    const nextOpen = !showExpiredPasses;
    setShowExpiredPasses(nextOpen);

    if (nextOpen && !hasLoadedExpired && !isExpiredLoading) {
      void fetchExpiredPasses();
    }
  };

  const sortedPasses = [...passes].sort((left, right) => {
    const leftActive = isActivePass(left) ? 1 : 0;
    const rightActive = isActivePass(right) ? 1 : 0;

    if (leftActive !== rightActive) {
      return rightActive - leftActive;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
  const sortedExpiredPasses = [...expiredPasses].sort(
    (left, right) => new Date(right.endTime).getTime() - new Date(left.endTime).getTime()
  );
  const allVisiblePasses = [...sortedPasses, ...sortedExpiredPasses];

  const selectedPass = selectedPassId
    ? (allVisiblePasses.find((pass) => pass.id === selectedPassId) ?? null)
    : null;
  const timeBankPeriodLabel = t(
    limits.timeBankPeriod === 'DAILY'
      ? 'periodDaily'
      : limits.timeBankPeriod === 'WEEKLY'
        ? 'periodWeekly'
        : 'periodMonthly'
  );
  const timeBankWindowLabel = t(
    limits.timeBankPeriod === 'DAILY'
      ? 'windowDay'
      : limits.timeBankPeriod === 'WEEKLY'
        ? 'windowWeek'
        : 'windowMonth'
  );

  return (
    <>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[32px] bg-slate-950 text-white shadow-xl">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.28),_transparent_40%),linear-gradient(135deg,_#020617,_#0f172a_60%,_#1e293b)] px-6 py-7 sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-300">
                  {t('parkingPassesTitle')}
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                  {t('passHubTitle')}
                </h1>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="rounded-3xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                    {t('activeNow')}
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {usage.activePassCount}/{usage.activePassLimit}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                    {t('timeBank', { period: timeBankPeriodLabel })}
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {usage.monthlyHoursRemaining}/{limits.monthlyHourBank}h
                  </p>
                </div>
                <Button
                  type="button"
                  size="lg"
                  onClick={() => setShowCreateDialog(true)}
                  disabled={usage.activePassCount >= usage.activePassLimit}
                  className="rounded-3xl bg-white px-6 text-slate-950 hover:bg-slate-100"
                >
                  <Plus className="h-4 w-4" />
                  {t('newPass')}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">{t('yourPasses')}</h2>
            </div>
            {isLoading && hasLoadedOnce && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('refreshingPasses')}
              </div>
            )}
          </div>

          {isLoading && !hasLoadedOnce ? (
            <PassListSkeleton />
          ) : loadError && sortedPasses.length === 0 ? (
            <Card className="rounded-[28px] border-rose-200 bg-rose-50 shadow-sm">
              <CardContent className="flex flex-col items-center gap-4 px-6 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-rose-600 shadow-sm">
                  <AlertCircle className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-slate-950">
                    {t('couldNotLoadPasses')}
                  </h3>
                  <p className="text-sm text-slate-600">{loadError}</p>
                </div>
                <Button type="button" onClick={fetchPasses} className="rounded-full px-6">
                  {t('tryAgain')}
                </Button>
              </CardContent>
            </Card>
          ) : sortedPasses.length === 0 ? (
            <Card className="rounded-[28px] border-dashed border-slate-300 bg-white shadow-sm">
              <CardContent className="flex flex-col items-center gap-4 px-6 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <Car className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold text-slate-950">{t('noPassesYet')}</h3>
                  <p className="max-w-md text-sm text-slate-600">{t('noPassesDescription')}</p>
                </div>
                <Button
                  type="button"
                  size="lg"
                  onClick={() => setShowCreateDialog(true)}
                  className="rounded-full px-6"
                >
                  <Plus className="h-4 w-4" />
                  {t('createFirstPass')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sortedPasses.map((pass) => {
                const displayStatus = getDisplayStatus(pass);
                const vehicleDetails = formatVehicleDetails(pass);
                const active = isActivePass(pass);

                return (
                  <button
                    key={pass.id}
                    type="button"
                    onClick={() => setSelectedPassId(pass.id)}
                    className="block w-full rounded-[28px] border border-slate-200 bg-white p-0 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                  >
                    <div className="space-y-4 p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                            {active ? t('livePass') : t('passRecord')}
                          </p>
                          <div className="mt-2 flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                              <Car className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-mono text-xl font-semibold text-slate-950">
                                {pass.vehicle.licensePlate}
                              </p>
                              <p className="truncate text-sm text-slate-600">
                                {formatPassContact(pass.visitorEmail, pass.visitorPhone)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className={cn(
                            'shrink-0 rounded-full px-3 py-1 text-xs',
                            getStatusClasses(displayStatus)
                          )}
                        >
                          {formatStatusLabel(displayStatus, t)}
                        </Badge>
                      </div>

                      {active && <PassCountdownPill endTime={pass.endTime} />}

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            {t('starts')}
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-900">
                            {formatShortDateTime(pass.startTime, locale)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            {t('ends')}
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-900">
                            {formatShortDateTime(pass.endTime, locale)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            {t('duration')}
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-900">
                            {t('durationHours', { count: pass.duration })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-1 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">
                            {vehicleDetails || t('vehicleDetailsInside')}
                          </p>
                          <p className="truncate text-slate-500">
                            {displayStatus === 'EXPIRED'
                              ? t('expiredRelative', {
                                  time: formatRelativeTime(pass.endTime, locale),
                                })
                              : t('createdRelative', {
                                  time: formatRelativeTime(pass.createdAt, locale),
                                })}
                          </p>
                        </div>
                        <span className="flex items-center gap-1 font-medium text-slate-950">
                          {t('details')}
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="space-y-4">
            <button
              type="button"
              onClick={handleExpiredToggle}
              className="flex w-full items-center justify-between rounded-[24px] border border-slate-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
              aria-expanded={showExpiredPasses}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-950">{t('expiredPasses')}</p>
              </div>
              <div className="ml-4 flex items-center gap-2 text-slate-500">
                {isExpiredLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <ChevronDown
                  className={cn('h-5 w-5 transition-transform', showExpiredPasses && 'rotate-180')}
                />
              </div>
            </button>

            {showExpiredPasses && (
              <div className="space-y-4">
                {isExpiredLoading && !hasLoadedExpired ? (
                  <PassListSkeleton />
                ) : expiredLoadError && sortedExpiredPasses.length === 0 ? (
                  <Card className="rounded-[28px] border-rose-200 bg-rose-50 shadow-sm">
                    <CardContent className="flex flex-col items-center gap-4 px-6 py-10 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-rose-600 shadow-sm">
                        <AlertCircle className="h-7 w-7" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold text-slate-950">
                          {t('couldNotLoadPasses')}
                        </h3>
                        <p className="text-sm text-slate-600">{expiredLoadError}</p>
                      </div>
                      <Button
                        type="button"
                        onClick={fetchExpiredPasses}
                        className="rounded-full px-6"
                      >
                        {t('tryAgain')}
                      </Button>
                    </CardContent>
                  </Card>
                ) : sortedExpiredPasses.length === 0 ? (
                  <Card className="rounded-[28px] border-dashed border-slate-300 bg-white shadow-sm">
                    <CardContent className="flex flex-col items-center gap-3 px-6 py-8 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                        <Ticket className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-medium text-slate-700">{t('noExpiredPasses')}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {sortedExpiredPasses.map((pass) => {
                      const displayStatus = getDisplayStatus(pass);
                      const vehicleDetails = formatVehicleDetails(pass);

                      return (
                        <button
                          key={pass.id}
                          type="button"
                          onClick={() => setSelectedPassId(pass.id)}
                          className="block w-full rounded-[28px] border border-slate-200 bg-white p-0 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                        >
                          <div className="space-y-4 p-5 sm:p-6">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                                  {t('passRecord')}
                                </p>
                                <div className="mt-2 flex items-center gap-3">
                                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                                    <Car className="h-5 w-5" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate font-mono text-xl font-semibold text-slate-950">
                                      {pass.vehicle.licensePlate}
                                    </p>
                                    <p className="truncate text-sm text-slate-600">
                                      {formatPassContact(pass.visitorEmail, pass.visitorPhone)}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <Badge
                                variant="outline"
                                className={cn(
                                  'shrink-0 rounded-full px-3 py-1 text-xs',
                                  getStatusClasses(displayStatus)
                                )}
                              >
                                {formatStatusLabel(displayStatus, t)}
                              </Badge>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3">
                              <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                  {t('starts')}
                                </p>
                                <p className="mt-2 text-sm font-medium text-slate-900">
                                  {formatShortDateTime(pass.startTime, locale)}
                                </p>
                              </div>
                              <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                  {t('ends')}
                                </p>
                                <p className="mt-2 text-sm font-medium text-slate-900">
                                  {formatShortDateTime(pass.endTime, locale)}
                                </p>
                              </div>
                              <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                  {t('duration')}
                                </p>
                                <p className="mt-2 text-sm font-medium text-slate-900">
                                  {t('durationHours', { count: pass.duration })}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-1 text-sm">
                              <div className="min-w-0">
                                <p className="truncate font-medium text-slate-900">
                                  {vehicleDetails || t('vehicleDetailsInside')}
                                </p>
                                <p className="truncate text-slate-500">
                                  {t('expiredRelative', {
                                    time: formatRelativeTime(pass.endTime, locale),
                                  })}
                                </p>
                              </div>
                              <span className="flex items-center gap-1 font-medium text-slate-950">
                                {t('details')}
                                <ChevronRight className="h-4 w-4" />
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <CreatePassDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchPasses}
        allowedDurations={limits.allowedDurations}
        monthlyHourBank={limits.monthlyHourBank}
        timeBankPeriod={limits.timeBankPeriod}
        monthlyHoursRemaining={usage.monthlyHoursRemaining}
        activePassCount={usage.activePassCount}
        activePassLimit={usage.activePassLimit}
      />

      <Dialog
        open={selectedPass !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPassId(null);
          }
        }}
      >
        {selectedPass && (
          <DialogContent
            showHandle={false}
            className="overflow-auto border-0 p-0 md:inset-x-0 md:bottom-0 md:left-0 md:top-auto md:max-h-[90vh] md:w-full md:max-w-none md:translate-x-0 md:translate-y-0 md:rounded-b-none md:rounded-t-[32px] md:border-x-0 md:border-b-0 md:border-t lg:inset-auto lg:left-[50%] lg:top-[50%] lg:max-h-[85vh] lg:w-full lg:max-w-2xl lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[32px] lg:border [&>button]:bg-transparent [&>button]:text-white [&>button]:opacity-100"
          >
            <div className="bg-[linear-gradient(135deg,_#020617,_#0f172a_55%,_#1e293b)] px-6 py-7 text-white sm:px-8">
              <Badge
                variant="outline"
                className={cn(
                  'rounded-full border-white/20 bg-white/10 px-3 py-1 text-white',
                  getStatusClasses(getDisplayStatus(selectedPass))
                )}
              >
                {formatStatusLabel(getDisplayStatus(selectedPass), t)}
              </Badge>

              <DialogHeader className="mt-5 text-left">
                <DialogTitle className="font-mono text-3xl font-semibold tracking-tight text-white">
                  {selectedPass.vehicle.licensePlate}
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-300">
                  {formatPassContact(selectedPass.visitorEmail, selectedPass.visitorPhone)}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="space-y-6 bg-white px-6 py-6 sm:px-8">
              {isActivePass(selectedPass) && (
                <CountdownTimer endTime={selectedPass.endTime} className="p-5" />
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <Card className="rounded-3xl border-slate-200 shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Phone className="h-4 w-4 text-slate-500" />
                      {t('contactInfo')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        {t('phone')}
                      </p>
                      {selectedPass.visitorPhone ? (
                        <a
                          className="mt-1 inline-flex font-medium text-primary hover:underline"
                          href={toTelephoneHref(selectedPass.visitorPhone)}
                        >
                          {selectedPass.visitorPhone}
                        </a>
                      ) : (
                        <p className="mt-1 font-medium text-slate-950">{t('notProvided')}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        {t('email')}
                      </p>
                      {selectedPass.visitorEmail ? (
                        <a
                          className="mt-1 inline-flex font-medium text-primary hover:underline"
                          href={`mailto:${selectedPass.visitorEmail}`}
                        >
                          {selectedPass.visitorEmail}
                        </a>
                      ) : (
                        <p className="mt-1 font-medium text-slate-950">{t('notProvided')}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-slate-200 shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Building2 className="h-4 w-4 text-slate-500" />
                      {t('location')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        {t('building')}
                      </p>
                      <p className="mt-1 font-medium text-slate-950">
                        {selectedPass.unit.building.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        {t('unitNumber')}
                      </p>
                      <p className="mt-1 font-medium text-slate-950">
                        {selectedPass.unit.unitNumber}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-50 p-5">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    <Clock3 className="h-4 w-4" />
                    {t('timing')}
                  </p>
                  <div className="mt-4 space-y-4 text-sm">
                    <div>
                      <p className="text-slate-500">{t('starts')}</p>
                      <p className="mt-1 font-medium text-slate-950">
                        {formatDateTime(selectedPass.startTime, locale)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">{t('expires')}</p>
                      <p className="mt-1 font-medium text-slate-950">
                        {formatDateTime(selectedPass.endTime, locale)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">{t('duration')}</p>
                      <p className="mt-1 font-medium text-slate-950">
                        {t('durationHours', { count: selectedPass.duration })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl bg-slate-950 p-5 text-white">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                    <Ticket className="h-4 w-4" />
                    {t('passReference')}
                  </p>
                  <div className="mt-4 space-y-4 text-sm">
                    <div>
                      <p className="text-slate-400">{t('confirmationCode')}</p>
                      <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.24em]">
                        {selectedPass.confirmationCode.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">{t('vehicle')}</p>
                      <p className="mt-1 font-medium text-white">
                        {formatVehicleDetails(selectedPass) || t('noVehicleDetails')}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">{t('plate')}</p>
                      <p className="mt-1 font-mono font-medium text-white">
                        {selectedPass.vehicle.licensePlate}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedPass.deletionReason && (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-medium text-slate-900">{t('cancellationNote')}</p>
                  <p className="mt-1">{selectedPass.deletionReason}</p>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-slate-300"
                  onClick={() => setSelectedPassId(null)}
                >
                  {t('close')}
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
