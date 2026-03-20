# Multi-Language Globe Switcher Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a globe button language switcher to all layouts supporting 8 locales (en, es, fr, zh-Hans, zh-Hant, fa, ko, vi) with RTL text support for Farsi.

**Architecture:** Expand the existing next-intl i18n config with 5 new locales, create a reusable `LocaleSwitcher` client component using shadcn DropdownMenu + lucide Globe icon, integrate it into 4 layout surfaces (landing, dashboard, resident, patrol), and add translated message files.

**Tech Stack:** next-intl, shadcn/ui DropdownMenu, lucide-react Globe/ChevronDown/Check icons, Next.js App Router

---

### Task 1: Expand Locale Configuration

**Files:**
- Modify: `src/i18n/routing.ts`
- Test: `src/i18n/__tests__/routing.test.ts`

**Step 1: Write tests for new locale config**

Create `src/i18n/__tests__/routing.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { locales, defaultLocale, rtlLocales, localeNames, localeDisplayCodes, type Locale } from '../routing';

describe('i18n routing', () => {
  it('should have 8 supported locales', () => {
    expect(locales).toHaveLength(8);
    expect(locales).toContain('en');
    expect(locales).toContain('es');
    expect(locales).toContain('fr');
    expect(locales).toContain('zh-Hans');
    expect(locales).toContain('zh-Hant');
    expect(locales).toContain('fa');
    expect(locales).toContain('ko');
    expect(locales).toContain('vi');
  });

  it('should default to English', () => {
    expect(defaultLocale).toBe('en');
  });

  it('should mark Farsi as RTL', () => {
    expect(rtlLocales.has('fa')).toBe(true);
    expect(rtlLocales.has('en')).toBe(false);
  });

  it('should have native names for all locales', () => {
    for (const locale of locales) {
      expect(localeNames[locale]).toBeDefined();
      expect(localeNames[locale].length).toBeGreaterThan(0);
    }
  });

  it('should have display codes for all locales', () => {
    for (const locale of locales) {
      expect(localeDisplayCodes[locale]).toBeDefined();
    }
    expect(localeDisplayCodes['en']).toBe('EN');
    expect(localeDisplayCodes['zh-Hans']).toBe('ZH');
    expect(localeDisplayCodes['zh-Hant']).toBe('ZH');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/i18n/__tests__/routing.test.ts`
Expected: FAIL — `rtlLocales`, `localeNames`, `localeDisplayCodes` not exported

**Step 3: Update routing.ts with new locales and exports**

Replace full contents of `src/i18n/routing.ts`:

```typescript
export const locales = ['en', 'es', 'fr', 'zh-Hans', 'zh-Hant', 'fa', 'ko', 'vi'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const rtlLocales = new Set<Locale>(['fa']);

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  'zh-Hans': '简体中文',
  'zh-Hant': '繁體中文',
  fa: 'فارسی',
  ko: '한국어',
  vi: 'Tiếng Việt',
};

export const localeDisplayCodes: Record<Locale, string> = {
  en: 'EN',
  es: 'ES',
  fr: 'FR',
  'zh-Hans': 'ZH',
  'zh-Hant': 'ZH',
  fa: 'FA',
  ko: 'KO',
  vi: 'VI',
};
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/i18n/__tests__/routing.test.ts`
Expected: PASS

**Step 5: Update existing actions test for new locales**

The test at `src/i18n/__tests__/actions.test.ts` line 37-43 tests "all supported locales" but only calls `setLocale` for en/es/fr. Update to test all 8:

```typescript
it('should accept all supported locales', async () => {
  await setLocale('en');
  await setLocale('es');
  await setLocale('fr');
  await setLocale('zh-Hans');
  await setLocale('zh-Hant');
  await setLocale('fa');
  await setLocale('ko');
  await setLocale('vi');

  expect(mockCookieStore.set).toHaveBeenCalledTimes(8);
});
```

