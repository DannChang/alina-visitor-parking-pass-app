# Multi-Language Globe Switcher Design

**Date:** 2026-03-20

## Goal

Add a globe button to the top-right of every layout that lets users switch between 8 languages. Industry-standard pattern: globe icon + locale code, dropdown with native language names.

## Supported Locales

| Code | Language | Native Name | Direction |
|------|----------|-------------|-----------|
| `en` | English | English | LTR |
| `es` | Spanish | Español | LTR |
| `fr` | French | Français | LTR |
| `zh-Hans` | Chinese (Simplified) | 简体中文 | LTR |
| `zh-Hant` | Chinese (Traditional) | 繁體中文 | LTR |
| `fa` | Farsi | فارسی | RTL |
| `ko` | Korean | 한국어 | LTR |
| `vi` | Vietnamese | Tiếng Việt | LTR |

## Locale Configuration

Update `src/i18n/routing.ts`:
- Expand `locales` array and `Locale` type to include all 8 codes
- Add `rtlLocales` set containing `'fa'`
- Add `localeNames` map for display names (native names)

Update `src/app/layout.tsx`:
- Set `dir="rtl"` on `<html>` when current locale is in `rtlLocales`

## LocaleSwitcher Component

**File:** `src/components/locale-switcher.tsx` (client component)

**Appearance:**
- Globe icon (lucide-react `Globe`) + current locale code uppercase (e.g. "EN") + chevron-down
- Uses existing shadcn `DropdownMenu` for the popover

**Dropdown:**
- Lists all 8 languages by native name
- Checkmark on active locale
- On select: calls `setLocale()` server action, then `router.refresh()`

**Sizing:** Compact for mobile — 16px icon + 2-letter code + chevron.

## Integration Points

1. **Landing page** (`src/app/page.tsx`) — top-right corner above main content
2. **Dashboard** (`src/components/mobile-nav.tsx` or dashboard header) — top nav bar, left of user menu
3. **Resident portal** (`src/components/resident/resident-nav.tsx`) — header area, top-right
4. **Patrol mode** (`src/components/patrol/patrol-dashboard.tsx`) — header bar, left of menu button

## Message Files

5 new files mirroring `en.json` structure (6 namespaces, ~40 keys each):
- `src/messages/zh-Hans.json`
- `src/messages/zh-Hant.json`
- `src/messages/fa.json`
- `src/messages/ko.json`
- `src/messages/vi.json`

Existing dynamic import in `request.ts` picks up new files automatically.

## RTL Support

Text-only RTL for Farsi: `dir="rtl"` on `<html>` element. No full layout mirroring — text flows correctly, layout structure unchanged. Can upgrade to full RTL later.

## Decisions

- **Globe + code** display (compact, industry standard)
- **Native language names** in dropdown (no flags — languages aren't countries)
- **Single shared component** placed in each layout's header (not floating overlay)
- **Farsi only** (not separate Arabic locale)
- **Text-only RTL** (not full layout mirroring)
