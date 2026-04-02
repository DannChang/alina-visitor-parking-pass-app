import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/authorization';
import { PatrolScannerPage } from '@/components/patrol/patrol-scanner-page';

export default async function PatrolPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  if (!hasPermission(session.user.role, 'passes:view_all')) {
    redirect('/dashboard?error=access_denied');
  }

  return <PatrolScannerPage />;
}
