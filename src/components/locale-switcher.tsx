'use client';

import { useLocale } from 'next-intl';
import { useState } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { persistLocaleAndReload } from '@/i18n/client';
import { locales, localeNames, localeDisplayCodes, type Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const [isPending, setIsPending] = useState(false);

  async function handleSelect(newLocale: Locale) {
    if (newLocale === locale || isPending) {
      return;
    }

    try {
      setIsPending(true);
      persistLocaleAndReload(newLocale);
    } finally {
      setIsPending(false);
    }
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
            onSelect={() => void handleSelect(l)}
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
