'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('registration');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (!code.trim()) {
      setError(t('accessCodeRequired'));
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
        setError(t('invalidAccessCode'));
      }
    } catch {
      setError(t('verificationFailed'));
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
        <CardTitle>{t('accessCode')}</CardTitle>
        <CardDescription>
          {t('accessCodeUnitDesc', { unit: data.unitNumber ?? '' })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="accessCode">{t('accessCode')}</Label>
          <Input
            id="accessCode"
            type="password"
            placeholder={t('enterCode')}
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(null);
            }}
            className="h-12 text-center font-mono text-base tracking-widest"
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onBack}
            className="min-h-[48px]"
            disabled={isVerifying}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t('back')}
          </Button>
          <Button onClick={handleVerify} disabled={isVerifying} className="min-h-[48px] flex-1">
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('verifying')}
              </>
            ) : (
              t('verifyContinue')
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
