import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/authorization';
import { PatrolLogbook } from '@/components/patrol/patrol-logbook';

export default async function PatrolLogPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  if (!hasPermission(session.user.role, 'passes:view_all')) {
    redirect('/dashboard?error=access_denied');
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Patrol Log</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Electronic logbook for patrol observations and vehicle tracking
        </p>
      </div>
      <PatrolLogbook />
    </div>
  );
}
