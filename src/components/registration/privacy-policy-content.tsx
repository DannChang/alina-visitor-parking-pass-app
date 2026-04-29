import { useTranslations } from 'next-intl';
import { Shield, Database, Clock, Eye, UserCheck, Globe, Mail } from 'lucide-react';
import { PRIVACY_POLICY_LAST_UPDATED } from '@/lib/privacy-policy';

export function PrivacyPolicyContent() {
  const t = useTranslations('registration');

  return (
    <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
      <div>
        <p className="text-xs text-muted-foreground/70">
          {t('privacyLastUpdated', { date: PRIVACY_POLICY_LAST_UPDATED })}
        </p>
      </div>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Shield className="h-4 w-4 text-primary" />
          {t('privacyIntroTitle')}
        </h3>
        <p>{t('privacyIntro1')}</p>
        <p>{t('privacyIntro2')}</p>
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Database className="h-4 w-4 text-primary" />
          {t('privacyCollectTitle')}
        </h3>
        <p>{t('privacyCollectIntro')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t('privacyCollectVehicle')}</li>
          <li>{t('privacyCollectContact')}</li>
          <li>{t('privacyCollectVisit')}</li>
          <li>{t('privacyCollectTechnical')}</li>
        </ul>
        <p>{t('privacyNoPayment')}</p>
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Eye className="h-4 w-4 text-primary" />
          {t('privacyUseTitle')}
        </h3>
        <p>{t('privacyUseIntro')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t('privacyUseAdmin')}</li>
          <li>{t('privacyUseEnforcement')}</li>
          <li>{t('privacyUseComms')}</li>
          <li>{t('privacyUseSecurity')}</li>
          <li>{t('privacyUseLegal')}</li>
        </ul>
        <p>{t('privacyNoMarketing')}</p>
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <UserCheck className="h-4 w-4 text-primary" />
          {t('privacyConsentTitle')}
        </h3>
        <p>{t('privacyConsent1')}</p>
        <p>{t('privacyConsent2')}</p>
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Globe className="h-4 w-4 text-primary" />
          {t('privacyDisclosureTitle')}
        </h3>
        <p>{t('privacyDisclosureIntro')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t('privacyDisclosureProperty')}</li>
          <li>{t('privacyDisclosureProviders')}</li>
          <li>{t('privacyDisclosureLegal')}</li>
        </ul>
        <p>{t('privacyNoSell')}</p>
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Clock className="h-4 w-4 text-primary" />
          {t('privacyRetentionTitle')}
        </h3>
        <p>{t('privacyRetention1')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t('privacyRetentionPassRecords')}</li>
          <li>{t('privacyRetentionDecision')}</li>
          <li>{t('privacyRetentionDelete')}</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Shield className="h-4 w-4 text-primary" />
          {t('privacySecurityTitle')}
        </h3>
        <p>{t('privacySecurity1')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t('privacySecurityAccess')}</li>
          <li>{t('privacySecuritySystems')}</li>
          <li>{t('privacySecurityProcesses')}</li>
        </ul>
        <p>{t('privacySecurityNoGuarantee')}</p>
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <UserCheck className="h-4 w-4 text-primary" />
          {t('privacyRightsTitle')}
        </h3>
        <p>{t('privacyRightsIntro')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t('privacyRightsAccess')}</li>
          <li>{t('privacyRightsCorrection')}</li>
          <li>{t('privacyRightsQuestions')}</li>
          <li>{t('privacyRightsWithdrawal')}</li>
        </ul>
        <p>{t('privacyRightsContact')}</p>
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Globe className="h-4 w-4 text-primary" />
          {t('privacyRulesTitle')}
        </h3>
        <p>{t('privacyRules1')}</p>
        <p>{t('privacyRules2')}</p>
      </section>

      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Mail className="h-4 w-4 text-primary" />
          {t('privacyContactTitle')}
        </h3>
        <p>{t('privacyContact1')}</p>
        <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
          <p>
            <strong>{t('privacyContactBoxTitle')}</strong>
          </p>
          <p>{t('privacyContactBoxDesc')}</p>
        </div>
        <p>{t('privacyContactRegulators')}</p>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold text-foreground">{t('privacyChangesTitle')}</h3>
        <p>{t('privacyChanges1')}</p>
      </section>
    </div>
  );
}
