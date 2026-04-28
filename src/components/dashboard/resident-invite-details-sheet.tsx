'use client';

import { formatDistanceToNow } from 'date-fns';
import { Building2, Mail, Phone, ShieldCheck, User } from 'lucide-react';
import type { ResidentInviteSummary } from '@/components/dashboard/resident-invite-shared';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

export function ResidentInviteDetailsSheet({
  invite,
  open,
  onOpenChange,
}: {
  invite: ResidentInviteSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Registration Pass Details</SheetTitle>
          <SheetDescription>
            {invite
              ? `Onboarding link for ${invite.recipientName ?? `unit ${invite.unit.unitNumber}`}`
              : 'Registration pass'}
          </SheetDescription>
        </SheetHeader>

        {invite ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">
                    {invite.recipientName ?? 'Unit registration link'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {invite.recipientEmail ?? 'Resident will enter email during activation'}
                  </p>
                </div>
                <Badge>{invite.status}</Badge>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Location
                </div>
                <p className="text-sm">
                  {invite.building.name}, Unit {invite.unit.unitNumber}
                </p>
              </div>

              <div className="rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Issued By
                </div>
                <p className="text-sm">{invite.issuer.name || 'Unknown issuer'}</p>
                <p className="text-sm text-muted-foreground">{invite.issuer.email}</p>
              </div>

              <div className="rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Delivery
                </div>
                <p className="text-sm">
                  Expires {formatDistanceToNow(new Date(invite.expiresAt), { addSuffix: true })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {invite.sentAt
                    ? `Sent ${formatDistanceToNow(new Date(invite.sentAt), { addSuffix: true })}`
                    : 'Not emailed'}
                </p>
              </div>

              {invite.recipientPhone ? (
                <div className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    Phone
                  </div>
                  <p className="text-sm">{invite.recipientPhone}</p>
                </div>
              ) : null}

              <div className="rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  Status Notes
                </div>
                <p className="text-sm">
                  {invite.status === 'CONSUMED' && invite.resident
                    ? `Activated by ${invite.resident.name}`
                    : invite.status === 'REVOKED' && invite.revokeReason
                      ? invite.revokeReason
                      : 'No additional status notes'}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
