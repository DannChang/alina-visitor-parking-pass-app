import { LanguageSwitcherDock } from '@/components/language-switcher-dock';
import { ResidentForgotPasswordForm } from '@/components/resident/resident-forgot-password-form';

export default function ResidentForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12">
      <LanguageSwitcherDock excludedLocales={['fa']} />
      <ResidentForgotPasswordForm />
    </main>
  );
}
