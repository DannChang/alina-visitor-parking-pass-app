import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/authorization';
import { ViolationsClientPage } from '@/components/dashboard/violations-client-page';

export default async function ViolationsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user) {
    redirect('/login');
  }

  // Defense in depth: verify permission at page level
  if (!hasPermission(session.user.role, 'violations:view')) {
    redirect('/dashboard?error=access_denied');
  }

  return <ViolationsClientPage initialDateFilter={params.date || null} />;
}
