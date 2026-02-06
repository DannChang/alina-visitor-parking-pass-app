import { redirect } from 'next/navigation';
import { auth, signOut } from '@/lib/auth';
import { hasPermission } from '@/lib/authorization';
import { getNavItemsForRole } from '@/lib/navigation';
import { PatrolDashboard } from '@/components/patrol/patrol-dashboard';

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

  // Not logged in - show landing page
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="max-w-2xl text-center">
        <div className="mb-8">
          <h1 className="mb-4 text-5xl font-bold tracking-tight text-slate-900">
            Alina Visitor Parking
          </h1>
          <p className="text-xl text-slate-600">
            Mission-critical parking management for healthcare facilities
          </p>
        </div>

        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-6 text-2xl font-semibold text-slate-800">
            Welcome
          </h2>

          <div className="space-y-4">
            <p className="text-slate-600">
              Scan a QR code in the parking lot to register your vehicle, or log in to access the management dashboard.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a
                href="/login"
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
              >
                Staff Login
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 text-sm text-slate-500">
          <p>Built with Next.js 15 • TypeScript • Prisma • Tailwind CSS</p>
        </div>
      </div>
    </main>
  );
}
