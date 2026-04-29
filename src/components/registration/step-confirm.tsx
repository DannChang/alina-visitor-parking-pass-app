'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Car,
  Building,
  Clock,
  Mail,
  Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { WizardData, PassResult } from './registration-wizard';

interface StepConfirmProps {
  data: WizardData;
  onBack: () => void;
  onPassCreated: (result: PassResult) => void;
}

export function StepConfirm({ data, onBack, onPassCreated }: StepConfirmProps) {
  const t = useTranslations('registration');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartParking = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licensePlate: data.licensePlate,
          unitNumber: data.unitNumber,
          buildingSlug: data.buildingSlug,
          duration: data.duration,
          visitorPhone: data.visitorPhone,
          visitorEmail: data.visitorEmail,
          vehicleMake: data.vehicleMake,
          vehicleModel: data.vehicleModel,
          vehicleColor: data.vehicleColor,
          vehicleYear: data.vehicleYear,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        const errorMsg =
          result.errors?.map((e: { message: string }) => e.message).join('. ') ||
          result.error ||
          t('failedCreatePass');
        setError(errorMsg);
        return;
      }

      onPassCreated({
        id: result.pass.id,
        confirmationCode: result.confirmationCode,
        startTime: result.pass.startTime,
        endTime: result.pass.endTime,
        licensePlate: data.licensePlate,
        unitNumber: data.unitNumber,
        buildingName: data.buildingName,
      });
    } catch {
      setError(t('unexpectedError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>{t('reviewStartTitle')}</CardTitle>
        <CardDescription>{t('reviewStartDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center gap-3">
            <Building className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t('building')}</p>
              <p className="font-medium">{data.buildingName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Building className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t('unitNumber')}</p>
              <p className="font-medium">{data.unitNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Car className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t('licensePlate')}</p>
              <p className="font-mono font-medium">{data.licensePlate}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t('phone')}</p>
              <p className="font-medium">{data.visitorPhone}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t('email')}</p>
              <p className="font-medium">{data.visitorEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t('duration')}</p>
              <p className="font-medium">{t('durationHours', { count: data.duration })}</p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">{t('parkingAgreement')}</p>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onBack}
            className="min-h-[48px]"
            disabled={isSubmitting}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t('back')}
          </Button>
          <Button
            onClick={handleStartParking}
            disabled={isSubmitting}
            className="min-h-[48px] flex-1 text-base"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('registering')}
              </>
            ) : (
              t('startParking')
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
