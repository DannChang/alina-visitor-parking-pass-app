'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Car, Users, History, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/resident/passes', label: 'Passes', icon: Car },
  { href: '/resident/guests', label: 'Guests', icon: Users },
  { href: '/resident/activity', label: 'Activity', icon: History },
  { href: '/resident/settings', label: 'Settings', icon: Settings },
];

export function ResidentNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 bg-white border-b shadow-sm">
      <div className="container mx-auto max-w-lg px-4">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 py-3 px-2 text-xs font-medium transition-colors min-w-[64px] touch-manipulation',
                  isActive
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
