'use client';

import { format } from 'date-fns';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Ban,
  HelpCircle,
  Car,
  User,
  Building,
  AlertOctagon,
  History,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { PatrolLookupResult, VehicleStatus } from '@/app/api/patrol/lookup/route';

interface ScanResultCardProps {
  result: PatrolLookupResult;
  onIssueViolation: () => void;
  onViewHistory: () => void;
  className?: string;
}

const STATUS_CONFIG: Record<
  VehicleStatus,
  {
    icon: React.ElementType;
    bgColor: string;
    borderColor: string;
    textColor: string;
    iconColor: string;
    label: string;
  }
> = {
  VALID: {
    icon: CheckCircle2,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-500',
    textColor: 'text-green-900',
    iconColor: 'text-green-600',
    label: 'Valid Pass',
  },
  EXPIRING_SOON: {
    icon: Clock,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-500',
    textColor: 'text-yellow-900',
    iconColor: 'text-yellow-600',
    label: 'Expiring Soon',
  },
  EXPIRED: {
    icon: XCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-500',
    textColor: 'text-red-900',
    iconColor: 'text-red-600',
    label: 'Expired',
  },
  NOT_FOUND: {
    icon: HelpCircle,
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-400',
    textColor: 'text-slate-900',
    iconColor: 'text-slate-500',
    label: 'Not Found',
  },
  UNREGISTERED: {
    icon: AlertTriangle,
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-500',
    textColor: 'text-orange-900',
    iconColor: 'text-orange-600',
    label: 'No Active Pass',
  },
  BLACKLISTED: {
    icon: Ban,
    bgColor: 'bg-red-100',
    borderColor: 'border-red-700',
    textColor: 'text-red-900',
    iconColor: 'text-red-700',
    label: 'BLACKLISTED',
  },
};

export function ScanResultCard({
  result,
  onIssueViolation,
  onViewHistory,
  className,
}: ScanResultCardProps) {
  const config = STATUS_CONFIG[result.status];
  const StatusIcon = config.icon;

  const canIssueViolation =
    result.status !== 'VALID' && result.status !== 'EXPIRING_SOON';

  return (
    <Card
      className={cn(
        'overflow-hidden border-l-4',
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon className={cn('h-8 w-8', config.iconColor)} />
            <div>
              <CardTitle className={cn('text-lg', config.textColor)}>
                {config.label}
              </CardTitle>
              <p className={cn('text-sm', config.textColor, 'opacity-80')}>
                {result.statusMessage}
              </p>
            </div>
          </div>
          {result.status === 'BLACKLISTED' && (
            <AlertOctagon className="h-10 w-10 text-red-700 animate-pulse" />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Vehicle Info */}
        {result.vehicle && (
          <div className="rounded-lg bg-white/60 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Car className="h-4 w-4 text-slate-600" />
              <span className="font-semibold text-slate-900">
                {result.vehicle.licensePlate}
              </span>
              {result.vehicle.riskScore > 50 && (
                <Badge variant="destructive" className="text-xs">
                  High Risk
                </Badge>
              )}
            </div>
            {(result.vehicle.make || result.vehicle.model || result.vehicle.color) && (
              <p className="text-sm text-slate-600">
                {[result.vehicle.color, result.vehicle.make, result.vehicle.model]
                  .filter(Boolean)
                  .join(' ')}
              </p>
            )}
            {result.vehicle.violationCount > 0 && (
              <p className="text-sm text-orange-700 mt-1">
                {result.vehicle.violationCount} previous violation(s)
              </p>
            )}
          </div>
        )}

        {/* Active Pass Info */}
        {result.activePass && (
          <div className="rounded-lg bg-white/60 p-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="font-medium text-slate-900">Active Pass</span>
              {result.activePass.isEmergency && (
                <Badge className="bg-red-600 text-xs">Emergency</Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3 text-slate-500" />
                <span className="text-slate-700">
                  {result.activePass.visitorName || 'Unknown'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Building className="h-3 w-3 text-slate-500" />
                <span className="text-slate-700">
                  {result.activePass.buildingName} - {result.activePass.unitNumber}
                </span>
              </div>
            </div>
            <div className="mt-2 text-sm text-slate-600">
              <Clock className="h-3 w-3 inline mr-1" />
              Expires: {format(new Date(result.activePass.endTime), 'h:mm a')}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Code: {result.activePass.confirmationCode}
            </div>
          </div>
        )}

        {/* Blacklist Reason */}
        {result.status === 'BLACKLISTED' && result.vehicle?.blacklistReason && (
          <div className="rounded-lg bg-red-100 p-3 border border-red-300">
            <p className="font-semibold text-red-800">Blacklist Reason:</p>
            <p className="text-red-700">{result.vehicle.blacklistReason}</p>
          </div>
        )}

        {/* Recent Violations */}
        {result.violations.length > 0 && (
          <div className="rounded-lg bg-white/60 p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="font-medium text-slate-900">
                Recent Violations ({result.violations.length})
              </span>
            </div>
            <div className="space-y-1">
              {result.violations.slice(0, 3).map((violation) => (
                <div
                  key={violation.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-700">{violation.type}</span>
                  <span className="text-slate-500">
                    {format(new Date(violation.createdAt), 'MMM d')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex gap-2">
          {canIssueViolation && (
            <Button
              onClick={onIssueViolation}
              variant="destructive"
              className="flex-1"
              size="touch"
            >
              <AlertTriangle className="mr-2 h-5 w-5" />
              Issue Violation
            </Button>
          )}
          <Button
            onClick={onViewHistory}
            variant="outline"
            className={cn(canIssueViolation ? '' : 'flex-1')}
            size="touch"
          >
            <History className="mr-2 h-5 w-5" />
            History
          </Button>
        </div>

        {/* Lookup timestamp */}
        <p className="text-xs text-center text-slate-500">
          Looked up at {format(new Date(result.lookupTime), 'h:mm:ss a')}
        </p>
      </CardContent>
    </Card>
  );
}
