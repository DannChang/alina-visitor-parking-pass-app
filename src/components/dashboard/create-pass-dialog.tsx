'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, Building, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

export function CreatePassDialog({ open, onOpenChange, onSuccess }: CreatePassDialogProps) {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isResident = role === 'RESIDENT';

  const [licensePlate, setLicensePlate] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [duration, setDuration] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Staff-only fields
  const [buildingSearch, setBuildingSearch] = useState('');
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [buildingSlug, setBuildingSlug] = useState('');
  const [unitNumber, setUnitNumber] = useState('');

  // Building search for staff
  useEffect(() => {
    if (isResident || buildingSearch.length < 2) {
      setBuildings([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/buildings/search?q=${encodeURIComponent(buildingSearch)}`);
        if (res.ok) {
          const data = await res.json();
          setBuildings(data.buildings);
        }
      } catch {
        // Silently fail
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [buildingSearch, isResident]);

  const resetForm = () => {
    setLicensePlate('');
    setVisitorName('');
    setVisitorPhone('');
    setDuration(2);
    setError(null);
    setBuildingSearch('');
    setBuildings([]);
    setBuildingSlug('');
    setUnitNumber('');
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      resetForm();
    }
    onOpenChange(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!licensePlate.trim() || !visitorName.trim()) {
      setError('License plate and visitor name are required');
      return;
    }

    if (!isResident && (!buildingSlug || !unitNumber.trim())) {
      setError('Building and unit number are required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const normalizedPlate = licensePlate.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const phone = visitorPhone.trim();

      if (isResident) {
        // Resident: POST to /api/resident/passes
        const body: Record<string, string | number> = {
          licensePlate: normalizedPlate,
          visitorName: visitorName.trim(),
          duration,
        };
        if (phone) {
          body.visitorPhone = phone;
        }

        const res = await fetch('/api/resident/passes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Failed to create pass');
          return;
        }
      } else {
        // Staff: POST to /api/passes
        const body: Record<string, string | number> = {
          licensePlate: normalizedPlate,
          visitorName: visitorName.trim(),
          duration,
          buildingSlug,
          unitNumber: unitNumber.trim(),
        };
        if (phone) {
          body.visitorPhone = phone;
        }

        const res = await fetch('/api/passes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          const errorMessage = data.errors?.length
            ? data.errors.join('. ')
            : data.error || 'Failed to create pass';
          setError(errorMessage);
          return;
        }
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
                  <Building className="h-3 w-3 inline mr-1" />
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
                  <div className="space-y-1 max-h-32 overflow-y-auto border rounded-md p-1">
                    {buildings.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setBuildingSlug(b.slug);
                          setBuildingSearch(b.name);
                          setBuildings([]);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded"
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>
                  <Home className="h-3 w-3 inline mr-1" />
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
            <Label>Visitor Name *</Label>
            <Input
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              placeholder="John Smith"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label>License Plate *</Label>
            <Input
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
              placeholder="ABC1234"
              className="h-11 uppercase font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label>Phone (optional)</Label>
            <Input
              value={visitorPhone}
              onChange={(e) => setVisitorPhone(e.target.value)}
              placeholder="555-123-4567"
              type="tel"
              className="h-11"
            />
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

          <Button type="submit" className="w-full min-h-[48px]" disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
            ) : (
              'Create Pass'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
