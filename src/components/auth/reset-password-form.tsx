'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
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
import { PASSWORD_REQUIREMENTS_TEXT, getPasswordValidationError } from '@/lib/validation';

interface PasswordResetPreview {
  status: 'valid' | 'expired' | 'invalid';
  accountType?: 'staff' | 'resident';
  expiresAt?: string;
  loginPath?: '/login' | '/resident/login';
  recipientEmail?: string;
  recipientName?: string;
  buildingName?: string;
  unitNumber?: string;
}

interface ResetPasswordFormProps {
  token: string;
  preview: PasswordResetPreview;
}

function getRequestPath(loginPath?: '/login' | '/resident/login'): string {
  return loginPath === '/resident/login' ? '/resident/forgot-password' : '/forgot-password';
}

export function ResetPasswordForm({ token, preview }: ResetPasswordFormProps) {
  const t = useTranslations('auth');
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);

  const blockedContent = useMemo(() => {
    if (preview.status === 'expired') {
      return {
        title: t('resetLinkExpired'),
        description: t('resetLinkExpiredDesc'),
      };
    }

    return {
      title: t('resetLinkInvalid'),
      description: t('resetLinkInvalidDesc'),
    };
  }, [preview.status, t]);
  const requestPath = getRequestPath(preview.loginPath);
  const loginPath = preview.loginPath || '/login';
  const passwordError = getPasswordValidationError(password);
  const confirmPasswordError =
    confirmPassword.length > 0 && password !== confirmPassword ? t('passwordsDoNotMatch') : null;
  const showPasswordError = (passwordTouched || hasAttemptedSubmit) && Boolean(passwordError);
  const showConfirmPasswordError =
    (confirmPasswordTouched || hasAttemptedSubmit) && Boolean(confirmPasswordError);

  if (preview.status !== 'valid') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <CardTitle>{blockedContent.title}</CardTitle>
          <CardDescription>{blockedContent.description}</CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-3">
          <Button asChild className="w-full">
            <Link href={requestPath}>{t('requestNewLink')}</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href={loginPath}>{t('backToLogin')}</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasAttemptedSubmit(true);
    setError(null);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('failedResetPassword'));
      }

      setIsComplete(true);
      router.replace(`${data.loginPath}?reset=success`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('failedResetPassword'));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isComplete && !error) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-7 w-7 text-success" />
          </div>
          <CardTitle>{t('passwordUpdatedTitle')}</CardTitle>
          <CardDescription>{t('redirectingToLogin')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="h-7 w-7 text-primary" />
        </div>
        <CardTitle>{t('setNewPassword')}</CardTitle>
        <CardDescription>
          {preview.accountType === 'resident' && preview.buildingName && preview.unitNumber
            ? t('updateResidentPasswordDesc', {
                building: preview.buildingName,
                unit: preview.unitNumber,
              })
            : t('chooseNewPasswordDesc')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('passwordResetError')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="rounded-lg bg-muted/40 p-4 text-sm">
          {preview.recipientName ? <p className="font-medium">{preview.recipientName}</p> : null}
          {preview.recipientEmail ? (
            <p className="text-muted-foreground">{preview.recipientEmail}</p>
          ) : null}
          {preview.expiresAt ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {t('expiresOn', { date: new Date(preview.expiresAt).toLocaleString() })}
            </p>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-password">{t('newPassword')}</Label>
            <Input
              id="reset-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onBlur={() => setPasswordTouched(true)}
              autoComplete="new-password"
              placeholder={t('enterNewPassword')}
              className="h-11 md:h-10"
              required
            />
            <p className="text-xs text-muted-foreground">{PASSWORD_REQUIREMENTS_TEXT}</p>
            {showPasswordError ? <p className="text-sm text-destructive">{passwordError}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-password-confirm">{t('confirmNewPassword')}</Label>
            <Input
              id="reset-password-confirm"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              onBlur={() => setConfirmPasswordTouched(true)}
              autoComplete="new-password"
              placeholder={t('confirmYourNewPassword')}
              className="h-11 md:h-10"
              required
            />
            {showConfirmPasswordError ? (
              <p className="text-sm text-destructive">{confirmPasswordError}</p>
            ) : null}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('updatingPassword')}
              </>
            ) : (
              t('updatePassword')
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <Button asChild variant="ghost">
          <Link href={loginPath}>{t('backToLogin')}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
