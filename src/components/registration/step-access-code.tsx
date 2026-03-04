'use client';

import { useState } from 'react';
import { Lock, ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { WizardData } from './registration-wizard';

interface StepAccessCodeProps {
  data: Partial<WizardData>;
  onUpdate: (data: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepAccessCode({ data, onUpdate, onNext, onBack }: StepAccessCodeProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (!code.trim()) {
      setError('Please enter the access code');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const res = await fetch('/api/units/verify-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId: data.unitId, accessCode: code }),
      });

      const result = await res.json();

      if (res.ok && result.verified) {
        onUpdate({ accessCodeVerified: true });
        onNext();
      } else {
        setError('Invalid access code. Please check with the resident.');
      }
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Access Code</CardTitle>
        <CardDescription>
          Unit {data.unitNumber} requires an access code. Please enter the code provided by the resident.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="accessCode">Access Code</Label>
          <Input
            id="accessCode"
            type="password"
            placeholder="Enter code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(null);
            }}
            className="h-12 text-base text-center tracking-widest font-mono"
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onBack} className="min-h-[48px]" disabled={isVerifying}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button onClick={handleVerify} disabled={isVerifying} className="flex-1 min-h-[48px]">
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify & Continue'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
