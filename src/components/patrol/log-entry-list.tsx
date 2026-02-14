'use client';

import { format } from 'date-fns';
import { Loader2, User, MapPin, StickyNote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface PatrolLogEntry {
  id: string;
  licensePlate: string;
  normalizedPlate: string;
  entryType: 'ENTRY' | 'EXIT' | 'SPOT_CHECK' | 'NOTE';
  location: string | null;
  notes: string | null;
  photoUrls: string[];
  createdAt: string;
  patroller: {
    id: string;
    name: string | null;
  };
}

interface LogEntryListProps {
  entries: PatrolLogEntry[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

const ENTRY_TYPE_CONFIG: Record<
  PatrolLogEntry['entryType'],
  { label: string; className: string }
> = {
  ENTRY: {
    label: 'Entry',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  EXIT: {
    label: 'Exit',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  SPOT_CHECK: {
    label: 'Spot Check',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  NOTE: {
    label: 'Note',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  },
};

function LogEntrySkeleton() {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="mt-3 space-y-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </CardContent>
    </Card>
  );
}

export function LogEntryList({
  entries,
  onLoadMore,
  hasMore = false,
  isLoading = false,
}: LogEntryListProps) {
  if (isLoading && entries.length === 0) {
    return (
      <div className="space-y-3">
        <LogEntrySkeleton />
        <LogEntrySkeleton />
        <LogEntrySkeleton />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No log entries found. Add an entry to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const typeConfig = ENTRY_TYPE_CONFIG[entry.entryType];

        return (
          <Card key={entry.id}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono font-bold text-base text-slate-900 shrink-0">
                    {entry.licensePlate}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn('shrink-0 text-xs', typeConfig.className)}
                  >
                    {typeConfig.label}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                  {format(new Date(entry.createdAt), 'MMM d, h:mm a')}
                </span>
              </div>

              <div className="mt-2 space-y-1">
                {entry.location && (
                  <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>{entry.location}</span>
                  </div>
                )}

                {entry.notes && (
                  <div className="flex items-start gap-1.5 text-sm text-slate-600">
                    <StickyNote className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                    <span>{entry.notes}</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>{entry.patroller.name || 'Unknown'}</span>
                </div>
              </div>

              {entry.photoUrls.length > 0 && (
                <div className="mt-3 flex gap-2">
                  {entry.photoUrls.map((url, index) => (
                    <div
                      key={index}
                      className="w-16 h-16 rounded-md overflow-hidden border"
                    >
                      <img
                        src={url}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {hasMore && (
        <Button
          variant="outline"
          className="w-full"
          onClick={onLoadMore}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            'Load More'
          )}
        </Button>
      )}
    </div>
  );
}
