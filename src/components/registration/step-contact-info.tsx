'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { WizardData } from './registration-wizard';

const DURATION_OPTIONS = [
  { value: 2, label: '2 hrs' },
  { value: 4, label: '4 hrs' },
  { value: 8, label: '8 hrs' },
  { value: 12, label: '12 hrs' },
  { value: 24, label: '24 hrs' },
];

interface StepContactInfoProps {
  data: Partial<WizardData>;
  onUpdate: (data: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepContactInfo({ data, onUpdate, onNext, onBack }: StepContactInfoProps) {
  const t = useTranslations('registration');
  const [phone, setPhone] = useState(data.visitorPhone ?? '');
  const [email, setEmail] = useState(data.visitorEmail ?? '');
  const [duration, setDuration] = useState(data.duration ?? 2);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = () => {
    if (!phone.trim() || !email.trim()) {
      setError(t('phoneEmailRequired'));
      return;
    }
    setError(null);
    onUpdate({
      visitorPhone: phone.trim(),
      visitorEmail: email.trim(),
      duration,
    });
    onNext();
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>{t('contactInfoTitle')}</CardTitle>
        <CardDescription>{t('contactInfoDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>{t('parkingDuration')} *</Label>
          <div className="grid grid-cols-5 gap-2">
            {DURATION_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={duration === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDuration(option.value)}
                className="min-h-[44px] touch-manipulation text-xs"
              >
                {t('durationHoursShort', { count: option.value })}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">{t('phone')} *</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="555-123-4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-11 text-base"
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t('email')} *</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 text-base"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onBack} className="min-h-[48px]">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t('back')}
          </Button>
          <Button onClick={handleContinue} className="min-h-[48px] flex-1">
            {t('continue')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