**Step 6: Run all i18n tests**

Run: `pnpm vitest run src/i18n/`
Expected: ALL PASS

**Step 7: Commit**

```bash
git add src/i18n/routing.ts src/i18n/__tests__/routing.test.ts src/i18n/__tests__/actions.test.ts
git commit -m "feat: expand locale config to 8 languages with RTL and display metadata"
```

---

### Task 2: Update Accept-Language Negotiation for Compound Codes

**Files:**
- Modify: `src/i18n/request.ts`
- Test: `src/i18n/__tests__/request.test.ts`

**Context:** The current `negotiateLocale` function splits on `-` and takes the first part (e.g. `"zh-Hans"` → `"zh"`), which won't match `"zh-Hans"` or `"zh-Hant"` in the locales array. We need smarter matching: try the full locale first, then fall back to base.

**Step 1: Write tests for negotiate function**

Create `src/i18n/__tests__/request.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to test negotiateLocale which isn't exported, so we test via the config
// Instead, let's extract and test the logic. For now, test the behavior indirectly.
// Actually, let's just test the exported helper we'll create.

import { negotiateLocale } from '../request';

describe('negotiateLocale', () => {
  it('should return default for null header', () => {
    expect(negotiateLocale(null)).toBe('en');
  });

  it('should match simple locale codes', () => {
    expect(negotiateLocale('es')).toBe('es');
    expect(negotiateLocale('fr,en;q=0.9')).toBe('fr');
    expect(negotiateLocale('ko-KR,ko;q=0.9,en;q=0.8')).toBe('ko');
  });

  it('should match zh-Hans and zh-Hant from Accept-Language', () => {
    // Browser sends "zh-CN" → should match zh-Hans
    expect(negotiateLocale('zh-CN,zh;q=0.9,en;q=0.8')).toBe('zh-Hans');
    // Browser sends "zh-TW" → should match zh-Hant
    expect(negotiateLocale('zh-TW,zh;q=0.9,en;q=0.8')).toBe('zh-Hant');
    // Browser sends just "zh" → should match zh-Hans (simplified as default)
    expect(negotiateLocale('zh,en;q=0.9')).toBe('zh-Hans');
  });

  it('should match Farsi', () => {
    expect(negotiateLocale('fa-IR,fa;q=0.9,en;q=0.8')).toBe('fa');
  });

  it('should match Vietnamese', () => {
    expect(negotiateLocale('vi-VN,vi;q=0.9')).toBe('vi');
  });

  it('should return default for unsupported locale', () => {
    expect(negotiateLocale('de-DE,de;q=0.9')).toBe('en');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/i18n/__tests__/request.test.ts`
Expected: FAIL — `negotiateLocale` is not exported, and zh-CN matching doesn't work

**Step 3: Update request.ts**

Export `negotiateLocale` and update the matching logic to handle compound locale codes (zh-Hans, zh-Hant) by mapping browser locale variants:

