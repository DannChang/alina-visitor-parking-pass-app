'use client';

import { format } from 'date-fns';
import { AlertTriangle, ArrowUpCircle, MapPin, ShieldAlert, User } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

export interface ViolationDetails {
  id: string;
  createdAt: string;
  type: string;
  severity: string;
  escalationLevel: string;
  location: string | null;
  description?: string | null;
  isResolved: boolean;
  vehicle: {
    id: string;
    licensePlate: string;
    isBlacklisted: boolean;
  };
  loggedBy: {
    id?: string;
    name: string | null;
  } | null;
}

export function ViolationDetailsSheet({
  open,
  onOpenChange,
  violation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  violation: ViolationDetails | null;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Violation Details</SheetTitle>
          <SheetDescription>
            {violation ? `Violation for ${violation.vehicle.licensePlate}` : 'Violation details'}
          </SheetDescription>
        </SheetHeader>

        {violation ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xl font-bold">
                    {violation.vehicle.licensePlate}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Logged {format(new Date(violation.createdAt), 'PPpp')}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Badge variant={violation.isResolved ? 'secondary' : 'default'}>
                    {violation.isResolved ? 'Resolved' : 'Open'}
                  </Badge>
                  <Badge variant="outline">{violation.severity}</Badge>
                  {violation.vehicle.isBlacklisted ? (
                    <Badge variant="destructive">Blacklisted</Badge>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  Type
                </div>
                <p className="text-sm">{violation.type.replace(/_/g, ' ')}</p>
              </div>

              <div className="rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
                  Escalation
                </div>
                <p className="text-sm">
                  {violation.escalationLevel === 'NONE'
                    ? 'None'
                    : violation.escalationLevel.replace(/_/g, ' ')}
                </p>
              </div>

              <div className="rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Location
                </div>
                <p className="text-sm">{violation.location || 'Not specified'}</p>
              </div>

              <div className="rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Logged By
                </div>
                <p className="text-sm">{violation.loggedBy?.name || 'System'}</p>
              </div>

              <div className="rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                  Notes
                </div>
                <p className="text-sm">{violation.description || 'No description provided'}</p>
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
