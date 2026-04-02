'use client';

import { useLocale } from 'next-intl';
import { useTransition } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { setLocale } from '@/i18n/actions';
import { locales, localeNames, localeDisplayCodes, type Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const [isPending, startTransition] = useTransition();

  function handleSelect(newLocale: Locale) {
    startTransition(async () => {
      await setLocale(newLocale);
      // Full page reload to pick up the new cookie — router.refresh() uses
      // stale cached RSC payloads and renders one selection behind.
      window.location.reload();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'gap-1 px-2 text-xs font-medium touch-manipulation',
            isPending && 'opacity-50'
          )}
          disabled={isPending}
        >
          <Globe className="h-4 w-4" />
          <span>{localeDisplayCodes[locale]}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => handleSelect(l)}
            className="flex items-center justify-between gap-2"
          >
            <span>{localeNames[l]}</span>
            {l === locale && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
