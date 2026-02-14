'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResidentNav } from '@/components/resident/resident-nav';

interface ActivityEntry {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  visitorName: string | null;
  vehicle: { licensePlate: string };
  duration: number;
}

export default function ResidentActivityPage() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch('/api/resident/activity');
      if (res.ok) {
        const data = await res.json();
        setEntries(data.passes);
      }
    } catch {
      // Handle error silently
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  return (
    <div className="min-h-screen bg-slate-50">
      <ResidentNav />
      <main className="container mx-auto max-w-lg px-4 py-6 space-y-4">
        <h1 className="text-xl font-bold">Activity History</h1>

        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </div>
        ) : entries.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No activity yet</p>
            </CardContent>
          </Card>
        ) : (
          entries.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-mono">
                    {entry.vehicle.licensePlate}
                  </CardTitle>
                  <Badge
                    variant={
                      entry.status === 'ACTIVE' || entry.status === 'EXTENDED'
                        ? 'default'
                        : entry.status === 'EXPIRED'
                          ? 'secondary'
                          : 'outline'
                    }
                  >
                    {entry.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>{entry.visitorName || 'Unknown visitor'}</span>
                  <span>{entry.duration}h</span>
                </div>
                <p className="text-xs mt-1">
                  {new Date(entry.startTime).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  {' - '}
                  {new Date(entry.endTime).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
