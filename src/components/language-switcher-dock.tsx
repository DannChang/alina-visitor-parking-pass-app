import { LocaleSwitcher } from '@/components/locale-switcher';
import type { Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';

type LanguageSwitcherDockProps = {
  excludedLocales?: readonly Locale[];
  className?: string;
};

export function LanguageSwitcherDock({ excludedLocales, className }: LanguageSwitcherDockProps) {
  const switcherProps = excludedLocales ? { excludedLocales } : {};

  return (
    <div className={cn('fixed right-4 top-4 z-50', className)}>
      <LocaleSwitcher {...switcherProps} />
    </div>
  );
}
