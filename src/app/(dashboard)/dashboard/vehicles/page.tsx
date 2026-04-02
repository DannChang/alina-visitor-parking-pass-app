import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/authorization';
import { VehiclesClientPage } from '@/components/dashboard/vehicles-client-page';

export default async function VehiclesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  if (!hasPermission(session.user.role, 'vehicles:view')) {
    redirect('/dashboard?error=access_denied');
  }

  return <VehiclesClientPage />;
}
