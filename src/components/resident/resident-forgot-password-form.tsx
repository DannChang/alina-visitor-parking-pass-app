'use client';

import Link from 'next/link';
import { useState } from 'react';
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
  const [unitNumber, setUnitNumber] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!unitNumber.trim() || !email.trim()) {
      setError('Unit number and primary resident email are required.');
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
        <CardTitle className="text-2xl font-bold">Reset Resident Password</CardTitle>
        <CardDescription>
          Enter your unit and primary resident email to receive a one-time reset
          link for {APP_CONFIG.resident.defaultBuildingName}.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {submitted ? (
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertTitle>Check your email</AlertTitle>
              <AlertDescription>
                If the information matches an active primary resident account, a reset
                link has been sent.
              </AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="rounded-lg bg-muted/40 p-3 text-center text-sm text-muted-foreground">
            Building: <span className="font-medium text-foreground">{APP_CONFIG.resident.defaultBuildingName}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="resident-forgot-password-unit">
              <Home className="mr-1 inline h-3 w-3" />
              Unit Number
            </Label>
            <Input
              id="resident-forgot-password-unit"
              placeholder="e.g. 101"
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
              Primary Resident Email
            </Label>
            <Input
              id="resident-forgot-password-email"
              type="email"
              placeholder="you@example.com"
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
                Sending reset link...
              </>
            ) : (
              'Send Reset Link'
            )}
          </Button>

          <Button asChild variant="ghost" className="w-full">
            <Link href="/resident/login">Back to Resident Login</Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
