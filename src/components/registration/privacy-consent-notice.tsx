'use client';

import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface PrivacyConsentNoticeProps {
  agreed: boolean;
  checkboxId: string;
  onAgreedChange: (agreed: boolean) => void;
  context?: 'visitor-pass' | 'resident-account';
}

export function PrivacyConsentNotice({
  agreed,
  checkboxId,
  onAgreedChange,
  context = 'visitor-pass',
}: PrivacyConsentNoticeProps) {
  const isResidentAccount = context === 'resident-account';

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/20 p-4">
        <h3 className="text-sm font-semibold text-foreground">Privacy Notice</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {isResidentAccount
            ? 'We collect the information you enter to create and manage your resident account and related parking records for your building.'
            : 'We collect the information you enter to issue and manage a visitor parking pass for the property you are visiting.'}
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            {isResidentAccount
              ? 'We collect your resident registration details, unit and stall details, vehicle information if provided, and account credentials.'
              : 'We collect your vehicle details, contact details, unit/building details, and pass timing.'}
          </li>
          <li>
            Web submissions also record technical details such as IP address and browser user agent.
          </li>
          <li>
            {isResidentAccount
              ? 'We use this information to activate your account, manage resident parking records, send service messages, and protect the service from misuse.'
              : 'We use this information to issue passes, send service messages, enforce parking rules, and protect the service from misuse.'}
          </li>
          <li>
            Information may be shared with authorized property management, security staff, service
            providers, or authorities where required by law.
          </li>
          <li>
            We keep personal information only as long as reasonably necessary for these purposes and
            to meet legal requirements.
          </li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          You can read the full policy and contact information at{' '}
          <Link
            href="/privacy-policy"
            className="font-medium text-primary underline underline-offset-2"
          >
            the full privacy policy
          </Link>
          .
        </p>
      </div>

      <div className="flex items-start gap-3">
        <Checkbox
          id={checkboxId}
          checked={agreed}
          onCheckedChange={(checked) => onAgreedChange(checked === true)}
          className="mt-0.5"
        />
        <Label htmlFor={checkboxId} className="cursor-pointer text-sm leading-snug">
          {isResidentAccount
            ? 'I have read the privacy notice and privacy policy, and I consent to the collection, use, and disclosure of my personal information for resident account setup and parking administration.'
            : 'I have read the privacy notice and privacy policy, and I consent to the collection, use, and disclosure of my personal information for visitor parking administration.'}
        </Label>
      </div>
    </div>
  );
}
