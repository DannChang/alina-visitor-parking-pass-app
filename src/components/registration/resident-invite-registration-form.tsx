'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { ResidentInviteStatus } from '@/components/dashboard/resident-invite-shared';

interface ResidentInvitePreview {
  id: string;
  status: ResidentInviteStatus;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string | null;
  expiresAt: string;
  createdAt: string;
  revokeReason: string | null;
  building: {
    id: string;
    name: string;
    slug: string;
  };
  unit: {
    id: string;
    unitNumber: string;
  };
}

interface ResidentInviteRegistrationFormProps {
  token: string;
  invite: ResidentInvitePreview | null;
}

function getBlockedMessage(invite: ResidentInvitePreview | null) {
  if (!invite) {
    return {
      title: 'Registration Link Invalid',
      description:
        'This registration link is invalid or no longer exists. Contact your building management team for a new link.',
    };
  }

  if (invite.status === 'CONSUMED') {
    return {
      title: 'Registration Already Completed',
      description:
        'This registration link has already been used. Sign in from the resident portal if you already created your account.',
    };
  }

  if (invite.status === 'REVOKED') {
    return {
      title: 'Registration Link Revoked',
      description:
        invite.revokeReason ||
        'This registration link was revoked. Contact your building management team for a new link.',
    };
  }

  return {
    title: 'Registration Link Expired',
    description:
      'This registration link expired. Contact your building management team to request a new registration pass.',
  };
}

export function ResidentInviteRegistrationForm({
  token,
  invite,
}: ResidentInviteRegistrationFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const blockedContent = useMemo(() => getBlockedMessage(invite), [invite]);

  if (!invite || invite.status !== 'PENDING') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <CardTitle>{blockedContent.title}</CardTitle>
          <CardDescription>{blockedContent.description}</CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center">
          <Button asChild variant="outline">
            <Link href="/resident/login">Go to Resident Login</Link>
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
      const response = await fetch('/api/resident-invites/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete registration');
      }

      const signInResult = await signIn('resident-credentials', {
        buildingSlug: data.buildingSlug,
        unitNumber: data.unitNumber,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setSignedIn(true);
        setError(
          'Your account was created, but automatic sign-in failed. Use the resident login page to continue.'
        );
        return;
      }

      setSignedIn(true);
      router.replace('/dashboard/passes');
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to complete registration'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (signedIn && !error) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-7 w-7 text-success" />
          </div>
          <CardTitle>Account Created</CardTitle>
          <CardDescription>Signing you in to the resident portal.</CardDescription>
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
        <CardTitle>Complete Your Registration</CardTitle>
        <CardDescription>
          Set the password for your resident account at {invite.building.name}, unit{' '}
          {invite.unit.unitNumber}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Registration error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="rounded-lg bg-muted/40 p-4 text-sm">
          <p className="font-medium">{invite.recipientName}</p>
          <p className="text-muted-foreground">{invite.recipientEmail}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            This one-time link expires{' '}
            {formatDistanceToNow(new Date(invite.expiresAt), { addSuffix: true })}.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resident-registration-password">Password</Label>
            <Input
              id="resident-registration-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 md:h-10"
              autoComplete="new-password"
              placeholder="Create a password"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resident-registration-password-confirm">
              Confirm Password
            </Label>
            <Input
              id="resident-registration-password-confirm"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="h-11 md:h-10"
              autoComplete="new-password"
              placeholder="Confirm your password"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Completing registration...
              </>
            ) : (
              'Activate Account'
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <Button asChild variant="ghost">
          <Link href="/resident/login">Back to Resident Login</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
