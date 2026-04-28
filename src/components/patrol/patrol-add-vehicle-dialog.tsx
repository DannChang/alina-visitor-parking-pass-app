'use client';

import { useEffect, useState } from 'react';
import { CarFront, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ManualVehicleAddResult, ManualVehicleInput } from '@/hooks/use-patrol-scanner';

interface PatrolAddVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLicensePlate?: string;
  onSubmit: (input: ManualVehicleInput) => Promise<ManualVehicleAddResult>;
}

interface FormState {
  licensePlate: string;
  make: string;
  model: string;
  color: string;
  state: string;
  stallNumber: string;
  year: string;
}

function createInitialState(licensePlate: string): FormState {
  return {
    licensePlate: licensePlate.trim().toUpperCase(),
    make: '',
    model: '',
    color: '',
    state: '',
    stallNumber: '',
    year: '',
  };
}

export function PatrolAddVehicleDialog({
  open,
  onOpenChange,
  initialLicensePlate = '',
  onSubmit,
}: PatrolAddVehicleDialogProps) {
  const [form, setForm] = useState<FormState>(() => createInitialState(initialLicensePlate));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(createInitialState(initialLicensePlate));
    } else {
      setIsSubmitting(false);
    }
  }, [initialLicensePlate, open]);

  const updateField = <Field extends keyof FormState>(field: Field, value: FormState[Field]) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await onSubmit({
        licensePlate: form.licensePlate,
        make: form.make.trim() || undefined,
        model: form.model.trim() || undefined,
        color: form.color.trim() || undefined,
        state: form.state.trim() || undefined,
        stallNumber: form.stallNumber.trim() || undefined,
        year: form.year.trim() ? Number(form.year.trim()) : undefined,
      });

      toast.success(
        result.created
          ? 'Vehicle added to patrol records'
          : result.restored
            ? 'Archived vehicle restored to patrol records'
            : 'Vehicle already existed. Patrol lookup refreshed.'
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to add vehicle from patrol mode'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CarFront className="h-5 w-5 text-primary" />
            Add Vehicle
          </DialogTitle>
          <DialogDescription>
            Create a vehicle record so patrol can track this plate in future lookups, passes, and
            violations.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="patrol-add-license-plate" className="text-sm font-medium">
              License Plate
            </label>
            <Input
              id="patrol-add-license-plate"
              value={form.licensePlate}
              onChange={(event) => updateField('licensePlate', event.target.value.toUpperCase())}
              placeholder="ABC 1234"
              className="font-mono tracking-wider"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label htmlFor="patrol-add-make" className="text-sm font-medium">
                Make
              </label>
              <Input
                id="patrol-add-make"
                value={form.make}
                onChange={(event) => updateField('make', event.target.value)}
                placeholder="Toyota"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="patrol-add-model" className="text-sm font-medium">
                Model
              </label>
              <Input
                id="patrol-add-model"
                value={form.model}
                onChange={(event) => updateField('model', event.target.value)}
                placeholder="Camry"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="patrol-add-stall-number" className="text-sm font-medium">
              Stall Number
            </label>
            <Input
              id="patrol-add-stall-number"
              value={form.stallNumber}
              onChange={(event) => updateField('stallNumber', event.target.value)}
              placeholder="e.g. 42"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <label htmlFor="patrol-add-color" className="text-sm font-medium">
                Color
              </label>
              <Input
                id="patrol-add-color"
                value={form.color}
                onChange={(event) => updateField('color', event.target.value)}
                placeholder="Silver"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="patrol-add-state" className="text-sm font-medium">
                State / Province
              </label>
              <Input
                id="patrol-add-state"
                value={form.state}
                onChange={(event) => updateField('state', event.target.value.toUpperCase())}
                placeholder="BC"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="patrol-add-year" className="text-sm font-medium">
                Year
              </label>
              <Input
                id="patrol-add-year"
                value={form.year}
                onChange={(event) =>
                  updateField('year', event.target.value.replace(/[^0-9]/g, '').slice(0, 4))
                }
                placeholder="2024"
                inputMode="numeric"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!form.licensePlate.trim() || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Add Vehicle'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
