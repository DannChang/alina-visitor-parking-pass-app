import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth, signOut } from '@/lib/auth';
import { hasPermission } from '@/lib/authorization';
import { getNavItemsForRole } from '@/lib/navigation';
import { PatrolDashboard } from '@/components/patrol/patrol-dashboard';
import { Send } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { LocaleSwitcher } from '@/components/locale-switcher';

export default async function HomePage() {
  const session = await auth();

  // If user is logged in and has patrol permissions, show patrol dashboard
  if (session?.user) {
    const canPatrol = hasPermission(session.user.role, 'passes:view_all');

    if (canPatrol) {
      const navItems = getNavItemsForRole(session.user.role);
      const initials = session.user.name
        ? session.user.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
        : session.user.email?.charAt(0).toUpperCase() || 'U';

      // Server action for sign out
      async function handleSignOut() {
        'use server';
        await signOut({ redirectTo: '/login' });
      }

      return (
        <PatrolDashboard
          user={{
            name: session.user.name,
            email: session.user.email,
            role: session.user.role,
          }}
          initials={initials}
          navItems={navItems}
          signOutAction={handleSignOut}
        />
      );
    }

    // Logged in but no patrol permission - redirect to dashboard
    redirect('/dashboard');
  }

  // Not logged in - show visitor landing page
  const t = await getTranslations('landing');

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="absolute top-4 right-4">
        <LocaleSwitcher />
      </div>
      <div className="w-full max-w-sm space-y-6">
        {/* Branding */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {t('title')}
          </h1>
          <p className="mt-1 text-slate-600">
            {t('subtitle')}
          </p>
        </div>

        {/* Main Actions */}
        <div className="space-y-3">
          <Link
            href="/resident/login"
            className="flex items-center justify-center gap-3 w-full rounded-xl bg-primary px-6 py-5 text-lg font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors min-h-[64px] touch-manipulation"
          >
            <Send className="h-6 w-6" />
            {t('sendPass')}
          </Link>
        </div>

        {/* Staff Login */}
        <div className="text-center pt-4">
          <Link
            href="/login"
            className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-4"
          >
            {t('staffLogin')}
          </Link>
        </div>
      </div>
    </main>
  );
}
