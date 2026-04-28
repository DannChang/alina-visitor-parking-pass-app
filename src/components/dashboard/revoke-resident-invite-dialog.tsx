'use client';

import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ResidentInviteSummary } from './resident-invite-shared';

interface RevokeResidentInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invite: ResidentInviteSummary | null;
  onRevoked: (invite: ResidentInviteSummary) => void;
}

export function RevokeResidentInviteDialog({
  open,
  onOpenChange,
  invite,
  onRevoked,
}: RevokeResidentInviteDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setReason('');
      setError(null);
      setIsSubmitting(false);
    }
    onOpenChange(value);
  };

  async function handleSubmit() {
    if (!invite) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/resident-invites/${invite.id}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to revoke registration pass');
      }

      onRevoked(data.invite);
      onOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Failed to revoke registration pass'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Revoke Registration Pass</DialogTitle>
          <DialogDescription>
            {invite
              ? `Revoke the registration link for ${
                  invite.recipientName ?? `unit ${invite.unit.unitNumber}`
                }.`
              : 'Revoke this registration pass.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="resident-invite-reason" className="text-sm font-medium">
              Revoke reason
            </label>
            <Textarea
              id="resident-invite-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain why this registration pass is being revoked."
              rows={4}
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
            type="button"
            variant="destructive"
            onClick={handleSubmit}
            disabled={isSubmitting || reason.trim().length < 3}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Revoking...
              </>
            ) : (
              'Revoke Pass'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
