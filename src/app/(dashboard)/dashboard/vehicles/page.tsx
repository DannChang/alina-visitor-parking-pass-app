import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/authorization';
import { VehiclesClientPage } from '@/components/dashboard/vehicles-client-page';

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user) {
    redirect('/login');
  }

  if (!hasPermission(session.user.role, 'vehicles:view')) {
    redirect('/dashboard?error=access_denied');
  }

  return <VehiclesClientPage initialSearch={params.search || ''} />;
}
