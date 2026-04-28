'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useFetchOnChange } from '@/hooks/use-fetch-on-change';
import { Loader2, Building, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DURATION_OPTIONS = [2, 4, 8, 12, 24];

interface BuildingOption {
  id: string;
  name: string;
  slug: string;
}

interface CreatePassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function formatApiError(data: { error?: string; errors?: unknown[] }): string {
  if (!Array.isArray(data.errors) || data.errors.length === 0) {
    return data.error || 'Failed to create pass';
  }

  const messages = data.errors
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && 'message' in item) {
        const message = (item as { message?: unknown }).message;
        return typeof message === 'string' ? message : null;
      }
      return null;
    })
    .filter((message): message is string => Boolean(message));

  return messages.length > 0 ? messages.join('. ') : data.error || 'Failed to create pass';
}

export function CreatePassDialog({ open, onOpenChange, onSuccess }: CreatePassDialogProps) {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isResident = role === 'RESIDENT';

  const [licensePlate, setLicensePlate] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [duration, setDuration] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Staff-only fields
  const [buildingSearch, setBuildingSearch] = useState('');
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [buildingSlug, setBuildingSlug] = useState('');
  const [unitNumber, setUnitNumber] = useState('');

  // Resident: derive building/unit from session
  const sessionRecord = session as unknown as Record<string, string> | null;
  const sessionBuildingSlug = isResident ? (sessionRecord?.buildingSlug ?? '') : '';
  const sessionUnitNumber = isResident ? (sessionRecord?.unitNumber ?? '') : '';

  // Sync session values into state when they become available
  if (isResident && sessionBuildingSlug && !buildingSlug) {
    setBuildingSlug(sessionBuildingSlug);
  }
  if (isResident && sessionUnitNumber && !unitNumber) {
    setUnitNumber(sessionUnitNumber);
  }

  // Building search for staff (debounced)
  const debouncedBuildingSearch = useDebouncedValue(buildingSearch, 300);

  useFetchOnChange(() => {
    if (isResident || debouncedBuildingSearch.length < 2) {
      setBuildings([]);
      return;
    }
    const fetchBuildings = async () => {
      try {
        const res = await fetch(
          `/api/buildings/search?q=${encodeURIComponent(debouncedBuildingSearch)}`
        );
        if (res.ok) {
          const data = await res.json();
          setBuildings(data.buildings);
        }
      } catch {
        // Silently fail
      }
    };
    fetchBuildings();
  }, [debouncedBuildingSearch, isResident]);

  const resetForm = () => {
    setLicensePlate('');
    setVisitorPhone('');
    setVisitorEmail('');
    setVehicleMake('');
    setVehicleModel('');
    setVehicleYear('');
    setDuration(2);
    setError(null);
    // Only reset building/unit for staff — residents keep their auto-filled values
    if (!isResident) {
      setBuildingSearch('');
      setBuildings([]);
      setBuildingSlug('');
      setUnitNumber('');
    }
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      resetForm();
    }
    onOpenChange(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !licensePlate.trim() ||
      !visitorPhone.trim() ||
      !visitorEmail.trim() ||
      !vehicleMake.trim() ||
      !vehicleModel.trim() ||
      !vehicleYear.trim()
    ) {
      setError('License plate, phone, email, make, model, and year are required');
      return;
    }

    if (!buildingSlug || !unitNumber.trim()) {
      setError(
        isResident
          ? 'Unable to load your unit info. Please refresh and try again.'
          : 'Building and unit number are required'
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const normalizedPlate = licensePlate.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const phone = visitorPhone.trim();

      // Both residents and staff use /api/passes
      // Residents have buildingSlug/unitNumber auto-filled from their session
      const body: Record<string, string | number> = {
        licensePlate: normalizedPlate,
        visitorPhone: phone,
        visitorEmail: visitorEmail.trim(),
        duration,
        buildingSlug,
        unitNumber: unitNumber.trim(),
        vehicleMake: vehicleMake.trim(),
        vehicleModel: vehicleModel.trim(),
        vehicleYear: Number(vehicleYear),
      };

      const res = await fetch('/api/passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(formatApiError(data));
        return;
      }

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch {
      setError('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Parking Pass</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Staff-only: Building + Unit */}
          {!isResident && (
            <>
              <div className="space-y-2">
                <Label>
                  <Building className="mr-1 inline h-3 w-3" />
                  Building *
                </Label>
                <Input
                  value={buildingSearch}
                  onChange={(e) => {
                    setBuildingSearch(e.target.value);
                    setBuildingSlug('');
                  }}
                  placeholder="Search for a building..."
                  className="h-11 text-base"
                />
                {buildings.length > 0 && !buildingSlug && (
                  <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-1">
                    {buildings.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setBuildingSlug(b.slug);
                          setBuildingSearch(b.name);
                          setBuildings([]);
                        }}
                        className="w-full rounded px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>
                  <Home className="mr-1 inline h-3 w-3" />
                  Unit Number *
                </Label>
                <Input
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  placeholder="e.g. 101"
                  className="h-11 text-base"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>License Plate *</Label>
            <Input
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
              placeholder="ABC1234"
              className="h-11 font-mono uppercase"
            />
          </div>

          <div className="space-y-2">
            <Label>Phone *</Label>
            <Input
              value={visitorPhone}
              onChange={(e) => setVisitorPhone(e.target.value)}
              placeholder="555-123-4567"
              type="tel"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label>Email *</Label>
            <Input
              value={visitorEmail}
              onChange={(e) => setVisitorEmail(e.target.value)}
              placeholder="guest@example.com"
              type="email"
              className="h-11"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Make *</Label>
              <Input
                value={vehicleMake}
                onChange={(e) => setVehicleMake(e.target.value)}
                placeholder="Toyota"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Model *</Label>
              <Input
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder="Camry"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Year *</Label>
              <Input
                value={vehicleYear}
                onChange={(e) => setVehicleYear(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="2024"
                inputMode="numeric"
                className="h-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Duration</Label>
            <div className="grid grid-cols-5 gap-2">
              {DURATION_OPTIONS.map((d) => (
                <Button
                  key={d}
                  type="button"
                  variant={duration === d ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDuration(d)}
                  className="text-xs"
                >
                  {d}h
                </Button>
              ))}
            </div>
          </div>

          <Button type="submit" className="min-h-[48px] w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
              </>
            ) : (
              'Create Pass'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
