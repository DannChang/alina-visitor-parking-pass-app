import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth, signOut } from '@/lib/auth';
import { Car, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getNavItemsForRole, NAV_ICONS } from '@/lib/navigation';
import { MobileNav } from '@/components/mobile-nav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const initials = session.user.name
    ? session.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : session.user.email?.charAt(0).toUpperCase() || 'U';

  // Get navigation items based on user's role
  const navItems = getNavItemsForRole(session.user.role);

  // Server action for sign out
  async function handleSignOut() {
    'use server';
    await signOut({ redirectTo: '/login' });
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Mobile Header - visible on mobile only */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-card px-4 md:hidden safe-area-inset-top">
        <MobileNav
          navItems={navItems}
          user={{
            name: session.user.name,
            email: session.user.email,
            role: session.user.role,
          }}
          initials={initials}
          signOutAction={handleSignOut}
        />
        <div className="flex items-center">
          <Car className="mr-2 h-6 w-6 text-primary" />
          <span className="font-semibold">Alina Parking</span>
        </div>
        {/* Spacer for centering */}
        <div className="w-11" />
      </header>

      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="hidden md:fixed md:left-0 md:top-0 md:z-40 md:block md:h-screen md:w-64 md:border-r md:bg-card">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b px-6">
            <Car className="mr-2 h-6 w-6 text-primary" />
            <span className="font-semibold">Alina Parking</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const Icon = NAV_ICONS[item.iconName];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User menu */}
          <div className="border-t p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start px-2">
                  <Avatar className="mr-2 h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-sm">
                    <span className="font-medium">{session.user.name || 'User'}</span>
                    <span className="text-xs text-muted-foreground">{session.user.role}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{session.user.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {session.user.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form action={handleSignOut}>
                    <button type="submit" className="flex w-full items-center">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main content - responsive padding */}
      <main className="flex-1 p-4 pb-8 md:ml-64 md:p-8">{children}</main>
    </div>
  );
}
