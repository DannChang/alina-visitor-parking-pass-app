'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  return loginPath === '/resident/login'
    ? '/resident/forgot-password'
    : '/forgot-password';
}

function getBlockedContent(preview: PasswordResetPreview) {
  if (preview.status === 'expired') {
    return {
      title: 'Reset Link Expired',
      description:
        'This password reset link has expired. Request a new one to continue.',
    };
  }

  return {
    title: 'Reset Link Invalid',
    description:
      'This password reset link is invalid or has already been used. Request a new link to continue.',
  };
}

export function ResetPasswordForm({
  token,
  preview,
}: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const blockedContent = useMemo(() => getBlockedContent(preview), [preview]);
  const requestPath = getRequestPath(preview.loginPath);
  const loginPath = preview.loginPath || '/login';

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
            <Link href={requestPath}>Request a New Link</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href={loginPath}>Back to Login</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
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
        throw new Error(data.error || 'Failed to reset password');
      }

      setIsComplete(true);
      router.replace(`${data.loginPath}?reset=success`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to reset password'
      );
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
          <CardTitle>Password Updated</CardTitle>
          <CardDescription>Redirecting you back to login.</CardDescription>
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
        <CardTitle>Set a New Password</CardTitle>
        <CardDescription>
          {preview.accountType === 'resident' && preview.buildingName && preview.unitNumber
            ? `Update the resident password for ${preview.buildingName}, unit ${preview.unitNumber}.`
            : 'Choose a new password for your account.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Password reset error</AlertTitle>
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
              This link expires on {new Date(preview.expiresAt).toLocaleString()}.
            </p>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-password">New Password</Label>
            <Input
              id="reset-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="Enter a new password"
              className="h-11 md:h-10"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-password-confirm">Confirm New Password</Label>
            <Input
              id="reset-password-confirm"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="Confirm your new password"
              className="h-11 md:h-10"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating password...
              </>
            ) : (
              'Update Password'
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <Button asChild variant="ghost">
          <Link href={loginPath}>Back to Login</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
