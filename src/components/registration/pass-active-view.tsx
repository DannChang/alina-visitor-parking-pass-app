'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
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
  const t = useTranslations('registration');
  const locale = useLocale();
  const [isRemoving, setIsRemoving] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);

  const handleRemovePass = async () => {
    if (!confirm(t('endPassConfirm'))) return;

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
      <Card className="mx-auto w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <XCircle className="h-8 w-8 text-slate-500" />
          </div>
          <CardTitle>{t('passEnded')}</CardTitle>
          <CardDescription>{t('passCancelled')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onReset} className="min-h-[48px] w-full">
            {t('registerAnotherVehicle')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <CardTitle className="text-green-700">{t('passActive')}</CardTitle>
        <CardDescription>{t('passActiveDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Countdown Timer */}
        <CountdownTimer endTime={pass.endTime} />

        {/* Confirmation Code */}
        <div className="rounded-lg bg-muted p-4 text-center">
          <p className="text-sm text-muted-foreground">{t('confirmationCode')}</p>
          <p className="font-mono text-2xl font-bold tracking-wider">
            {pass.confirmationCode.slice(0, 8).toUpperCase()}
          </p>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('vehicle')}</span>
            <span className="font-mono font-medium">{pass.licensePlate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('building')}</span>
            <span className="font-medium">{pass.buildingName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('unitNumber')}</span>
            <span className="font-medium">{pass.unitNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('validUntil')}</span>
            <span className="font-medium">
              {new Date(pass.endTime).toLocaleString(locale, {
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
          <p className="mb-1 text-xs font-medium text-yellow-800">{t('parkingRules')}</p>
          <ul className="space-y-1 text-xs text-yellow-700">
            <li>{t('parkingRulesList1')}</li>
            <li>{t('parkingRulesList2')}</li>
            <li>{t('parkingRulesList3')}</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <Button
            onClick={handleRemovePass}
            variant="outline"
            className="min-h-[48px] w-full border-destructive/30 text-destructive hover:bg-destructive/10"
            disabled={isRemoving}
          >
            {isRemoving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('removing')}
              </>
            ) : (
              t('endPass')
            )}
          </Button>
          <Button onClick={onReset} variant="ghost" className="min-h-[48px] w-full">
            {t('registerAnotherVehicle')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
