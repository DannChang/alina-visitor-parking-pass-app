'use client';

import { useState, useCallback } from 'react';
import { useFetchOnChange } from '@/hooks/use-fetch-on-change';
import { format } from 'date-fns';
import { Loader2, Car, AlertTriangle, ClipboardList } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface VehicleHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string | null;
  licensePlate: string;
}

interface PassRecord {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  visitorPhone: string | null;
  visitorEmail: string | null;
  unitNumber: string;
  buildingName: string;
  passType: string;
  confirmationCode: string;
}

interface ViolationRecord {
  id: string;
  type: string;
  severity: string;
  description: string | null;
  location: string | null;
  isResolved: boolean;
  createdAt: string;
  loggedBy: string | null;
}

interface PatrolLogRecord {
  id: string;
  entryType: string;
  licensePlate: string;
  location: string | null;
  notes: string | null;
  createdAt: string;
  patroller: string | null;
}

interface VehicleInfo {
  id: string;
  licensePlate: string;
  make: string | null;
  model: string | null;
  color: string | null;
  isBlacklisted: boolean;
  blacklistReason: string | null;
  violationCount: number;
  riskScore: number;
  isResidentVehicle: boolean;
}

interface HistoryData {
  vehicle: VehicleInfo;
  passes: PassRecord[];
  violations: ViolationRecord[];
  patrolLogs: PatrolLogRecord[];
}

type TabId = 'passes' | 'violations' | 'patrol';

const PASS_STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  ACTIVE: { variant: 'default', className: 'bg-green-600 hover:bg-green-700' },
  EXPIRED: { variant: 'destructive' },
  CANCELLED: { variant: 'secondary' },
  EXTENDED: { variant: 'default', className: 'bg-blue-600 hover:bg-blue-700' },
};

const SEVERITY_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  CRITICAL: { variant: 'destructive' },
  HIGH: { variant: 'destructive' },
  MEDIUM: { variant: 'outline' },
  LOW: { variant: 'secondary' },
};

const ENTRY_TYPE_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  ENTRY: { variant: 'default', className: 'bg-green-600 hover:bg-green-700' },
  EXIT: { variant: 'destructive' },
  SPOT_CHECK: { variant: 'default', className: 'bg-blue-600 hover:bg-blue-700' },
  NOTE: { variant: 'secondary' },
};

