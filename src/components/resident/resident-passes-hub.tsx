'use client';

import { useCallback, useState } from 'react';
import { useMountEffect } from '@/hooks/use-mount-effect';
import { format, formatDistanceToNowStrict } from 'date-fns';
import {
  AlertCircle,
  Building2,
  Car,
  ChevronRight,
  Clock3,
  Loader2,
  Plus,
  Ticket,
  UserRound,
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
  visitorName: string | null;
  visitorPhone: string | null;
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

const ACTIVE_STATUSES = new Set(['ACTIVE', 'EXTENDED']);

function formatStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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

function formatDateTime(value: string) {
  return format(new Date(value), 'MMM d, yyyy · h:mm a');
}

function formatVehicleDetails(pass: ResidentPass) {
  return [pass.vehicle.color, pass.vehicle.make, pass.vehicle.model].filter(Boolean).join(' ');
}

function PassCountdownPill({ endTime }: { endTime: string }) {
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
        {isExpired ? 'Expired' : 'Expires in'}
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
  const [passes, setPasses] = useState<ResidentPass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedPassId, setSelectedPassId] = useState<string | null>(null);

  const fetchPasses = useCallback(async () => {
    setIsLoading(true);

    try {
      const res = await fetch('/api/resident/passes?limit=100');

      if (!res.ok) {
        throw new Error('Failed to load parking passes');
      }

      const data = await res.json();
      setPasses(data.passes);
      setLoadError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load parking passes';

      setLoadError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
      setHasLoadedOnce(true);
    }
  }, []);

  useMountEffect(() => {
    fetchPasses();
  });

  const sortedPasses = [...passes].sort((left, right) => {
    const leftActive = isActivePass(left) ? 1 : 0;
    const rightActive = isActivePass(right) ? 1 : 0;

    if (leftActive !== rightActive) {
      return rightActive - leftActive;
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });

  const activePasses = sortedPasses.filter(isActivePass);
  const selectedPass = selectedPassId
    ? (sortedPasses.find((pass) => pass.id === selectedPassId) ?? null)
    : null;

  return (
    <>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[32px] bg-slate-950 text-white shadow-xl">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.28),_transparent_40%),linear-gradient(135deg,_#020617,_#0f172a_60%,_#1e293b)] px-6 py-7 sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-300">
                  Parking Passes
                </p>
                <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                  Resident pass hub
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                  Manage visitor access without the dashboard table. Active passes stay live here,
                  and every pass opens into a full detail view.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="rounded-3xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                    Active Now
                  </p>
                  <p className="mt-2 text-3xl font-semibold">{activePasses.length}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
                    Total Passes
                  </p>
                  <p className="mt-2 text-3xl font-semibold">{sortedPasses.length}</p>
                </div>
                <Button
                  type="button"
                  size="lg"
                  onClick={() => setShowCreateDialog(true)}
                  className="rounded-3xl bg-white px-6 text-slate-950 hover:bg-slate-100"
                >
                  <Plus className="h-4 w-4" />
                  New Pass
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Your passes</h2>
              <p className="text-sm text-slate-600">
                Tap any pass to view visitor details, timing, and the confirmation code.
              </p>
            </div>
            {isLoading && hasLoadedOnce && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Refreshing passes
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
                  <h3 className="text-lg font-semibold text-slate-950">Could not load passes</h3>
                  <p className="text-sm text-slate-600">{loadError}</p>
                </div>
                <Button type="button" onClick={fetchPasses} className="rounded-full px-6">
                  Try again
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
                  <h3 className="text-xl font-semibold text-slate-950">No passes yet</h3>
                  <p className="max-w-md text-sm text-slate-600">
                    Create a pass when a visitor arrives. Active passes will stay pinned at the top
                    with a live countdown.
                  </p>
                </div>
                <Button
                  type="button"
                  size="lg"
                  onClick={() => setShowCreateDialog(true)}
                  className="rounded-full px-6"
                >
                  <Plus className="h-4 w-4" />
                  Create your first pass
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
                            {active ? 'Live pass' : 'Pass record'}
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
                                {pass.visitorName || 'Visitor name not provided'}
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
                          {formatStatusLabel(displayStatus)}
                        </Badge>
                      </div>

                      {active && <PassCountdownPill endTime={pass.endTime} />}

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Starts
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-900">
                            {format(new Date(pass.startTime), 'MMM d · h:mm a')}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Ends
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-900">
                            {format(new Date(pass.endTime), 'MMM d · h:mm a')}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Duration
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-900">
                            {pass.duration} hour{pass.duration === 1 ? '' : 's'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-1 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">
                            {vehicleDetails || 'Vehicle details can be viewed inside'}
                          </p>
                          <p className="truncate text-slate-500">
                            {displayStatus === 'EXPIRED'
                              ? `Expired ${formatDistanceToNowStrict(new Date(pass.endTime), {
                                  addSuffix: true,
                                })}`
                              : `Created ${formatDistanceToNowStrict(new Date(pass.createdAt), {
                                  addSuffix: true,
                                })}`}
                          </p>
                        </div>
                        <span className="flex items-center gap-1 font-medium text-slate-950">
                          Details
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <CreatePassDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchPasses}
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
            className="overflow-auto border-0 p-0 md:inset-x-0 md:bottom-0 md:left-0 md:top-auto md:max-h-[90vh] md:w-full md:max-w-none md:translate-x-0 md:translate-y-0 md:rounded-t-[32px] md:rounded-b-none md:border-t md:border-x-0 md:border-b-0 lg:inset-auto lg:left-[50%] lg:top-[50%] lg:max-h-[85vh] lg:w-full lg:max-w-2xl lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[32px] lg:border [&>button]:bg-transparent [&>button]:text-white [&>button]:opacity-100"
          >
            <div className="bg-[linear-gradient(135deg,_#020617,_#0f172a_55%,_#1e293b)] px-6 py-7 text-white sm:px-8">
              <Badge
                variant="outline"
                className={cn(
                  'rounded-full border-white/20 bg-white/10 px-3 py-1 text-white',
                  getStatusClasses(getDisplayStatus(selectedPass))
                )}
              >
                {formatStatusLabel(getDisplayStatus(selectedPass))}
              </Badge>

              <DialogHeader className="mt-5 text-left">
                <DialogTitle className="font-mono text-3xl font-semibold tracking-tight text-white">
                  {selectedPass.vehicle.licensePlate}
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-300">
                  {selectedPass.visitorName || 'Visitor name not provided'}
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
                      <UserRound className="h-4 w-4 text-slate-500" />
                      Visitor
                    </CardTitle>
                    <CardDescription>Primary contact details for this pass</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Name
                      </p>
                      <p className="mt-1 font-medium text-slate-950">
                        {selectedPass.visitorName || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Phone
                      </p>
                      <p className="mt-1 font-medium text-slate-950">
                        {selectedPass.visitorPhone || 'Not provided'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-slate-200 shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Building2 className="h-4 w-4 text-slate-500" />
                      Location
                    </CardTitle>
                    <CardDescription>Building and unit tied to this record</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Building
                      </p>
                      <p className="mt-1 font-medium text-slate-950">
                        {selectedPass.unit.building.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Unit
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
                    Timing
                  </p>
                  <div className="mt-4 space-y-4 text-sm">
                    <div>
                      <p className="text-slate-500">Starts</p>
                      <p className="mt-1 font-medium text-slate-950">
                        {formatDateTime(selectedPass.startTime)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Expires</p>
                      <p className="mt-1 font-medium text-slate-950">
                        {formatDateTime(selectedPass.endTime)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Duration</p>
                      <p className="mt-1 font-medium text-slate-950">
                        {selectedPass.duration} hour
                        {selectedPass.duration === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl bg-slate-950 p-5 text-white">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                    <Ticket className="h-4 w-4" />
                    Pass Reference
                  </p>
                  <div className="mt-4 space-y-4 text-sm">
                    <div>
                      <p className="text-slate-400">Confirmation code</p>
                      <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.24em]">
                        {selectedPass.confirmationCode.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Vehicle</p>
                      <p className="mt-1 font-medium text-white">
                        {formatVehicleDetails(selectedPass) || 'No extra vehicle details'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Plate</p>
                      <p className="mt-1 font-mono font-medium text-white">
                        {selectedPass.vehicle.licensePlate}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedPass.deletionReason && (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-medium text-slate-900">Cancellation note</p>
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
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
