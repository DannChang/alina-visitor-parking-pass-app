'use client';

import { useState, useEffect } from 'react';
import { Home, Loader2, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { WizardData } from './registration-wizard';

interface UnitResult {
  id: string;
  unitNumber: string;
  floor: number | null;
  section: string | null;
  hasAccessCode: boolean;
}

interface StepSuiteSelectProps {
  data: Partial<WizardData>;
  onUpdate: (data: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepSuiteSelect({ data, onUpdate, onNext, onBack }: StepSuiteSelectProps) {
  const [units, setUnits] = useState<UnitResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(data.unitId ?? null);

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const res = await fetch(`/api/units?buildingSlug=${data.buildingSlug}`);
        if (!res.ok) throw new Error('Failed to load units');
        const result = await res.json();
        setUnits(result.units);
      } catch {
        setError('Failed to load units. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    if (data.buildingSlug) fetchUnits();
  }, [data.buildingSlug]);

  const handleSelect = (unit: UnitResult) => {
    setSelectedUnit(unit.id);
    onUpdate({
      unitId: unit.id,
      unitNumber: unit.unitNumber,
      hasAccessCode: unit.hasAccessCode,
    });
  };

  const handleContinue = () => {
    if (selectedUnit) onNext();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading units...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Home className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Select Unit</CardTitle>
        <CardDescription>
          Which unit are you visiting at {data.buildingName}?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <p className="text-center text-sm text-destructive">{error}</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
            {units.map((unit) => (
              <button
                key={unit.id}
                onClick={() => handleSelect(unit)}
                className={cn(
                  'rounded-lg border p-3 text-center transition-colors min-h-[48px] touch-manipulation',
                  selectedUnit === unit.id
                    ? 'border-primary bg-primary/10 font-semibold'
                    : 'hover:bg-accent'
                )}
              >
                <span className="text-sm">{unit.unitNumber}</span>
                {unit.floor && (
                  <span className="block text-xs text-muted-foreground">
                    Floor {unit.floor}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onBack} className="min-h-[48px]">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!selectedUnit}
            className="flex-1 min-h-[48px]"
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
