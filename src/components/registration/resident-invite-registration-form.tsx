'use client';

import Link from 'next/link';
import { useMemo, useRef, useState, useCallback } from 'react';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
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
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  RESIDENT_INTEGER_FIELD_MAX_LENGTH,
  RESIDENT_INTEGER_FIELD_PATTERN,
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

function getBlockedMessage(
  invite: ResidentInvitePreview | null,
  t: ReturnType<typeof useTranslations<'resident'>>
) {
  if (!invite) {
    return {
      title: t('registrationInvalidTitle'),
      description: t('registrationInvalidDesc'),
    };
  }

  if (invite.status === 'CONSUMED') {
    return {
      title: t('registrationCompletedTitle'),
      description: t('registrationCompletedDesc'),
    };
  }

  if (invite.status === 'REVOKED') {
    return {
      title: t('registrationRevokedTitle'),
      description: invite.revokeReason || t('registrationRevokedDesc'),
    };
  }

  return {
    title: t('registrationExpiredTitle'),
    description: t('registrationExpiredDesc'),
  };
}

function getLocalizedIntegerFieldError(
  value: string,
  requiredMessage: string,
  lengthMessage: string
) {
  const trimmed = value.trim();

  if (!trimmed) {
    return requiredMessage;
  }

  if (!RESIDENT_INTEGER_FIELD_PATTERN.test(trimmed)) {
    return lengthMessage;
  }

  return null;
}

function getLocalizedPasswordError(
  value: string,
  t: ReturnType<typeof useTranslations<'resident'>>
) {
  if (!value.trim()) {
    return t('passwordRequired');
  }

  const passwordLength = Array.from(value.normalize('NFC')).length;

  if (passwordLength < PASSWORD_MIN_LENGTH) {
    return t('passwordMinLength', { count: PASSWORD_MIN_LENGTH });
  }

  if (passwordLength > PASSWORD_MAX_LENGTH) {
    return t('passwordMaxLength', { count: PASSWORD_MAX_LENGTH });
  }

  return null;
}

function formatRelativeTime(value: string, locale: string) {
  const deltaSeconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  const absSeconds = Math.abs(deltaSeconds);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (absSeconds < 60) {
    return formatter.format(deltaSeconds, 'second');
  }
  if (absSeconds < 3600) {
    return formatter.format(Math.round(deltaSeconds / 60), 'minute');
  }
  if (absSeconds < 86400) {
    return formatter.format(Math.round(deltaSeconds / 3600), 'hour');
  }

  return formatter.format(Math.round(deltaSeconds / 86400), 'day');
}

