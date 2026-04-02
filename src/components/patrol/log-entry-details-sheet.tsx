'use client';

import Image from 'next/image';
import { format } from 'date-fns';
import { Camera, MapPin, StickyNote, User } from 'lucide-react';
import type { PatrolLogEntry } from '@/components/patrol/log-entry-list';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

const ENTRY_TYPE_LABELS: Record<PatrolLogEntry['entryType'], string> = {
  ENTRY: 'Entry',
  EXIT: 'Exit',
  SPOT_CHECK: 'Spot Check',
  NOTE: 'Note',
};

export function LogEntryDetailsSheet({
  entry,
  open,
  onOpenChange,
}: {
  entry: PatrolLogEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Patrol Log Entry</SheetTitle>
          <SheetDescription>
            {entry ? `Observation for ${entry.licensePlate}` : 'Patrol log details'}
          </SheetDescription>
        </SheetHeader>

        {entry ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xl font-bold">{entry.licensePlate}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(entry.createdAt), 'PPpp')}
                  </p>
                </div>
                <Badge variant="outline">{ENTRY_TYPE_LABELS[entry.entryType]}</Badge>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Location
                </div>
                <p className="text-sm">{entry.location || 'Not specified'}</p>
              </div>

              <div className="rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <StickyNote className="h-4 w-4 text-muted-foreground" />
                  Notes
                </div>
                <p className="text-sm">{entry.notes || 'No notes recorded'}</p>
              </div>

              <div className="rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Patroller
                </div>
                <p className="text-sm">{entry.patroller.name || 'Unknown'}</p>
              </div>

              <div className="rounded-lg border p-3">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                  Photos
                </div>
                {entry.photoUrls.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {entry.photoUrls.map((url, index) => (
                      <Image
                        key={`${entry.id}-${index}`}
                        src={url}
                        alt={`Patrol log photo ${index + 1}`}
                        width={320}
                        height={160}
                        className="h-32 w-full rounded-md border object-cover"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No photos attached</p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
