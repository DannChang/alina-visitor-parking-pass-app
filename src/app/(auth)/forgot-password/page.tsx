import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { LanguageSwitcherDock } from '@/components/language-switcher-dock';

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12">
      <LanguageSwitcherDock />
      <ForgotPasswordForm />
    </main>
  );
}
