import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/authorization';
import { PatrolLogbook } from '@/components/patrol/patrol-logbook';
import { getTranslations } from 'next-intl/server';

export default async function PatrolLogPage() {
  const [session, t] = await Promise.all([auth(), getTranslations('dashboard.patrolLogPage')]);

  if (!session?.user) {
    redirect('/login');
  }

  if (!hasPermission(session.user.role, 'passes:view_all')) {
    redirect('/dashboard?error=access_denied');
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-sm md:text-base text-muted-foreground">{t('description')}</p>
      </div>
      <PatrolLogbook />
    </div>
  );
}
