'use client';

import { useEffect, useState } from 'react';
import type { TimeBankPeriod } from '@prisma/client';
import { Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  formatTimeBankPeriod,
  formatTimeBankResetDescription,
  formatTimeBankWindowLabel,
} from '@/lib/parking-rules';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface CreatePassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  allowedDurations: number[];
  monthlyHourBank: number;
  timeBankPeriod: TimeBankPeriod;
  monthlyHoursRemaining: number;
  activePassCount: number;
  activePassLimit: number;
}

export function CreatePassDialog({
  open,
  onOpenChange,
  onSuccess,
  allowedDurations,
  monthlyHourBank,
  timeBankPeriod,
  monthlyHoursRemaining,
  activePassCount,
  activePassLimit,
}: CreatePassDialogProps) {
  const [licensePlate, setLicensePlate] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [duration, setDuration] = useState(allowedDurations[0] ?? 2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeBankPeriodLabel = formatTimeBankPeriod(timeBankPeriod);
  const timeBankWindowLabel = formatTimeBankWindowLabel(timeBankPeriod);

  useEffect(() => {
    if (!allowedDurations.includes(duration)) {
      setDuration(allowedDurations[0] ?? 2);
    }
  }, [allowedDurations, duration]);

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

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/resident/passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licensePlate: licensePlate.toUpperCase().replace(/[^A-Z0-9]/g, ''),
          visitorPhone: visitorPhone.trim(),
          visitorEmail: visitorEmail.trim(),
          vehicleMake: vehicleMake.trim(),
          vehicleModel: vehicleModel.trim(),
          vehicleYear: Number(vehicleYear),
          duration,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        const validationMessage =
          Array.isArray(data.errors) && data.errors[0]?.message ? data.errors[0].message : null;
        setError(validationMessage || data.error || 'Failed to create pass');
        return;
      }

      setLicensePlate('');
      setVisitorPhone('');
      setVisitorEmail('');
      setVehicleMake('');
      setVehicleModel('');
      setVehicleYear('');
      setDuration(allowedDurations[0] ?? 2);
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
      <DialogContent className="md:inset-x-0 md:bottom-0 md:left-0 md:top-auto md:max-h-[90vh] md:w-full md:max-w-none md:translate-x-0 md:translate-y-0 md:rounded-b-none md:rounded-t-[32px] md:border-x-0 md:border-b-0 md:border-t lg:inset-auto lg:left-[50%] lg:top-[50%] lg:max-h-[85vh] lg:w-full lg:max-w-sm lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-lg lg:border">
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
            <div className="flex items-center gap-2">
              <Label>Duration</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-500 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                    aria-label="Pass time bank info"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 text-sm leading-6">
                  Time is deducted from your unit&apos;s {monthlyHourBank}-hour{' '}
                  {timeBankPeriodLabel} bank. {formatTimeBankResetDescription(timeBankPeriod)}
                </PopoverContent>
              </Popover>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p>
                {monthlyHoursRemaining} of {monthlyHourBank} hours remaining this{' '}
                {timeBankWindowLabel}.
              </p>
              <p>
                {activePassCount} of {activePassLimit} active passes currently in use.
              </p>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {allowedDurations.map((d) => (
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

          <Button
            type="submit"
            className="min-h-[48px] w-full"
            disabled={isSubmitting || activePassCount >= activePassLimit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
              </>
            ) : activePassCount >= activePassLimit ? (
              'Active pass limit reached'
            ) : (
              'Create Pass'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
