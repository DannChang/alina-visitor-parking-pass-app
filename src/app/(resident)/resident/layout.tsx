import { redirect } from 'next/navigation';
import { Car, LogOut } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { auth, signOut } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { LocaleSwitcher } from '@/components/locale-switcher';

export default async function ResidentPortalLayout({ children }: { children: React.ReactNode }) {
  const [session, tResident, tCommon] = await Promise.all([
    auth(),
    getTranslations('resident'),
    getTranslations('common'),
  ]);

  if (!session?.user) {
    redirect('/resident/login');
  }

  const loginType = (session as unknown as Record<string, unknown>).loginType;

  if (session.user.role !== 'RESIDENT' || loginType !== 'resident') {
    redirect('/dashboard');
  }

  async function handleSignOut() {
    'use server';
    await signOut({ redirectTo: '/resident/login' });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="safe-area-inset-top sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
              <Car className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                {tResident('portalTitle')}
              </p>
              <p className="truncate text-lg font-semibold text-slate-950">Alina Parking</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <form action={handleSignOut}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="rounded-full border border-slate-200 bg-white px-4 text-slate-700 shadow-sm hover:bg-slate-100"
              >
                <LogOut className="h-4 w-4" />
                {tCommon('signOut')}
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