```typescript
import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { locales, defaultLocale, type Locale } from './routing';

// Map browser locale variants to our supported locales
const localeMapping: Record<string, Locale> = {
  'zh-cn': 'zh-Hans',
  'zh-sg': 'zh-Hans',
  'zh-hans': 'zh-Hans',
  zh: 'zh-Hans',
  'zh-tw': 'zh-Hant',
  'zh-hk': 'zh-Hant',
  'zh-mo': 'zh-Hant',
  'zh-hant': 'zh-Hant',
};

export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;

  // Parse Accept-Language header (e.g., "en-US,en;q=0.9,es;q=0.8")
  const preferredLocales = acceptLanguage
    .split(',')
    .map((lang) => {
      const [locale, qStr] = lang.trim().split(';');
      const q = qStr ? parseFloat(qStr.split('=')[1] || '1') : 1;
      return { locale: locale?.trim().toLowerCase() || '', q };
    })
    .sort((a, b) => b.q - a.q);

  for (const { locale } of preferredLocales) {
    // 1. Check explicit mapping (e.g., zh-CN → zh-Hans)
    const mapped = localeMapping[locale];
    if (mapped) return mapped;

    // 2. Check direct match (e.g., "fr" matches "fr", "ko" matches "ko")
    if (locales.includes(locale as Locale)) {
      return locale as Locale;
    }

    // 3. Check base language match (e.g., "fr-CA" → "fr", "ko-KR" → "ko")
    const base = locale.split('-')[0] || '';
    const baseMapping = localeMapping[base];
    if (baseMapping) return baseMapping;

    if (locales.includes(base as Locale)) {
      return base as Locale;
    }
  }

  return defaultLocale;
}

export default getRequestConfig(async () => {
  // 1. Check cookie (user preference)
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;

  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    return {
      locale: cookieLocale as Locale,
      messages: (await import(`../messages/${cookieLocale}.json`)).default,
    };
  }

  // 2. Negotiate from Accept-Language header
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language');
  const locale = negotiateLocale(acceptLanguage);

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/i18n/__tests__/request.test.ts`
Expected: PASS

**Step 5: Run all i18n tests**

Run: `pnpm vitest run src/i18n/`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/i18n/request.ts src/i18n/__tests__/request.test.ts
git commit -m "feat: improve Accept-Language negotiation for Chinese and compound locales"
```

---

### Task 3: Add RTL Support in Root Layout

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Update layout to set dir attribute**

In `src/app/layout.tsx`, import `rtlLocales` and set `dir` on `<html>`:

Change the imports to add:
```typescript
import { rtlLocales } from '@/i18n/routing';
import type { Locale } from '@/i18n/routing';
```

Change the `<html>` tag from:
```tsx
<html lang={locale} suppressHydrationWarning>
```
to:
```tsx
<html lang={locale} dir={rtlLocales.has(locale as Locale) ? 'rtl' : 'ltr'} suppressHydrationWarning>
```

**Step 2: Run type-check**

Run: `pnpm type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: add RTL dir attribute for Farsi locale"
```

---

### Task 4: Create LocaleSwitcher Component

**Files:**
- Create: `src/components/locale-switcher.tsx`
- Test: `src/components/__tests__/locale-switcher.test.tsx`

**Step 1: Write tests for LocaleSwitcher**

Create `src/components/__tests__/locale-switcher.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleSwitcher } from '../locale-switcher';

// Mock next-intl
vi.mock('next-intl', () => ({
  useLocale: vi.fn(() => 'en'),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    refresh: vi.fn(),
  })),
}));

// Mock the server action
vi.mock('@/i18n/actions', () => ({
  setLocale: vi.fn(() => Promise.resolve()),
}));

