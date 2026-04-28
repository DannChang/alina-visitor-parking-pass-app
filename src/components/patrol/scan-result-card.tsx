'use client';

import { useState } from 'react';
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
  Timer,
  Home,
  ShieldAlert,
  Pencil,
  Search,
  MapPin,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { formatPassContact } from '@/lib/utils/contact';
import type { PatrolLookupResult, VehicleStatus } from '@/app/api/patrol/lookup/route';

interface ScanResultCardProps {
  result: PatrolLookupResult;
  searchedPlate?: string;
  onIssueViolation: () => void;
  onViewHistory: () => void;
  onAddVehicle?: () => void;
  onEditPlate?: (licensePlate: string) => void | Promise<void>;
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
  IN_GRACE_PERIOD: {
    icon: Timer,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-500',
    textColor: 'text-amber-900',
    iconColor: 'text-amber-600',
    label: 'In Grace Period',
  },
  RESIDENT_IN_VISITOR: {
    icon: Home,
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-500',
    textColor: 'text-purple-900',
    iconColor: 'text-purple-600',
    label: 'Resident Vehicle',
  },
};

export function ScanResultCard({
  result,
  searchedPlate,
  onIssueViolation,
  onViewHistory,
  onAddVehicle,
  onEditPlate,
  className,
}: ScanResultCardProps) {
  const config = STATUS_CONFIG[result.status];
  const StatusIcon = config.icon;

  const currentPlate = result.vehicle?.licensePlate ?? searchedPlate ?? '';
  const [isEditingPlate, setIsEditingPlate] = useState(false);
  const [editedPlate, setEditedPlate] = useState(currentPlate);

  const hasAutoViolation = result.autoCreatedViolation?.isNew === true;
  const canIssueViolation = result.status !== 'VALID' && result.status !== 'EXPIRING_SOON';
  const canAddVehicle = result.status === 'NOT_FOUND' && Boolean(onAddVehicle);
  const hasVehicleHistory = Boolean(result.vehicle?.id);

  const handleStartEditing = () => {
    setEditedPlate(currentPlate);
    setIsEditingPlate(true);
  };

  const handleCancelEditing = () => {
    setIsEditingPlate(false);
    setEditedPlate(currentPlate);
  };

  const handleSubmitEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!onEditPlate) return;
    const trimmed = editedPlate.trim();
    if (!trimmed || trimmed === currentPlate.trim()) {
      setIsEditingPlate(false);
      return;
    }
    setIsEditingPlate(false);
    await onEditPlate(trimmed);
  };

  return (
    <Card
      className={cn('overflow-hidden border-l-4', config.bgColor, config.borderColor, className)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon className={cn('h-8 w-8', config.iconColor)} />
            <div>
              <CardTitle className={cn('text-lg', config.textColor)}>{config.label}</CardTitle>
              <p className={cn('text-sm', config.textColor, 'opacity-80')}>
                {result.statusMessage}
              </p>
            </div>
          </div>
          {result.status === 'BLACKLISTED' && (
            <AlertOctagon className="h-10 w-10 animate-pulse text-red-700" />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Vehicle Info */}
        {result.vehicle && (
          <div className="rounded-lg bg-white/60 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Car className="h-4 w-4 text-slate-600" />
              <span className="font-semibold text-slate-900">{result.vehicle.licensePlate}</span>
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
            {result.vehicle.stallNumber && (
              <p className="mt-1 flex items-center gap-1 text-sm text-slate-600">
                <MapPin className="h-3.5 w-3.5 text-slate-500" />
                Stall {result.vehicle.stallNumber}
              </p>
            )}
            {result.vehicle.violationCount > 0 && (
              <p className="mt-1 text-sm text-orange-700">
                {result.vehicle.violationCount} previous violation(s)
              </p>
            )}
          </div>
        )}

        {/* Auto-Created Violation Banner */}
        {hasAutoViolation && result.autoCreatedViolation && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <ShieldAlert className="h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-800">Violation Auto-Logged</p>
              <p className="text-xs text-red-700">
                {String(result.autoCreatedViolation.type).replace(/_/g, ' ')} &mdash;{' '}
                {String(result.autoCreatedViolation.severity)} severity
              </p>
            </div>
          </div>
        )}

        {/* Active Pass Info */}
        {result.activePass && (
          <div className="rounded-lg bg-white/60 p-3">
            <div className="mb-2 flex items-center gap-2">
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
                  {formatPassContact(
                    result.activePass.visitorEmail,
                    result.activePass.visitorPhone
                  )}
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
              <Clock className="mr-1 inline h-3 w-3" />
              Expires: {format(new Date(result.activePass.endTime), 'h:mm a')}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Code: {result.activePass.confirmationCode}
            </div>
          </div>
        )}

        {/* Blacklist Reason */}
        {result.status === 'BLACKLISTED' && result.vehicle?.blacklistReason && (
          <div className="rounded-lg border border-red-300 bg-red-100 p-3">
            <p className="font-semibold text-red-800">Blacklist Reason:</p>
            <p className="text-red-700">{result.vehicle.blacklistReason}</p>
          </div>
        )}

        {/* Recent Violations */}
        {result.violations.length > 0 && (
          <div className="rounded-lg bg-white/60 p-3">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="font-medium text-slate-900">
                Recent Violations ({result.violations.length})
              </span>
            </div>
            <div className="space-y-1">
              {result.violations.slice(0, 3).map((violation) => (
                <div key={violation.id} className="flex items-center justify-between text-sm">
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
          {canAddVehicle && onAddVehicle && (
            <Button onClick={onAddVehicle} variant="secondary" className="flex-1" size="touch">
              <Car className="mr-2 h-5 w-5" />
              Add Vehicle
            </Button>
          )}
          {canIssueViolation && (
            <Button
              onClick={onIssueViolation}
              variant={hasAutoViolation ? 'outline' : 'destructive'}
              className={cn(canAddVehicle ? '' : 'flex-1')}
              size="touch"
            >
              <AlertTriangle className="mr-2 h-5 w-5" />
              {hasAutoViolation ? 'Log Additional Violation' : 'Issue Violation'}
            </Button>
          )}
          <Button
            onClick={onViewHistory}
            variant="outline"
            className={cn(canIssueViolation || canAddVehicle ? '' : 'flex-1')}
            size="touch"
            disabled={!hasVehicleHistory}
          >
            <History className="mr-2 h-5 w-5" />
            History
          </Button>
        </div>

        {/* Edit plate / re-lookup */}
        {onEditPlate && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white/60 p-3">
            {!isEditingPlate ? (
              <button
                type="button"
                onClick={handleStartEditing}
                className="flex w-full items-center justify-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                <Pencil className="h-4 w-4" />
                Wrong plate? Edit and re-lookup
              </button>
            ) : (
              <form onSubmit={handleSubmitEdit} className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={editedPlate}
                  onChange={(event) => setEditedPlate(event.target.value.toUpperCase())}
                  className="h-11 flex-1 font-mono text-base tracking-wider"
                  autoFocus
                />
                <Button type="submit" size="sm" disabled={!editedPlate.trim()}>
                  <Search className="mr-2 h-4 w-4" />
                  Re-lookup
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={handleCancelEditing}>
                  Cancel
                </Button>
              </form>
            )}
          </div>
        )}

        {/* Lookup timestamp */}
        <p className="text-center text-xs text-slate-500">
          Looked up at {format(new Date(result.lookupTime), 'h:mm:ss a')}
        </p>
      </CardContent>
    </Card>
  );
}
