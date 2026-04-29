'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Home, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { APP_CONFIG } from '@/lib/constants';

export function ResidentForgotPasswordForm() {
  const t = useTranslations('resident');
  const [unitNumber, setUnitNumber] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!unitNumber.trim() || !email.trim()) {
      setError(t('resetRequiredFields'));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountType: 'resident',
          unitNumber,
          email,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('resetRequestFailed'));
      }

      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('resetRequestFailed'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">{t('resetResidentPassword')}</CardTitle>
        <CardDescription>
          {t('resetResidentPasswordDescription', {
            building: APP_CONFIG.resident.defaultBuildingName,
          })}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {submitted ? (
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertTitle>{t('checkEmail')}</AlertTitle>
              <AlertDescription>{t('residentResetSent')}</AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="rounded-lg bg-muted/40 p-3 text-center text-sm text-muted-foreground">
            {t('building')}:{' '}
            <span className="font-medium text-foreground">
              {APP_CONFIG.resident.defaultBuildingName}
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="resident-forgot-password-unit">
              <Home className="mr-1 inline h-3 w-3" />
              {t('unitNumber')}
            </Label>
            <Input
              id="resident-forgot-password-unit"
              placeholder={t('unitNumberPlaceholder')}
              value={unitNumber}
              onChange={(event) => setUnitNumber(event.target.value)}
              className="h-11 text-base"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resident-forgot-password-email">
              <Mail className="mr-1 inline h-3 w-3" />
              {t('primaryResidentEmail')}
            </Label>
            <Input
              id="resident-forgot-password-email"
              type="email"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="h-11 text-base"
              disabled={isSubmitting}
              required
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('sendingResetLink')}
              </>
            ) : (
              t('sendResetLink')
            )}
          </Button>

          <Button asChild variant="ghost" className="w-full">
            <Link href="/resident/login?showResidentLogin=1">{t('backToResidentLogin')}</Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
