'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Car, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { WizardData } from './registration-wizard';

interface StepVehicleInfoProps {
  data: Partial<WizardData>;
  onUpdate: (data: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepVehicleInfo({ data, onUpdate, onNext, onBack }: StepVehicleInfoProps) {
  const t = useTranslations('registration');
  const [plate, setPlate] = useState(data.licensePlate ?? '');
  const [make, setMake] = useState(data.vehicleMake ?? '');
  const [model, setModel] = useState(data.vehicleModel ?? '');
  const [color, setColor] = useState(data.vehicleColor ?? '');
  const [year, setYear] = useState(data.vehicleYear ? String(data.vehicleYear) : '');
  const [error, setError] = useState<string | null>(null);

  const handleContinue = () => {
    const cleaned = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length < 2 || cleaned.length > 10) {
      setError(t('invalidLicensePlate'));
      return;
    }
    if (!year.trim()) {
      setError(t('vehicleYearRequired'));
      return;
    }
    setError(null);
    onUpdate({
      licensePlate: cleaned,
      vehicleMake: make || '',
      vehicleModel: model || '',
      vehicleColor: color || '',
      vehicleYear: Number(year),
    });
    onNext();
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Car className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>{t('vehicleInfoTitle')}</CardTitle>
        <CardDescription>{t('vehicleInfoDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="licensePlate">{t('licensePlate')} *</Label>
          <Input
            id="licensePlate"
            placeholder="ABC1234"
            value={plate}
            onChange={(e) => {
              setPlate(e.target.value.toUpperCase());
              setError(null);
            }}
            className="h-12 text-center font-mono text-base text-lg uppercase tracking-wider"
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="space-y-1">
            <Label htmlFor="make" className="text-xs">
              {t('make')}
            </Label>
            <Input
              id="make"
              placeholder="Toyota"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              className="h-10 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="model" className="text-xs">
              {t('model')}
            </Label>
            <Input
              id="model"
              placeholder="Camry"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="h-10 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="color" className="text-xs">
              {t('color')}
            </Label>
            <Input
              id="color"
              placeholder="Blue"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="year" className="text-xs">
              {t('year')}
            </Label>
            <Input
              id="year"
              placeholder="2024"
              value={year}
              onChange={(e) => setYear(e.target.value.replace(/[^0-9]/g, ''))}
              className="h-10 text-sm"
              inputMode="numeric"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onBack} className="min-h-[48px]">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t('back')}
          </Button>
          <Button onClick={handleContinue} className="min-h-[48px] flex-1">
            {t('continue')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
