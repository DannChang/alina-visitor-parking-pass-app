'use client';

import { useState } from 'react';
import { AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

type EscalationLevel = 'NONE' | 'WARNING' | 'FORMAL_LETTER' | 'TOW_NOTICE';

interface EscalationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  violationId: string;
  currentLevel: EscalationLevel;
  licensePlate: string;
  onSuccess: () => void;
}

const ESCALATION_ORDER: EscalationLevel[] = [
  'NONE',
  'WARNING',
  'FORMAL_LETTER',
  'TOW_NOTICE',
];

const LEVEL_LABELS: Record<EscalationLevel, string> = {
  NONE: 'None',
  WARNING: 'Warning',
  FORMAL_LETTER: 'Formal Letter',
  TOW_NOTICE: 'Tow Notice',
};

function getNextLevel(current: EscalationLevel): EscalationLevel | null {
  const currentIndex = ESCALATION_ORDER.indexOf(current);
  if (currentIndex === -1 || currentIndex >= ESCALATION_ORDER.length - 1) {
    return null;
  }
  return ESCALATION_ORDER[currentIndex + 1] ?? null;
}

export function EscalationDialog({
  open,
  onOpenChange,
  violationId,
  currentLevel,
  licensePlate,
  onSuccess,
}: EscalationDialogProps) {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextLevel = getNextLevel(currentLevel);
  const isMaxLevel = nextLevel === null;

  async function handleConfirm() {
    if (!nextLevel) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/violations/${violationId}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: nextLevel,
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to escalate violation');
      }

      setNotes('');
      setError(null);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Escalate Violation</DialogTitle>
          <DialogDescription>
            Escalate enforcement action for vehicle{' '}
            <span className="font-semibold">{licensePlate}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isMaxLevel ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This violation has reached the maximum escalation level (Tow
                Notice). No further escalation is available.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Escalation level display */}
              <div className="flex items-center justify-center gap-3 rounded-lg border bg-muted/50 p-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Current</p>
                  <p className="text-sm font-medium">
                    {LEVEL_LABELS[currentLevel]}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Next</p>
                  <p className="text-sm font-semibold text-destructive">
                    {LEVEL_LABELS[nextLevel]}
                  </p>
                </div>
              </div>

              {/* Notes textarea */}
              <div className="space-y-2">
                <label
                  htmlFor="escalation-notes"
                  className="text-sm font-medium"
                >
                  Notes (optional)
                </label>
                <Textarea
                  id="escalation-notes"
                  placeholder="Add any notes about this escalation..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isMaxLevel || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Escalating...
              </>
            ) : (
              'Confirm Escalation'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
