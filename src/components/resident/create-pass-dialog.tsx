'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
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

interface CreatePassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreatePassDialog({ open, onOpenChange, onSuccess }: CreatePassDialogProps) {
  const [licensePlate, setLicensePlate] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [duration, setDuration] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !licensePlate.trim() ||
      !visitorName.trim() ||
      !vehicleMake.trim() ||
      !vehicleModel.trim() ||
      !vehicleYear.trim()
    ) {
      setError('License plate, visitor name, make, model, and year are required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/resident/passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licensePlate: licensePlate.toUpperCase().replace(/[^A-Z0-9]/g, ''),
          visitorName: visitorName.trim(),
          visitorPhone: visitorPhone.trim() || undefined,
          vehicleMake: vehicleMake.trim(),
          vehicleModel: vehicleModel.trim(),
          vehicleYear: Number(vehicleYear),
          duration,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create pass');
        return;
      }

      setLicensePlate('');
      setVisitorName('');
      setVisitorPhone('');
      setVehicleMake('');
      setVehicleModel('');
      setVehicleYear('');
      setDuration(2);
      onOpenChange(false);
      onSuccess();
    } catch {
      setError('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
