'use client';

import { useState } from 'react';
import { Pencil, Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface ScanReviewCardProps {
  initialPlate: string;
  onConfirm: (licensePlate: string) => void | Promise<void>;
  onRescan: () => void;
}

export function ScanReviewCard({ initialPlate, onConfirm, onRescan }: ScanReviewCardProps) {
  const [plate, setPlate] = useState(initialPlate);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = plate.trim();
    if (!trimmed) return;
    await onConfirm(trimmed);
  };

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="space-y-3 pb-4 pt-5">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
          <Pencil className="h-4 w-4" />
          Confirm or edit the detected plate before lookup
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={plate}
            onChange={(event) => setPlate(event.target.value.toUpperCase())}
            className="h-12 flex-1 font-mono text-lg tracking-wider"
            autoFocus
          />
          <Button type="submit" disabled={!plate.trim()} className="h-12 px-5">
            <Search className="mr-2 h-4 w-4" />
            Confirm &amp; Lookup
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onRescan}
            className="h-12 px-5"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Rescan
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