export function VehicleHistoryDialog({
  open,
  onOpenChange,
  vehicleId,
  licensePlate,
}: VehicleHistoryDialogProps) {
  const t = useTranslations('patrol');
  const tc = useTranslations('common');
  const [activeTab, setActiveTab] = useState<TabId>('passes');
  const [data, setData] = useState<HistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/vehicles/${id}/history`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch vehicle history');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch vehicle history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFetchOnChange(() => {
    if (open && vehicleId) {
      fetchHistory(vehicleId);
    }
    if (!open) {
      setData(null);
      setActiveTab('passes');
      setError(null);
    }
  }, [open, vehicleId, fetchHistory]);

  const tabs: { id: TabId; label: string; icon: React.ElementType; count: number }[] = [
    { id: 'passes', label: tc('passes'), icon: Car, count: data?.passes.length ?? 0 },
    { id: 'violations', label: tc('violations'), icon: AlertTriangle, count: data?.violations.length ?? 0 },
    { id: 'patrol', label: t('tabPatrolLog'), icon: ClipboardList, count: data?.patrolLogs.length ?? 0 },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            {t('vehicleHistory')}
          </SheetTitle>
          <SheetDescription>
            {t('fullHistoryFor')} <strong>{licensePlate}</strong>
          </SheetDescription>
        </SheetHeader>

        {/* Vehicle summary */}
        {data?.vehicle && (
          <div className="mt-4 rounded-lg bg-slate-50 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">
                {data.vehicle.licensePlate}
              </span>
              <div className="flex gap-1">
                {data.vehicle.isBlacklisted && (
                  <Badge variant="destructive">{tc('blacklisted')}</Badge>
                )}
                {data.vehicle.isResidentVehicle && (
                  <Badge variant="outline">{t('vehicleResident')}</Badge>
                )}
              </div>
            </div>
            {(data.vehicle.make || data.vehicle.model || data.vehicle.color) && (
              <p className="text-sm text-slate-600">
                {[data.vehicle.color, data.vehicle.make, data.vehicle.model]
                  .filter(Boolean)
                  .join(' ')}
              </p>
            )}
            <div className="flex gap-4 text-sm text-slate-500">
              <span>{data.vehicle.violationCount} {tc('violations').toLowerCase()}</span>
              <span>{t('riskScore')} {data.vehicle.riskScore}/100</span>
            </div>
          </div>
        )}

        {/* Tab navigation */}
        <div className="mt-4 flex gap-1 border-b">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 rounded-none border-b-2 border-transparent',
                  activeTab === tab.id && 'border-primary bg-muted'
                )}
              >
                <Icon className="mr-1 h-4 w-4" />
                {tab.label}
                {data && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({tab.count})
                  </span>
                )}
              </Button>
            );
          })}
        </div>

        {/* Content area */}
        <div className="mt-4 space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">{t('loadingHistory')}</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!isLoading && !error && data && (
            <>
              {/* Passes tab */}
              {activeTab === 'passes' && (
                <div className="space-y-2">
                  {data.passes.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      {t('noRecords')}
                    </p>
                  ) : (
                    data.passes.map((pass) => {
                      const badgeConfig = PASS_STATUS_BADGE[pass.status] ?? { variant: 'outline' as const };
                      return (
                        <div
                          key={pass.id}
                          className="rounded-lg border p-3 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <Badge
                              variant={badgeConfig.variant}
                              className={badgeConfig.className}
                            >
                              {pass.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {pass.passType}
                            </span>
                          </div>
                          <div className="text-sm text-slate-700">
                            {pass.buildingName} - {tc('unit')} {pass.unitNumber}
                          </div>
                          {(pass.visitorEmail || pass.visitorPhone) && (
                            <div className="text-sm text-slate-600">
                              {tc('visitor')}:{' '}
                              {[pass.visitorEmail, pass.visitorPhone].filter(Boolean).join(' • ')}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(pass.startTime), 'MMM d, yyyy h:mm a')} -{' '}
                            {format(new Date(pass.endTime), 'MMM d, yyyy h:mm a')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t('confirmCode')} {pass.confirmationCode}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Violations tab */}
              {activeTab === 'violations' && (
                <div className="space-y-2">
                  {data.violations.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      {t('noRecords')}
                    </p>
                  ) : (
                    data.violations.map((violation) => {
                      const badgeConfig = SEVERITY_BADGE[violation.severity] ?? { variant: 'outline' as const };
                      return (
                        <div
                          key={violation.id}
                          className="rounded-lg border p-3 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-900">
                                {violation.type.replace(/_/g, ' ')}
                              </span>
                              <Badge variant={badgeConfig.variant}>
                                {violation.severity}
                              </Badge>
                            </div>
                            <Badge
                              variant={violation.isResolved ? 'secondary' : 'destructive'}
                            >
                              {violation.isResolved ? tc('resolved') : t('openViolation')}
                            </Badge>
                          </div>
                          {violation.description && (
                            <p className="text-sm text-slate-600">
                              {violation.description}
                            </p>
                          )}
                          {violation.location && (
                            <p className="text-xs text-muted-foreground">
                              {t('locationColonLabel')} {violation.location}
                            </p>
                          )}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {format(new Date(violation.createdAt), 'MMM d, yyyy h:mm a')}
                            </span>
                            {violation.loggedBy && (
                              <span>{t('byLabel')} {violation.loggedBy}</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Patrol Log tab */}
              {activeTab === 'patrol' && (
                <div className="space-y-2">
                  {data.patrolLogs.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      {t('noRecords')}
                    </p>
                  ) : (
                    data.patrolLogs.map((entry) => {
                      const badgeConfig = ENTRY_TYPE_BADGE[entry.entryType] ?? { variant: 'outline' as const };
                      return (
                        <div
                          key={entry.id}
                          className="rounded-lg border p-3 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <Badge
                              variant={badgeConfig.variant}
                              className={badgeConfig.className}
                            >
                              {entry.entryType.replace(/_/g, ' ')}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(entry.createdAt), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                          {entry.location && (
                            <p className="text-sm text-slate-600">
                              {t('locationColonLabel')} {entry.location}
                            </p>
                          )}
                          {entry.notes && (
                            <p className="text-sm text-slate-600">
                              {entry.notes}
                            </p>
                          )}
                          {entry.patroller && (
                            <p className="text-xs text-muted-foreground">
                              {t('patrollerLabel')} {entry.patroller}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
