'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, CheckCircle2, Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  const [strataLotNumber, setStrataLotNumber] = useState('');
  const [assignedStallNumbers, setAssignedStallNumbers] = useState(['']);
  const [personalLicensePlates, setPersonalLicensePlates] = useState(['']);
  const [hasVehicle, setHasVehicle] = useState(true);
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

  function updateListValue(
    setter: Dispatch<SetStateAction<string[]>>,
    index: number,
    value: string
  ) {
    setter((currentValues) =>
      currentValues.map((currentValue, currentIndex) =>
        currentIndex === index ? value : currentValue
      )
    );
  }

  function addListValue(setter: Dispatch<SetStateAction<string[]>>) {
    setter((currentValues) => [...currentValues, '']);
  }

  function removeListValue(
    setter: Dispatch<SetStateAction<string[]>>,
    index: number
  ) {
    setter((currentValues) =>
      currentValues.length === 1
        ? currentValues
        : currentValues.filter((_, currentIndex) => currentIndex !== index)
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const cleanedStrataLotNumber = strataLotNumber.trim();
    const cleanedAssignedStallNumbers = assignedStallNumbers
      .map((stallNumber) => stallNumber.trim())
      .filter(Boolean);
    const cleanedPersonalLicensePlates = hasVehicle
      ? personalLicensePlates
          .map((licensePlate) => licensePlate.trim().toUpperCase())
          .filter(Boolean)
      : [];

    if (!cleanedStrataLotNumber) {
      setError('Strata lot number is required.');
      return;
    }

    if (cleanedAssignedStallNumbers.length === 0) {
      setError('At least one assigned stall number is required.');
      return;
    }

    if (hasVehicle && cleanedPersonalLicensePlates.length === 0) {
      setError('At least one personal license plate is required.');
      return;
    }

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
          hasVehicle,
          strataLotNumber: cleanedStrataLotNumber,
          assignedStallNumbers: cleanedAssignedStallNumbers,
          personalLicensePlates: cleanedPersonalLicensePlates,
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
    <Card className="w-full max-w-2xl">
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

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="resident-registration-strata-lot">Strata Lot #</Label>
            <Input
              id="resident-registration-strata-lot"
              value={strataLotNumber}
              onChange={(event) => setStrataLotNumber(event.target.value)}
              className="h-11 md:h-10"
              placeholder="Enter your strata lot number"
              required
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label>Assigned Stall Number(s)</Label>
                <p className="text-sm text-muted-foreground">
                  Add each stall assigned to your home.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addListValue(setAssignedStallNumbers)}
              >
                <Plus className="h-4 w-4" />
                Add Stall
              </Button>
            </div>

            <div className="space-y-2">
              {assignedStallNumbers.map((stallNumber, index) => (
                <div key={`stall-${index}`} className="flex items-center gap-2">
                  <Input
                    value={stallNumber}
                    onChange={(event) =>
                      updateListValue(
                        setAssignedStallNumbers,
                        index,
                        event.target.value
                      )
                    }
                    className="h-11 md:h-10"
                    placeholder={`Assigned stall #${index + 1}`}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeListValue(setAssignedStallNumbers, index)}
                    disabled={assignedStallNumbers.length === 1}
                    aria-label={`Remove assigned stall ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label>Personal License Plate(s)</Label>
                <p className="text-sm text-muted-foreground">
                  Add every vehicle plate registered to your household.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addListValue(setPersonalLicensePlates)}
                disabled={!hasVehicle}
              >
                <Plus className="h-4 w-4" />
                Add Plate
              </Button>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
              <Checkbox
                id="resident-registration-no-vehicle"
                checked={!hasVehicle}
                onCheckedChange={(checked) => {
                  const noVehicle = checked === true;
                  setHasVehicle(!noVehicle);
                  if (noVehicle) {
                    setPersonalLicensePlates(['']);
                  }
                }}
              />
              <div className="space-y-1">
                <Label
                  htmlFor="resident-registration-no-vehicle"
                  className="cursor-pointer"
                >
                  I don&apos;t have a vehicle
                </Label>
                <p className="text-sm text-muted-foreground">
                  You can finish registration now and add your vehicle later from the resident
                  portal.
                </p>
              </div>
            </div>

            <div
              className="space-y-2"
              aria-hidden={!hasVehicle}
            >
              {personalLicensePlates.map((licensePlate, index) => (
                <div key={`plate-${index}`} className="flex items-center gap-2">
                  <Input
                    value={licensePlate}
                    onChange={(event) =>
                      updateListValue(
                        setPersonalLicensePlates,
                        index,
                        event.target.value.toUpperCase()
                      )
                    }
                    className="h-11 uppercase md:h-10"
                    placeholder={`License plate #${index + 1}`}
                    required={hasVehicle}
                    disabled={!hasVehicle}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeListValue(setPersonalLicensePlates, index)}
                    disabled={!hasVehicle || personalLicensePlates.length === 1}
                    aria-label={`Remove license plate ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

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
