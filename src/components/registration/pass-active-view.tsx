'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CountdownTimer } from '@/components/pass/countdown-timer';
import type { PassResult } from './registration-wizard';

interface PassActiveViewProps {
  pass: PassResult;
  onReset: () => void;
}

export function PassActiveView({ pass, onReset }: PassActiveViewProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);

  const handleRemovePass = async () => {
    if (!confirm('Are you sure you want to end your parking pass?')) return;

    setIsRemoving(true);
    try {
      const res = await fetch(`/api/passes/${pass.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setIsRemoved(true);
      }
    } catch {
      // Silently fail - pass remains active
    } finally {
      setIsRemoving(false);
    }
  };

  if (isRemoved) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <XCircle className="h-8 w-8 text-slate-500" />
          </div>
          <CardTitle>Pass Ended</CardTitle>
          <CardDescription>Your parking pass has been cancelled</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onReset} className="w-full min-h-[48px]">
            Register Another Vehicle
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <CardTitle className="text-green-700">Pass Active</CardTitle>
        <CardDescription>Your visitor parking pass is registered</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Countdown Timer */}
        <CountdownTimer endTime={pass.endTime} />

        {/* Confirmation Code */}
        <div className="rounded-lg bg-muted p-4 text-center">
          <p className="text-sm text-muted-foreground">Confirmation Code</p>
          <p className="text-2xl font-bold tracking-wider font-mono">
            {pass.confirmationCode.slice(0, 8).toUpperCase()}
          </p>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vehicle</span>
            <span className="font-medium font-mono">{pass.licensePlate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Building</span>
            <span className="font-medium">{pass.buildingName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Unit</span>
            <span className="font-medium">{pass.unitNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valid Until</span>
            <span className="font-medium">
              {new Date(pass.endTime).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {/* Parking Rules */}
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
          <p className="text-xs font-medium text-yellow-800 mb-1">Parking Rules</p>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>Move your vehicle before the timer expires</li>
            <li>Park only in designated visitor spots</li>
            <li>Do not block emergency lanes or handicap spots</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <Button
            onClick={handleRemovePass}
            variant="outline"
            className="w-full min-h-[48px] text-destructive border-destructive/30 hover:bg-destructive/10"
            disabled={isRemoving}
          >
            {isRemoving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Removing...
              </>
            ) : (
              'End Parking Pass'
            )}
          </Button>
          <Button onClick={onReset} variant="ghost" className="w-full min-h-[48px]">
            Register Another Vehicle
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
