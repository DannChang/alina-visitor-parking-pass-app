'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, Car, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResidentNav } from '@/components/resident/resident-nav';
import { CreatePassDialog } from '@/components/resident/create-pass-dialog';
import { CountdownTimer } from '@/components/pass/countdown-timer';

interface Pass {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  visitorName: string | null;
  vehicle: {
    licensePlate: string;
  };
}

export default function ResidentPassesPage() {
  const [passes, setPasses] = useState<Pass[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const fetchPasses = useCallback(async () => {
    try {
      const res = await fetch('/api/resident/passes');
      if (res.ok) {
        const data = await res.json();
        setPasses(data.passes);
      }
    } catch {
      // Handle error silently
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPasses();
  }, [fetchPasses]);

  const handleCancelPass = async (passId: string) => {
    if (!confirm('Cancel this parking pass?')) return;
    try {
      const res = await fetch(`/api/resident/passes/${passId}`, { method: 'DELETE' });
      if (res.ok) fetchPasses();
    } catch {
      // Handle error silently
    }
  };

  const activePasses = passes.filter(
    (p) => (p.status === 'ACTIVE' || p.status === 'EXTENDED') && new Date(p.endTime) > new Date()
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <ResidentNav />
      <main className="container mx-auto max-w-lg px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Active Passes</h1>
          <Button onClick={() => setShowCreateDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Pass
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </div>
        ) : activePasses.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Car className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No active passes</p>
              <p className="text-sm">Create a pass for your visitor</p>
            </CardContent>
          </Card>
        ) : (
          activePasses.map((pass) => (
            <Card key={pass.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base font-mono">
                      {pass.vehicle.licensePlate}
                    </CardTitle>
                  </div>
                  <Badge variant={pass.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {pass.status}
                  </Badge>
                </div>
                {pass.visitorName && (
                  <p className="text-sm text-muted-foreground">{pass.visitorName}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <CountdownTimer endTime={pass.endTime} />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Until{' '}
                    {new Date(pass.endTime).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleCancelPass(pass.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        <CreatePassDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={fetchPasses}
        />
      </main>
    </div>
  );
}
