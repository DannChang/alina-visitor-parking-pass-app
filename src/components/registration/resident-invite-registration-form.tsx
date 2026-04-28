'use client';

import Link from 'next/link';
import { useMemo, useRef, useState, useCallback } from 'react';
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
import { PRIVACY_POLICY_VERSION } from '@/lib/privacy-policy';
import { PrivacyPolicyContent } from './privacy-policy-content';
import {
  PASSWORD_REQUIREMENTS_TEXT,
  RESIDENT_INTEGER_FIELD_MAX_LENGTH,
  getAssignedStallValidationError,
  getPasswordValidationError,
  getStrataLotValidationError,
  sanitizeIntegerFieldInput,
  sanitizeStrictLicensePlateInput,
} from '@/lib/validation';
import { LICENSE_PLATE_CONFIG } from '@/lib/constants';

interface ResidentInvitePreview {
  id: string;
  status: ResidentInviteStatus;
  recipientName: string | null;
  recipientEmail: string | null;
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
  const [recipientName, setRecipientName] = useState(invite?.recipientName ?? '');
  const [recipientEmail, setRecipientEmail] = useState(invite?.recipientEmail ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [strataLotNumber, setStrataLotNumber] = useState('');
  const [assignedStallNumbers, setAssignedStallNumbers] = useState(['']);
  const [personalLicensePlates, setPersonalLicensePlates] = useState(['']);
  const [hasVehicle, setHasVehicle] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [hasScrolledPolicy, setHasScrolledPolicy] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [strataLotTouched, setStrataLotTouched] = useState(false);
  const [assignedStallTouched, setAssignedStallTouched] = useState<boolean[]>([false]);
  const [licensePlateTouched, setLicensePlateTouched] = useState<boolean[]>([false]);
  const [recipientNameTouched, setRecipientNameTouched] = useState(false);
  const [recipientEmailTouched, setRecipientEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const policyScrollRef = useRef<HTMLDivElement>(null);

  const blockedContent = useMemo(() => getBlockedMessage(invite), [invite]);
  const requiresRecipientDetails = !invite?.recipientEmail || !invite?.recipientName;
  const cleanedRecipientName = recipientName.trim();
  const cleanedRecipientEmail = recipientEmail.trim().toLowerCase();

  const cleanedStrataLotNumber = strataLotNumber.trim();
  const cleanedAssignedStallNumbers = assignedStallNumbers.map((stallNumber) => stallNumber.trim());
  const cleanedPersonalLicensePlates = hasVehicle
    ? personalLicensePlates.map((licensePlate) => licensePlate.trim().toUpperCase())
    : [];

  const strataLotError = getStrataLotValidationError(cleanedStrataLotNumber);
  const assignedStallErrors = cleanedAssignedStallNumbers.map(getAssignedStallValidationError);
  const hasAssignedStallErrors = assignedStallErrors.some(Boolean);
  const licensePlateErrors = hasVehicle
    ? cleanedPersonalLicensePlates.map((licensePlate) => {
        if (!licensePlate) {
          return 'Personal license plate is required.';
        }

        if (
          !new RegExp(
            `^[A-Z0-9]{${LICENSE_PLATE_CONFIG.minLength},${LICENSE_PLATE_CONFIG.maxLength}}$`
          ).test(licensePlate)
        ) {
          return `License plate must be ${LICENSE_PLATE_CONFIG.minLength} to ${LICENSE_PLATE_CONFIG.maxLength} alphanumeric characters.`;
        }

        return null;
      })
    : [];
  const hasLicensePlateErrors = licensePlateErrors.some(Boolean);
  const passwordError = getPasswordValidationError(password);
  const recipientNameError =
    requiresRecipientDetails && !cleanedRecipientName ? 'Resident name is required.' : null;
  const recipientEmailError =
    requiresRecipientDetails && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedRecipientEmail)
      ? 'A valid email is required.'
      : null;
  const confirmPasswordError =
    confirmPassword.length > 0 && password !== confirmPassword ? 'Passwords do not match.' : null;
  const showStrataLotError = Boolean(strataLotError && (hasAttemptedSubmit || strataLotTouched));
  const showRecipientNameError = Boolean(
    recipientNameError && (hasAttemptedSubmit || recipientNameTouched)
  );
  const showRecipientEmailError = Boolean(
    recipientEmailError && (hasAttemptedSubmit || recipientEmailTouched)
  );
  const showAssignedStallErrors = assignedStallErrors.map((stallError, index) =>
    Boolean(stallError && (hasAttemptedSubmit || assignedStallTouched[index]))
  );
  const showLicensePlateErrors = licensePlateErrors.map((licensePlateError, index) =>
    Boolean(licensePlateError && (hasAttemptedSubmit || licensePlateTouched[index]))
  );
  const showPasswordError = Boolean(passwordError && (hasAttemptedSubmit || passwordTouched));
  const showConfirmPasswordError = Boolean(
    confirmPasswordError && (hasAttemptedSubmit || confirmPasswordTouched)
  );

  const canSubmit =
    !isSubmitting &&
    !recipientNameError &&
    !recipientEmailError &&
    !strataLotError &&
    cleanedAssignedStallNumbers.length > 0 &&
    !hasAssignedStallErrors &&
    (!hasVehicle || (cleanedPersonalLicensePlates.length > 0 && !hasLicensePlateErrors)) &&
    !passwordError &&
    !confirmPasswordError &&
    hasScrolledPolicy &&
    privacyAgreed;

  const handlePolicyScroll = useCallback(() => {
    const el = policyScrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
    if (atBottom && !hasScrolledPolicy) {
      setHasScrolledPolicy(true);
    }
  }, [hasScrolledPolicy]);

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
            <Link href="/resident/login?showResidentLogin=1">Go to Resident Login</Link>
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

  function removeListValue(setter: Dispatch<SetStateAction<string[]>>, index: number) {
    setter((currentValues) =>
      currentValues.length === 1
        ? currentValues
        : currentValues.filter((_, currentIndex) => currentIndex !== index)
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setHasAttemptedSubmit(true);

    if (recipientNameError) {
      setError(recipientNameError);
      return;
    }

    if (recipientEmailError) {
      setError(recipientEmailError);
      return;
    }

    if (strataLotError) {
      setError(strataLotError);
      return;
    }

    if (cleanedAssignedStallNumbers.length === 0 || hasAssignedStallErrors) {
      setError(
        assignedStallErrors.find(Boolean) ?? 'At least one assigned stall number is required.'
      );
      return;
    }

    if (hasVehicle && (cleanedPersonalLicensePlates.length === 0 || hasLicensePlateErrors)) {
      setError(
        licensePlateErrors.find(Boolean) ?? 'At least one personal license plate is required.'
      );
      return;
    }

    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (confirmPasswordError) {
      setError(confirmPasswordError);
      return;
    }

    if (!hasScrolledPolicy) {
      setError('Please scroll through the privacy policy before activating your account.');
      return;
    }

    if (!privacyAgreed) {
      setError('You must review and accept the privacy policy before activating your account.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/resident-invites/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          recipientName: requiresRecipientDetails ? cleanedRecipientName : undefined,
          recipientEmail: requiresRecipientDetails ? cleanedRecipientEmail : undefined,
          password,
          hasVehicle,
          strataLotNumber: cleanedStrataLotNumber,
          assignedStallNumbers: cleanedAssignedStallNumbers.filter(Boolean),
          personalLicensePlates: cleanedPersonalLicensePlates.filter(Boolean),
          privacyConsent: true,
          privacyPolicyVersion: PRIVACY_POLICY_VERSION,
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
      router.replace('/resident/passes');
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Failed to complete registration'
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
          <p className="font-medium">{invite.recipientName ?? 'Unit registration link'}</p>
          {invite.recipientEmail ? (
            <p className="text-muted-foreground">{invite.recipientEmail}</p>
          ) : (
            <p className="text-muted-foreground">
              Enter your name and email to activate this unit.
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            This one-time link expires{' '}
            {formatDistanceToNow(new Date(invite.expiresAt), { addSuffix: true })}.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {requiresRecipientDetails ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="resident-registration-name">Full Name</Label>
                <Input
                  id="resident-registration-name"
                  value={recipientName}
                  onChange={(event) => setRecipientName(event.target.value)}
                  onBlur={() => setRecipientNameTouched(true)}
                  className="h-11 md:h-10"
                  autoComplete="name"
                  required
                />
                {showRecipientNameError && (
                  <p className="text-sm text-destructive">{recipientNameError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="resident-registration-email">Email</Label>
                <Input
                  id="resident-registration-email"
                  type="email"
                  value={recipientEmail}
                  onChange={(event) => setRecipientEmail(event.target.value)}
                  onBlur={() => setRecipientEmailTouched(true)}
                  className="h-11 md:h-10"
                  autoComplete="email"
                  required
                />
                {showRecipientEmailError && (
                  <p className="text-sm text-destructive">{recipientEmailError}</p>
                )}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="resident-registration-strata-lot">Strata Lot #</Label>
            <Input
              id="resident-registration-strata-lot"
              value={strataLotNumber}
              onChange={(event) =>
                setStrataLotNumber(sanitizeIntegerFieldInput(event.target.value))
              }
              onBlur={() => setStrataLotTouched(true)}
              className="h-11 md:h-10"
              placeholder="123"
              inputMode="numeric"
              maxLength={RESIDENT_INTEGER_FIELD_MAX_LENGTH}
              pattern={`\\d{1,${RESIDENT_INTEGER_FIELD_MAX_LENGTH}}`}
              required
            />
            {showStrataLotError && <p className="text-sm text-destructive">{strataLotError}</p>}
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
                onClick={() => {
                  addListValue(setAssignedStallNumbers);
                  setAssignedStallTouched((current) => [...current, false]);
                }}
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
                        sanitizeIntegerFieldInput(event.target.value)
                      )
                    }
                    onBlur={() =>
                      setAssignedStallTouched((current) =>
                        current.map((value, currentIndex) =>
                          currentIndex === index ? true : value
                        )
                      )
                    }
                    className="h-11 md:h-10"
                    placeholder={`Stall #${index + 1}`}
                    inputMode="numeric"
                    maxLength={RESIDENT_INTEGER_FIELD_MAX_LENGTH}
                    pattern={`\\d{1,${RESIDENT_INTEGER_FIELD_MAX_LENGTH}}`}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      removeListValue(setAssignedStallNumbers, index);
                      setAssignedStallTouched((current) =>
                        current.length === 1
                          ? current
                          : current.filter((_, currentIndex) => currentIndex !== index)
                      );
                    }}
                    disabled={assignedStallNumbers.length === 1}
                    aria-label={`Remove assigned stall ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {assignedStallErrors.map(
                (stallError, index) =>
                  showAssignedStallErrors[index] && (
                    <p key={`stall-error-${index}`} className="text-sm text-destructive">
                      {stallError}
                    </p>
                  )
              )}
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
                onClick={() => {
                  addListValue(setPersonalLicensePlates);
                  setLicensePlateTouched((current) => [...current, false]);
                }}
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
                    setLicensePlateTouched([false]);
                  }
                }}
              />
              <div className="space-y-1">
                <Label htmlFor="resident-registration-no-vehicle" className="cursor-pointer">
                  I don&apos;t have a vehicle
                </Label>
                <p className="text-sm text-muted-foreground">
                  You can finish registration now without adding a vehicle.
                </p>
              </div>
            </div>

            <div className="space-y-2" aria-hidden={!hasVehicle}>
              {personalLicensePlates.map((licensePlate, index) => (
                <div key={`plate-${index}`} className="flex items-center gap-2">
                  <Input
                    value={licensePlate}
                    onChange={(event) =>
                      updateListValue(
                        setPersonalLicensePlates,
                        index,
                        sanitizeStrictLicensePlateInput(event.target.value)
                      )
                    }
                    onBlur={() =>
                      setLicensePlateTouched((current) =>
                        current.map((value, currentIndex) =>
                          currentIndex === index ? true : value
                        )
                      )
                    }
                    className="h-11 uppercase md:h-10"
                    placeholder={`License plate #${index + 1}`}
                    maxLength={LICENSE_PLATE_CONFIG.maxLength}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    required={hasVehicle}
                    disabled={!hasVehicle}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      removeListValue(setPersonalLicensePlates, index);
                      setLicensePlateTouched((current) =>
                        current.length === 1
                          ? current
                          : current.filter((_, currentIndex) => currentIndex !== index)
                      );
                    }}
                    disabled={!hasVehicle || personalLicensePlates.length === 1}
                    aria-label={`Remove license plate ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {licensePlateErrors.map(
                (licensePlateError, index) =>
                  showLicensePlateErrors[index] && (
                    <p key={`plate-error-${index}`} className="text-sm text-destructive">
                      {licensePlateError}
                    </p>
                  )
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="resident-registration-password">Password</Label>
            <Input
              id="resident-registration-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onBlur={() => setPasswordTouched(true)}
              className="h-11 md:h-10"
              autoComplete="new-password"
              placeholder="Create a password"
              required
            />
            <p className="text-xs text-muted-foreground">{PASSWORD_REQUIREMENTS_TEXT}</p>
            {showPasswordError && <p className="text-sm text-destructive">{passwordError}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="resident-registration-password-confirm">Confirm Password</Label>
            <Input
              id="resident-registration-password-confirm"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              onBlur={() => setConfirmPasswordTouched(true)}
              className="h-11 md:h-10"
              autoComplete="new-password"
              placeholder="Confirm your password"
              required
            />
            {showConfirmPasswordError && (
              <p className="text-sm text-destructive">{confirmPasswordError}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Privacy Policy</Label>
            <div
              ref={policyScrollRef}
              onScroll={handlePolicyScroll}
              data-testid="resident-registration-privacy-policy"
              className="h-56 overflow-y-auto rounded-lg border bg-muted/20 p-4"
            >
              <PrivacyPolicyContent />
            </div>
            {!hasScrolledPolicy && (
              <p className="text-center text-xs text-muted-foreground">
                Scroll to the bottom to enable the consent checkbox.
              </p>
            )}
            <div className="flex items-start gap-3">
              <Checkbox
                id="resident-registration-privacy-consent"
                checked={privacyAgreed}
                onCheckedChange={(checked) => setPrivacyAgreed(checked === true)}
                disabled={!hasScrolledPolicy}
                className="mt-0.5"
              />
              <Label
                htmlFor="resident-registration-privacy-consent"
                className={`text-sm leading-snug ${
                  hasScrolledPolicy
                    ? 'cursor-pointer text-foreground'
                    : 'cursor-not-allowed text-muted-foreground/50'
                }`}
              >
                I have read and agree to the Privacy Policy. I consent to the collection, use, and
                disclosure of my personal information for resident account setup and parking
                administration.
              </Label>
            </div>
          </div>

          <Button type="submit" className="min-h-[48px] w-full" disabled={!canSubmit}>
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
          <Link href="/?showAuthChooser=1">Back to Resident Login</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
