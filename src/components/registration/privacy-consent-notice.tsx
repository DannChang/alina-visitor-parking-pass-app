'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('registration');
  const isResidentAccount = context === 'resident-account';

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/20 p-4">
        <h3 className="text-sm font-semibold text-foreground">{t('privacyNoticeTitle')}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {isResidentAccount ? t('privacyNoticeResidentDesc') : t('privacyNoticeVisitorDesc')}
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            {isResidentAccount ? t('privacyResidentCollected') : t('privacyVisitorCollected')}
          </li>
          <li>{t('privacyTechnical')}</li>
          <li>{isResidentAccount ? t('privacyResidentUse') : t('privacyVisitorUse')}</li>
          <li>{t('privacyShared')}</li>
          <li>{t('privacyRetention')}</li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          {t('privacyFullPolicyPrefix')}{' '}
          <Link
            href="/privacy-policy"
            className="font-medium text-primary underline underline-offset-2"
          >
            {t('privacyFullPolicyLink')}
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
          {isResidentAccount ? t('privacyResidentConsent') : t('privacyVisitorConsent')}
        </Label>
      </div>
    </div>
  );
}
