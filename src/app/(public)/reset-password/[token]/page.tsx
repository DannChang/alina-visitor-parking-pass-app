import { LanguageSwitcherDock } from '@/components/language-switcher-dock';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { getPasswordResetPreview } from '@/services/password-reset-service';

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const preview = await getPasswordResetPreview(token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12">
      <LanguageSwitcherDock excludedLocales={preview.accountType === 'resident' ? ['fa'] : []} />
      <ResetPasswordForm token={token} preview={preview} />
    </main>
  );
}
