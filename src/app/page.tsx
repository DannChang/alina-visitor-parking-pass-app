import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { Send } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { LocaleSwitcher } from '@/components/locale-switcher';

type HomePageProps = {
  searchParams?: Promise<{ showAuthChooser?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = searchParams ? await searchParams : undefined;
  const shouldShowAuthChooser = params?.showAuthChooser === '1';
  const session = await auth();

  if (session?.user && !shouldShowAuthChooser) {
    if (session.user.role === 'RESIDENT') {
      redirect('/resident/passes');
    }
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
            href="/resident/login?showResidentLogin=1"
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
