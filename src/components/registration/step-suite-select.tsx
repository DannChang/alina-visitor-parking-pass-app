'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useFetchOnChange } from '@/hooks/use-fetch-on-change';
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
  const t = useTranslations('registration');
  const [units, setUnits] = useState<UnitResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(data.unitId ?? null);

  useFetchOnChange(() => {
    if (!data.buildingSlug) return;

    const fetchUnits = async () => {
      try {
        const res = await fetch(`/api/units?buildingSlug=${data.buildingSlug}`);
        if (!res.ok) throw new Error(t('failedToLoadUnits'));
        const result = await res.json();
        setUnits(result.units);
      } catch {
        setError(t('failedToLoadUnits'));
      } finally {
        setIsLoading(false);
      }
    };
    fetchUnits();
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
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">{t('loadingUnits')}</p>
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
        <CardTitle>{t('selectUnitTitle')}</CardTitle>
        <CardDescription>
          {t('selectUnitDesc', { building: data.buildingName ?? '' })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <p className="text-center text-sm text-destructive">{error}</p>
        ) : (
          <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto">
            {units.map((unit) => (
              <button
                key={unit.id}
                onClick={() => handleSelect(unit)}
                className={cn(
                  'min-h-[48px] touch-manipulation rounded-lg border p-3 text-center transition-colors',
                  selectedUnit === unit.id
                    ? 'border-primary bg-primary/10 font-semibold'
                    : 'hover:bg-accent'
                )}
              >
                <span className="text-sm">{unit.unitNumber}</span>
                {unit.floor && (
                  <span className="block text-xs text-muted-foreground">
                    {t('floor', { floor: unit.floor })}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onBack} className="min-h-[48px]">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t('back')}
          </Button>
          <Button onClick={handleContinue} disabled={!selectedUnit} className="min-h-[48px] flex-1">
            {t('continue')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
