'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Loader2, Mail, ShieldCheck } from 'lucide-react';
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
import { useTranslations } from 'next-intl';

export function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError(t('emailRequired'));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountType: 'staff',
          email,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to request password reset');
      }

      setSubmitted(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to request password reset'
      );
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
        <CardTitle className="text-2xl font-bold">{t('forgotPasswordTitle')}</CardTitle>
        <CardDescription>{t('forgotPasswordDesc')}</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTitle>{t('residentAccountTitle')}</AlertTitle>
            <AlertDescription>{t('residentAccountDesc')}</AlertDescription>
          </Alert>

          {submitted ? (
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertTitle>{t('checkEmailTitle')}</AlertTitle>
              <AlertDescription>{t('checkEmailDesc')}</AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="forgot-password-email">{tc('email')}</Label>
            <Input
              id="forgot-password-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder={t('emailPlaceholder')}
              className="h-11 md:h-10"
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
            <Link href="/login">{t('backToLogin')}</Link>
          </Button>

          <Button asChild variant="outline" className="w-full">
            <Link href="/resident/forgot-password">{t('residentPasswordReset')}</Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
