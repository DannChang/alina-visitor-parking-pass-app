'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type {
  ResidentInviteBuildingOption,
  ResidentInviteMutationResult,
  ResidentInviteUnitOption,
} from './resident-invite-shared';

interface CreateResidentInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildings: ResidentInviteBuildingOption[];
  units: ResidentInviteUnitOption[];
  onCreated: (result: ResidentInviteMutationResult) => void;
}

const EMPTY_FORM = {
  buildingId: '',
  unitId: '',
  recipientName: '',
  recipientEmail: '',
  recipientPhone: '',
};

export function CreateResidentInviteDialog({
  open,
  onOpenChange,
  buildings,
  units,
  onCreated,
}: CreateResidentInviteDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM);
      setError(null);
      setIsSubmitting(false);
      return;
    }

    if (!form.buildingId && buildings[0]) {
      setForm((current) => ({ ...current, buildingId: buildings[0]!.id }));
    }
  }, [buildings, form.buildingId, open]);

  const availableUnits = useMemo(
    () =>
      units.filter(
        (unit) => unit.buildingId === form.buildingId && unit.isAvailableForInvite
      ),
    [form.buildingId, units]
  );

  useEffect(() => {
    if (!form.unitId) {
      return;
    }

    const isStillAvailable = availableUnits.some((unit) => unit.id === form.unitId);
    if (!isStillAvailable) {
      setForm((current) => ({ ...current, unitId: '' }));
    }
  }, [availableUnits, form.unitId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/resident-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buildingId: form.buildingId,
          unitId: form.unitId,
          recipientName: form.recipientName.trim(),
          recipientEmail: form.recipientEmail.trim(),
          recipientPhone: form.recipientPhone.trim() || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create registration pass');
      }

      onCreated(data);
      onOpenChange(false);
      setForm(EMPTY_FORM);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to create registration pass'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Create Registration Pass</DialogTitle>
          <DialogDescription>
            Issue a one-time resident registration link for a unit that does not yet
            have an active primary resident.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="resident-invite-building">Building</Label>
              <Select
                value={form.buildingId}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, buildingId: value, unitId: '' }))
                }
              >
                <SelectTrigger id="resident-invite-building" className="h-11 md:h-10">
                  <SelectValue placeholder="Select a building" />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((building) => (
                    <SelectItem key={building.id} value={building.id}>
                      {building.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resident-invite-unit">Unit</Label>
              <Select
                value={form.unitId}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, unitId: value }))
                }
                disabled={!form.buildingId || availableUnits.length === 0}
              >
                <SelectTrigger id="resident-invite-unit" className="h-11 md:h-10">
                  <SelectValue
                    placeholder={
                      availableUnits.length === 0
                        ? 'No available units'
                        : 'Select a unit'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableUnits.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      Unit {unit.unitNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="resident-invite-name">Resident Name</Label>
            <Input
              id="resident-invite-name"
              value={form.recipientName}
              onChange={(event) =>
                setForm((current) => ({ ...current, recipientName: event.target.value }))
              }
              className="h-11 md:h-10"
              placeholder="Jane Resident"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="resident-invite-email">Email</Label>
              <Input
                id="resident-invite-email"
                type="email"
                value={form.recipientEmail}
                onChange={(event) =>
                  setForm((current) => ({ ...current, recipientEmail: event.target.value }))
                }
                className="h-11 md:h-10"
                placeholder="resident@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resident-invite-phone">Phone (optional)</Label>
              <Input
                id="resident-invite-phone"
                type="tel"
                value={form.recipientPhone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, recipientPhone: event.target.value }))
                }
                className="h-11 md:h-10"
                placeholder="555-123-4567"
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
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !form.buildingId ||
                !form.unitId ||
                !form.recipientName.trim() ||
                !form.recipientEmail.trim()
              }
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Pass'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