describe('LocaleSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render globe icon and current locale code', () => {
    render(<LocaleSwitcher />);
    expect(screen.getByText('EN')).toBeInTheDocument();
  });

  it('should open dropdown with all language options on click', async () => {
    const user = userEvent.setup();
    render(<LocaleSwitcher />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Español')).toBeInTheDocument();
    expect(screen.getByText('Français')).toBeInTheDocument();
    expect(screen.getByText('简体中文')).toBeInTheDocument();
    expect(screen.getByText('繁體中文')).toBeInTheDocument();
    expect(screen.getByText('فارسی')).toBeInTheDocument();
    expect(screen.getByText('한국어')).toBeInTheDocument();
    expect(screen.getByText('Tiếng Việt')).toBeInTheDocument();
  });

  it('should call setLocale and refresh when selecting a language', async () => {
    const { setLocale } = await import('@/i18n/actions');
    const { useRouter } = await import('next/navigation');
    const mockRefresh = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ refresh: mockRefresh } as never);

    const user = userEvent.setup();
    render(<LocaleSwitcher />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('Español'));

    expect(setLocale).toHaveBeenCalledWith('es');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/__tests__/locale-switcher.test.tsx`
Expected: FAIL — component doesn't exist

**Step 3: Create the LocaleSwitcher component**

Create `src/components/locale-switcher.tsx`:

```tsx
'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSelect(newLocale: Locale) {
    startTransition(async () => {
      await setLocale(newLocale);
      router.refresh();
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
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/__tests__/locale-switcher.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/locale-switcher.tsx src/components/__tests__/locale-switcher.test.tsx
git commit -m "feat: create LocaleSwitcher component with globe icon dropdown"
```

---

### Task 5: Integrate LocaleSwitcher into Landing Page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Add LocaleSwitcher to landing page**

The landing page (`src/app/page.tsx`) has two branches: authenticated (patrol dashboard) and unauthenticated (visitor landing). Add the switcher to the unauthenticated landing section.

In the visitor landing `<main>` block (line 55-89), add a positioned switcher at top-right. Change the opening of the return block from:

```tsx
return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-sm space-y-6">
```

to:

```tsx
return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="absolute top-4 right-4">
        <LocaleSwitcher />
      </div>
      <div className="w-full max-w-sm space-y-6">
```

Add the import at top of file:
```typescript
import { LocaleSwitcher } from '@/components/locale-switcher';
```

**Step 2: Run type-check and lint**

Run: `pnpm type-check && pnpm lint`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add locale switcher to landing page"
```

---

### Task 6: Integrate LocaleSwitcher into Dashboard Layout

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`

**Step 1: Add LocaleSwitcher to dashboard header (mobile and desktop)**

In `src/app/(dashboard)/layout.tsx`:

**Mobile header** (line 49-66): Replace the spacer div with the locale switcher. Change:
```tsx
        {/* Spacer for centering */}
        <div className="w-11" />
```
to:
```tsx
        <LocaleSwitcher />
```

**Desktop sidebar** (line 69-132): Add the locale switcher in the sidebar footer, above the user menu. Change the user menu section from:
```tsx
          {/* User menu */}
          <div className="border-t p-4">
```
to:
```tsx
          {/* Language & User menu */}
          <div className="border-t p-4 space-y-2">
            <div className="flex justify-end">
              <LocaleSwitcher />
            </div>
```

Add the import:
```typescript
import { LocaleSwitcher } from '@/components/locale-switcher';
```

**Step 2: Run type-check**

Run: `pnpm type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/(dashboard)/layout.tsx
git commit -m "feat: add locale switcher to dashboard layout"
```

---

### Task 7: Integrate LocaleSwitcher into Resident Nav

**Files:**
- Modify: `src/components/resident/resident-nav.tsx`

**Step 1: Add LocaleSwitcher to resident navigation**

In `src/components/resident/resident-nav.tsx`, add the globe button to the right side of the nav bar. Change the nav structure to include the switcher after the tab links.

Change from:
```tsx
  return (
    <nav className="sticky top-0 z-40 bg-white border-b shadow-sm">
      <div className="container mx-auto max-w-lg px-4">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
```

to:
```tsx
  return (
    <nav className="sticky top-0 z-40 bg-white border-b shadow-sm">
      <div className="container mx-auto max-w-lg px-4">
        <div className="flex items-center">
          <div className="flex flex-1 items-center justify-around">
            {navItems.map((item) => {
```

Close the inner div after the map, and add the switcher before the outer div close. After the closing of the map's `)}`:

```tsx
          </div>
          <LocaleSwitcher />
```

Add the import:
```typescript
import { LocaleSwitcher } from '@/components/locale-switcher';
```

**Step 2: Run type-check**

Run: `pnpm type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/resident/resident-nav.tsx
git commit -m "feat: add locale switcher to resident navigation"
```

---

### Task 8: Integrate LocaleSwitcher into Patrol Dashboard

**Files:**
- Modify: `src/components/patrol/patrol-dashboard.tsx`

**Step 1: Add LocaleSwitcher to patrol header**

In `src/components/patrol/patrol-dashboard.tsx`, the header (line 102-104) has a flex row with the hamburger menu on the left. Add the locale switcher on the right side of the header, before the closing `</div>` of the flex row.

Find the header's flex container (line 104):
```tsx
          <div className="flex items-center justify-between">
```

This div contains the Sheet (hamburger menu) on the left. After the Sheet's closing `</Sheet>` tag (around where the header's flex row ends), add:

```tsx
            <LocaleSwitcher />
```

Add the import at top with other lucide imports:
```typescript
import { LocaleSwitcher } from '@/components/locale-switcher';
```

Note: The patrol header already has `justify-between` on the flex container, so the switcher will naturally go to the right.

**Step 2: Run type-check**

Run: `pnpm type-check`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/patrol/patrol-dashboard.tsx
git commit -m "feat: add locale switcher to patrol dashboard"
```

---

### Task 9: Add Translation Message Files

**Files:**
- Create: `src/messages/zh-Hans.json`
- Create: `src/messages/zh-Hant.json`
- Create: `src/messages/fa.json`
- Create: `src/messages/ko.json`
- Create: `src/messages/vi.json`

**Step 1: Create Chinese Simplified translations**

Create `src/messages/zh-Hans.json` with all 6 namespaces, mirroring `en.json` structure. Use accurate Simplified Chinese translations for parking/visitor management context.

**Step 2: Create Chinese Traditional translations**

Create `src/messages/zh-Hant.json` with Traditional Chinese translations.

**Step 3: Create Farsi translations**

Create `src/messages/fa.json` with Farsi translations. Note: Farsi text is RTL — JSON keys remain LTR, only values are in Farsi.

**Step 4: Create Korean translations**

Create `src/messages/ko.json` with Korean translations.

**Step 5: Create Vietnamese translations**

Create `src/messages/vi.json` with Vietnamese translations.

**Step 6: Verify message structure matches en.json**

Run a quick validation that all files have the same keys:

```bash
# Compare key structure of each new file against en.json
node -e "
const en = require('./src/messages/en.json');
const files = ['zh-Hans','zh-Hant','fa','ko','vi'];
for (const f of files) {
  const msgs = require('./src/messages/' + f + '.json');
  const enKeys = JSON.stringify(Object.keys(en).sort());
  const fKeys = JSON.stringify(Object.keys(msgs).sort());
  if (enKeys !== fKeys) console.log(f + ': namespace mismatch');
  else {
    for (const ns of Object.keys(en)) {
      const ek = JSON.stringify(Object.keys(en[ns]).sort());
      const fk = JSON.stringify(Object.keys(msgs[ns]).sort());
      if (ek !== fk) console.log(f + '.' + ns + ': key mismatch');
    }
  }
}
console.log('done');
"
```

Expected: Only "done" output, no mismatches.

**Step 7: Commit**

```bash
git add src/messages/zh-Hans.json src/messages/zh-Hant.json src/messages/fa.json src/messages/ko.json src/messages/vi.json
git commit -m "feat: add translations for Chinese, Farsi, Korean, and Vietnamese"
```

---

### Task 10: Full Build and Test Verification

**Files:** None (verification only)

**Step 1: Run all unit tests**

Run: `pnpm test`
Expected: ALL PASS (previous 326 + new tests)

**Step 2: Run type-check**

Run: `pnpm type-check`
Expected: PASS

**Step 3: Run lint**

Run: `pnpm lint`
Expected: PASS (warnings only, same as before)

**Step 4: Run production build**

Run: `pnpm build`
Expected: BUILD SUCCESS

**Step 5: Final commit if any fixes were needed**

If any fixes were required, commit them:
```bash
git add -A
git commit -m "fix: resolve build/test issues from locale expansion"
```
