'use client';

import { useCallback, useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, Building2, Clock, Hash, Loader2, Mail, MapPin, Phone } from 'lucide-react';
import { useFetchOnChange } from '@/hooks/use-fetch-on-change';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { toTelephoneHref } from '@/lib/utils/contact';

interface PassDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  passId: string | null;
}

interface PassDetails {
  id: string;
  status: string;
  duration: number;
  passType: string;
  confirmationCode: string;
  visitorPhone: string | null;
  visitorEmail: string | null;
  startTime: string;
  endTime: string;
  parkingZone: {
    id: string;
    name: string;
    code: string;
  } | null;
  vehicle: {
    id: string;
    licensePlate: string;
    make: string | null;
    model: string | null;
    year: number | null;
    color: string | null;
    state: string | null;
    isBlacklisted: boolean;
    violationCount: number;
    riskScore: number;
  };
  unit: {
    id: string;
    unitNumber: string;
    floor: number | null;
    section: string | null;
    building: {
      id: string;
      name: string;
      address: string | null;
    };
  };
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="text-sm text-foreground">{value}</div>
      </div>
    </div>
  );
}

export function PassDetailsSheet({
  open,
  onOpenChange,
  passId,
}: PassDetailsSheetProps) {
  const [pass, setPass] = useState<PassDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPass = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/passes/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load pass details');
      }

      setPass(data.pass);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error ? fetchError.message : 'Failed to load pass details'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFetchOnChange(() => {
    if (open && passId) {
      fetchPass(passId);
    }

    if (!open) {
      setPass(null);
      setError(null);
    }
  }, [open, passId, fetchPass]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Pass Details</SheetTitle>
          <SheetDescription>
            {pass ? `Parking pass for ${pass.vehicle.licensePlate}` : 'Loading parking pass'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading details...
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {!isLoading && !error && pass ? (
            <>
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xl font-bold">{pass.vehicle.licensePlate}</p>
                    <p className="text-sm text-muted-foreground">
                      {[pass.vehicle.year, pass.vehicle.color, pass.vehicle.make, pass.vehicle.model]
                        .filter(Boolean)
                        .join(' ') || 'Vehicle details not provided'}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Badge>{pass.status}</Badge>
                    <Badge variant="outline">{pass.passType}</Badge>
                    {pass.vehicle.isBlacklisted ? (
                      <Badge variant="destructive">Blacklisted</Badge>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <DetailRow
                  icon={Phone}
                  label="Contact"
                  value={
                    <>
                      {pass.visitorEmail ? (
                        <div>
                          <a className="text-primary hover:underline" href={`mailto:${pass.visitorEmail}`}>
                            {pass.visitorEmail}
                          </a>
                        </div>
                      ) : null}
                      {pass.visitorPhone ? (
                        <div>
                          <a className="text-primary hover:underline" href={toTelephoneHref(pass.visitorPhone)}>
                            {pass.visitorPhone}
                          </a>
                        </div>
                      ) : null}
                      {!pass.visitorEmail && !pass.visitorPhone ? (
                        <div>Not provided</div>
                      ) : null}
                    </>
                  }
                />
                <DetailRow
                  icon={Mail}
                  label="Notifications"
                  value="Confirmation and 15-minute reminder emails are sent to the visitor and resident."
                />
                <DetailRow
                  icon={Building2}
                  label="Unit"
                  value={
                    <>
                      <div>
                        {pass.unit.building.name}, Unit {pass.unit.unitNumber}
                      </div>
                      {pass.unit.building.address ? (
                        <div className="text-muted-foreground">
                          {pass.unit.building.address}
                        </div>
                      ) : null}
                    </>
                  }
                />
                <DetailRow
                  icon={Clock}
                  label="Timing"
                  value={
                    <>
                      <div>Starts {format(new Date(pass.startTime), 'PPpp')}</div>
                      <div>Ends {format(new Date(pass.endTime), 'PPpp')}</div>
                      <div className="text-muted-foreground">{pass.duration} hour(s)</div>
                    </>
                  }
                />
                <DetailRow
                  icon={Hash}
                  label="Confirmation"
                  value={<span className="font-mono">{pass.confirmationCode}</span>}
                />
                <DetailRow
                  icon={MapPin}
                  label="Parking Zone"
                  value={
                    pass.parkingZone ? (
                      <>
                        <div>{pass.parkingZone.name}</div>
                        <div className="text-muted-foreground">{pass.parkingZone.code}</div>
                      </>
                    ) : (
                      'Not assigned'
                    )
                  }
                />
                <DetailRow
                  icon={AlertTriangle}
                  label="Vehicle Risk"
                  value={`${pass.vehicle.violationCount} violation(s), risk score ${pass.vehicle.riskScore}`}
                />
              </div>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
