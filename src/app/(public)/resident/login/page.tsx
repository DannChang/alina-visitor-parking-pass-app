import { getTranslations } from 'next-intl/server';
import { LanguageSwitcherDock } from '@/components/language-switcher-dock';
import { ResidentLoginForm } from '@/components/resident/resident-login-form';

function getResidentCallbackUrl(rawCallbackUrl?: string) {
  if (!rawCallbackUrl || !rawCallbackUrl.startsWith('/resident')) {
    return '/resident/passes';
  }

  return rawCallbackUrl.includes('/resident/login') ? '/resident/passes' : rawCallbackUrl;
}

export default async function ResidentLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = getResidentCallbackUrl(params.callbackUrl);
  const t = await getTranslations('resident');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <LanguageSwitcherDock />
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900">{t('portalTitle')}</h1>
        <p className="text-sm text-slate-600">{t('loginSubtitle')}</p>
      </div>
      <ResidentLoginForm
        showResetSuccess={params.reset === 'success'}
        callbackUrl={callbackUrl}
        labels={{
          login: t('login'),
          passwordUpdatedTitle: t('passwordUpdatedTitle'),
          passwordUpdatedDescription: t('passwordUpdatedDescription'),
          building: t('building'),
          unitNumber: t('unitNumber'),
          unitNumberPlaceholder: t('unitNumberPlaceholder'),
          password: t('password'),
          forgotPassword: t('forgotPassword'),
          passwordPlaceholder: t('passwordPlaceholder'),
          signingIn: t('signingIn'),
          signIn: t('signIn'),
          loginMissingFields: t('loginMissingFields'),
          invalidResidentCredentials: t('invalidResidentCredentials'),
          unexpectedError: t('unexpectedError'),
        }}
      />
    </main>
  );
}
