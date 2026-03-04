'use client';

import { useState } from 'react';
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
  const [plate, setPlate] = useState(data.licensePlate ?? '');
  const [make, setMake] = useState(data.vehicleMake ?? '');
  const [model, setModel] = useState(data.vehicleModel ?? '');
  const [color, setColor] = useState(data.vehicleColor ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleContinue = () => {
    const cleaned = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length < 2 || cleaned.length > 10) {
      setError('Please enter a valid license plate (2-10 characters)');
      return;
    }
    setError(null);
    onUpdate({
      licensePlate: cleaned,
      vehicleMake: make || '',
      vehicleModel: model || '',
      vehicleColor: color || '',
    });
    onNext();
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Car className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Vehicle Information</CardTitle>
        <CardDescription>Enter your license plate number</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="licensePlate">License Plate *</Label>
          <Input
            id="licensePlate"
            placeholder="ABC1234"
            value={plate}
            onChange={(e) => {
              setPlate(e.target.value.toUpperCase());
              setError(null);
            }}
            className="uppercase h-12 text-base text-center font-mono text-lg tracking-wider"
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label htmlFor="make" className="text-xs">Make</Label>
            <Input
              id="make"
              placeholder="Toyota"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              className="h-10 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="model" className="text-xs">Model</Label>
            <Input
              id="model"
              placeholder="Camry"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="h-10 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="color" className="text-xs">Color</Label>
            <Input
              id="color"
              placeholder="Blue"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onBack} className="min-h-[48px]">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button onClick={handleContinue} className="flex-1 min-h-[48px]">
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