export function ResidentInviteRegistrationForm({
  token,
  invite,
}: ResidentInviteRegistrationFormProps) {
  const t = useTranslations('resident');
  const locale = useLocale();
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

  const blockedContent = useMemo(() => getBlockedMessage(invite, t), [invite, t]);
  const requiresRecipientDetails = !invite?.recipientEmail || !invite?.recipientName;
  const cleanedRecipientName = recipientName.trim();
  const cleanedRecipientEmail = recipientEmail.trim().toLowerCase();

  const cleanedStrataLotNumber = strataLotNumber.trim();
  const cleanedAssignedStallNumbers = assignedStallNumbers.map((stallNumber) => stallNumber.trim());
  const cleanedPersonalLicensePlates = hasVehicle
    ? personalLicensePlates.map((licensePlate) => licensePlate.trim().toUpperCase())
    : [];

  const strataLotError = getLocalizedIntegerFieldError(
    cleanedStrataLotNumber,
    t('strataLotRequired'),
    t('strataLotDigits', { count: RESIDENT_INTEGER_FIELD_MAX_LENGTH })
  );
  const assignedStallErrors = cleanedAssignedStallNumbers.map((stallNumber) =>
    getLocalizedIntegerFieldError(
      stallNumber,
      t('assignedStallNumberRequired'),
      t('assignedStallDigits', { count: RESIDENT_INTEGER_FIELD_MAX_LENGTH })
    )
  );
  const hasAssignedStallErrors = assignedStallErrors.some(Boolean);
  const licensePlateErrors = hasVehicle
    ? cleanedPersonalLicensePlates.map((licensePlate) => {
        if (!licensePlate) {
          return t('personalPlateRequired');
        }

        if (
          !new RegExp(
            `^[A-Z0-9]{${LICENSE_PLATE_CONFIG.minLength},${LICENSE_PLATE_CONFIG.maxLength}}$`
          ).test(licensePlate)
        ) {
          return t('licensePlateLength', {
            min: LICENSE_PLATE_CONFIG.minLength,
            max: LICENSE_PLATE_CONFIG.maxLength,
          });
        }

        return null;
      })
    : [];
  const hasLicensePlateErrors = licensePlateErrors.some(Boolean);
  const passwordError = getLocalizedPasswordError(password, t);
  const recipientNameError =
    requiresRecipientDetails && !cleanedRecipientName ? t('residentNameRequired') : null;
  const recipientEmailError =
    requiresRecipientDetails && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedRecipientEmail)
      ? t('validEmailRequired')
      : null;
  const confirmPasswordError =
    confirmPassword.length > 0 && password !== confirmPassword ? t('passwordsDoNotMatch') : null;
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
            <Link href="/resident/login?showResidentLogin=1">{t('goToResidentLogin')}</Link>
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
      setError(assignedStallErrors.find(Boolean) ?? t('assignedStallRequired'));
      return;
    }

    if (hasVehicle && (cleanedPersonalLicensePlates.length === 0 || hasLicensePlateErrors)) {
      setError(licensePlateErrors.find(Boolean) ?? t('personalPlateOneRequired'));
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
      setError(t('scrollPolicyRequired'));
      return;
    }

    if (!privacyAgreed) {
      setError(t('acceptPolicyRequired'));
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
        throw new Error(data.error || t('failedCompleteRegistration'));
      }

      const signInResult = await signIn('resident-credentials', {
        buildingSlug: data.buildingSlug,
        unitNumber: data.unitNumber,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setSignedIn(true);
        setError(t('accountCreatedSignInFailed'));
        return;
      }

      setSignedIn(true);
      router.replace('/resident/passes');
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : t('failedCompleteRegistration')
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
          <CardTitle>{t('accountCreated')}</CardTitle>
          <CardDescription>{t('signingIntoResidentPortal')}</CardDescription>
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
        <CardTitle>{t('completeRegistration')}</CardTitle>
        <CardDescription>
          {t('completeRegistrationDesc', {
            building: invite.building.name,
            unit: invite.unit.unitNumber,
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('registrationError')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="rounded-lg bg-muted/40 p-4 text-sm">
          <p className="font-medium">{invite.recipientName ?? t('unitRegistrationLink')}</p>
          {invite.recipientEmail ? (
            <p className="text-muted-foreground">{invite.recipientEmail}</p>
          ) : (
            <p className="text-muted-foreground">{t('enterNameEmailActivate')}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {t('inviteExpires', {
              time: formatRelativeTime(invite.expiresAt, locale),
            })}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {requiresRecipientDetails ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="resident-registration-name">{t('fullName')}</Label>
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
                <Label htmlFor="resident-registration-email">{t('email')}</Label>
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
            <Label htmlFor="resident-registration-strata-lot">{t('strataLot')}</Label>
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
                <Label>{t('assignedStalls')}</Label>
                <p className="text-sm text-muted-foreground">{t('assignedStallsDesc')}</p>
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
                {t('addStall')}
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
                    placeholder={t('stallPlaceholder', { number: index + 1 })}
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
                    aria-label={t('removeAssignedStall', { number: index + 1 })}
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
                <Label>{t('personalLicensePlates')}</Label>
                <p className="text-sm text-muted-foreground">{t('personalLicensePlatesDesc')}</p>
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
                {t('addPlate')}
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
                  {t('noVehicle')}
                </Label>
                <p className="text-sm text-muted-foreground">{t('noVehicleDesc')}</p>
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
                    placeholder={t('licensePlatePlaceholder', { number: index + 1 })}
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
                    aria-label={t('removeLicensePlate', { number: index + 1 })}
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
            <Label htmlFor="resident-registration-password">{t('password')}</Label>
            <Input
              id="resident-registration-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onBlur={() => setPasswordTouched(true)}
              className="h-11 md:h-10"
              autoComplete="new-password"
              placeholder={t('createPassword')}
              required
            />
            <p className="text-xs text-muted-foreground">{t('passwordRequirements')}</p>
            {showPasswordError && <p className="text-sm text-destructive">{passwordError}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="resident-registration-password-confirm">{t('confirmPassword')}</Label>
            <Input
              id="resident-registration-password-confirm"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              onBlur={() => setConfirmPasswordTouched(true)}
              className="h-11 md:h-10"
              autoComplete="new-password"
              placeholder={t('confirmPasswordPlaceholder')}
              required
            />
            {showConfirmPasswordError && (
              <p className="text-sm text-destructive">{confirmPasswordError}</p>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">{t('privacyPolicy')}</Label>
            <div
              ref={policyScrollRef}
              onScroll={handlePolicyScroll}
              data-testid="resident-registration-privacy-policy"
              className="h-56 overflow-y-auto rounded-lg border bg-muted/20 p-4"
            >
              <PrivacyPolicyContent />
            </div>
            {!hasScrolledPolicy && (
              <p className="text-center text-xs text-muted-foreground">{t('scrollPolicy')}</p>
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
                {t('residentPrivacyConsent')}
              </Label>
            </div>
          </div>

          <Button type="submit" className="min-h-[48px] w-full" disabled={!canSubmit}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('completingRegistration')}
              </>
            ) : (
              t('activateAccount')
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <Button asChild variant="ghost">
          <Link href="/?showAuthChooser=1">{t('backToResidentLogin')}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
