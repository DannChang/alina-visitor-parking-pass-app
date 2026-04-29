'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Car, Users, History, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LocaleSwitcher } from '@/components/locale-switcher';

const navItems = [
  { href: '/resident/passes', labelKey: 'passes', icon: Car },
  { href: '/resident/guests', labelKey: 'guests', icon: Users },
  { href: '/resident/activity', labelKey: 'activity', icon: History },
  { href: '/resident/settings', labelKey: 'settings', icon: Settings },
] as const;

export function ResidentNav() {
  const pathname = usePathname();
  const t = useTranslations('resident');

  return (
    <nav className="sticky top-0 z-40 border-b bg-white shadow-sm">
      <div className="container mx-auto max-w-lg px-4">
        <div className="flex items-center">
          <div className="flex flex-1 items-center justify-around">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex min-w-[64px] touch-manipulation flex-col items-center gap-1 px-2 py-3 text-xs font-medium transition-colors',
                    isActive
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </div>
          <LocaleSwitcher excludedLocales={['fa']} />
        </div>
      </div>
    </nav>
  );
}
