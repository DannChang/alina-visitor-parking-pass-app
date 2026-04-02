# Full i18n Coverage Design

**Date:** 2026-04-01
**Branch:** ui-updates
**Status:** Approved

## Problem

The app supports 8 locales in `routing.ts` (en, es, fr, zh-Hans, zh-Hant, fa, ko, vi) but:
1. Only 3 message files exist (en, es, fr) — vi/zh/fa/ko fall back to English
2. `en.json` only covers landing, registration, resident portal, patrol, and nav items
3. All dashboard pages and many shared components have 100% hardcoded English strings

## Approach

**Message-first, then wire components.**

1. Expand `en.json` with all missing keys across the full app
2. Update every page and component to call `t()` instead of hardcoded strings
3. Create locale files for all 8 locales (AI-translated from `en.json`)

No structural changes to the i18n system — same cookie-based locale, same `next-intl` setup, same `request.ts` fallback chain.

## Namespace Plan

| Namespace | Status | Notes |
|---|---|---|
| `landing` | Complete | No changes |
| `registration` | Complete | No changes |
| `resident` | Complete | No changes |
| `patrol` | Minor additions | Logbook, history dialog strings |
| `dashboard` | Major expansion | Sub-objects per page (see below) |
| `common` | Expand | Add shared display strings |
| `auth` | New | Login, forgot/reset password forms |

### `dashboard` sub-objects

- `dashboard.overview` — stat card titles/descriptions, recent passes/violations sections
- `dashboard.passes` — page title, table headers, status options, filter labels
- `dashboard.violations` — page title, table headers, severity/status labels
- `dashboard.units` — page title, table headers, dialog form labels, toast messages
- `dashboard.users` — page title, table headers, role labels, invite dialogs
- `dashboard.vehicles` — page title, table headers, blacklist labels
- `dashboard.analytics` — page title, section headers, metric labels, trend labels
- `dashboard.health` — page title, service status labels
- `dashboard.settings` — page title, section headers, form labels
- `dashboard.patrolLog` — page title, filter labels, entry type labels

### `common` additions

`yes`, `no`, `active`, `inactive`, `occupied`, `vacant`, `blacklisted`, `resolved`, `unresolved`, `floor`, `unit`, `building`, `vehicle`, `visitor`, `status`, `duration`, `expires`, `actions`, `noContact`, `passes` (count), `addUnit`, `editUnit`, `deleteUnit`, `newPass`, `allStatuses`, `notProvided`

### `auth` (new namespace)

`staffLogin`, `emailAddress`, `password`, `signingIn`, `signIn`, `forgotPassword`, `sendResetLink`, `sending`, `resetPassword`, `newPassword`, `confirmPassword`, `resetPasswordSubmit`

## Files to Update (~25 total)

### Pages
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/dashboard/units/page.tsx`
- `src/app/(dashboard)/dashboard/passes/page.tsx`
- `src/app/(dashboard)/dashboard/violations/page.tsx`
- `src/app/(dashboard)/dashboard/analytics/page.tsx`
- `src/app/(dashboard)/dashboard/health/page.tsx`
- `src/app/(dashboard)/dashboard/settings/page.tsx`
- `src/app/(dashboard)/dashboard/users/page.tsx`
- `src/app/(dashboard)/dashboard/vehicles/page.tsx`
- `src/app/(dashboard)/dashboard/patrol-log/page.tsx`
- `src/app/(dashboard)/dashboard/registration-passes/page.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/forgot-password/page.tsx`
- `src/app/(public)/reset-password/[token]/page.tsx`

### Components
- `src/components/dashboard/violations-client-page.tsx`
- `src/components/dashboard/pass-details-sheet.tsx`
- `src/components/dashboard/violation-details-sheet.tsx`
- `src/components/dashboard/create-pass-dialog.tsx`
- `src/components/dashboard/vehicles-client-page.tsx`
- `src/components/patrol/patrol-dashboard.tsx`
- `src/components/patrol/patrol-logbook.tsx`
- `src/components/patrol/log-entry-form.tsx`
- `src/components/patrol/log-entry-list.tsx`
- `src/components/patrol/vehicle-history-dialog.tsx`
- `src/components/resident/resident-nav.tsx`
- `src/components/mobile-nav.tsx`
- `src/components/auth/forgot-password-form.tsx`
- `src/components/auth/reset-password-form.tsx`

## Locale File Strategy

| File | Action |
|---|---|
| `en.json` | Expand with all new keys |
| `es.json` | Add new keys only (existing keys already correct) |
| `fr.json` | Add new keys only |
| `vi.json` | Create full file (AI-translated) |
| `zh-Hans.json` | Create full file (AI-translated) |
| `zh-Hant.json` | Create full file (AI-translated) |
| `fa.json` | Create full file (AI-translated, RTL) |
| `ko.json` | Create full file (AI-translated) |

Update `src/i18n/request.ts` to import all 5 new locale files and remove the `en` fallback assignments.

## Out of Scope

- `date-fns` locale-aware relative times (separate concern, requires locale-aware `formatDistanceToNow`)
- Toast error messages from API responses (dynamic server strings)
- Database enum values displayed raw (ACTIVE, EXPIRED) — covered as display strings in `common`
