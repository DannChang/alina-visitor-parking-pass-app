'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Car, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { NAV_ICONS, type NavItem } from '@/lib/navigation';

interface MobileNavProps {
  navItems: NavItem[];
  user: {
    name: string | null | undefined;
    email: string | null | undefined;
    role: string;
  };
  initials: string;
  signOutAction: () => Promise<void>;
}

export function MobileNav({ navItems, user, initials, signOutAction }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="min-h-touch min-w-touch touch-manipulation"
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="flex items-center justify-start">
            <Car className="mr-2 h-6 w-6 text-primary" />
            Alina Parking
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto p-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = NAV_ICONS[item.iconName];
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors min-h-touch touch-manipulation',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-4 safe-area-inset">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-medium text-sm truncate">
                {user.name || 'User'}
              </span>
              <span className="text-xs text-muted-foreground">{user.role}</span>
            </div>
          </div>
          <form action={signOutAction}>
            <Button
              variant="outline"
              className="w-full min-h-touch touch-manipulation"
              type="submit"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
