# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Alina Visitor Parking Pass is a Next.js 15 application for managing visitor parking at healthcare facilities. Visitors scan QR codes to register their vehicles, while building managers monitor passes and violations through a dashboard.

## Commands

```bash
# Development
pnpm dev                    # Start dev server (localhost:3000)
pnpm build                  # Build for production (runs prisma generate first)
pnpm lint                   # Run ESLint
pnpm type-check             # TypeScript check without emit

# Database (Prisma + PostgreSQL/Neon)
pnpm db:generate            # Generate Prisma client
pnpm db:migrate             # Run migrations (dev)
pnpm db:migrate:deploy      # Run migrations (production)
pnpm db:seed                # Seed initial data
pnpm db:studio              # Open Prisma Studio

# Testing
pnpm test                   # Run unit tests (Vitest)
pnpm test:watch             # Run tests in watch mode
pnpm test:coverage          # Run tests with coverage report
pnpm test:e2e               # Run E2E tests (Playwright)
pnpm test:e2e:ui            # Run E2E tests with UI

# Run a single test file
pnpm vitest run src/lib/utils/__tests__/license-plate.test.ts
```

## Architecture

### Route Groups (App Router)

- `src/app/(public)/` - Public visitor routes (QR code at `/register/[slug]`, guest wizard at `/register/guest`)
- `src/app/(auth)/` - Authentication pages (login)
- `src/app/(dashboard)/` - Protected manager dashboard with role-based navigation
- `src/app/(resident)/` - Resident portal (login, passes, guests, activity, settings)

### Key Services

- **Validation Service** (`src/services/validation-service.ts`) - Core business logic for pass validation. Enforces blacklist checks, max vehicles per unit, consecutive hours limits, cooldown periods, and operating hours.
- **Notification Service** (`src/services/notification-service.ts`) - Email notifications via Resend
- **SMS Notification Service** (`src/services/sms-notification-service.ts`) - SMS notifications with provider abstraction (`src/services/sms/`). Uses console provider in dev, Twilio stub for production.
- **Export Service** (`src/services/export-service.ts`) - CSV/PDF report generation
- **OCR Service** (`src/services/ocr-service.ts`) - License plate recognition with hybrid approach (server-side primary, client-side offline fallback)
- **Offline Cache Service** (`src/services/offline-cache-service.ts`) - IndexedDB-based caching for offline patrol mode

### Authorization System

The app uses a fine-grained permission system defined in `src/lib/authorization.ts`:

- **Roles**: SUPER_ADMIN, ADMIN, MANAGER, SECURITY, RESIDENT
- **Permission checks**: `hasPermission(role, permission)`, `hasAnyPermission(role, permissions[])`
- **Route protection**: `canAccessRoute(role, pathname)` for middleware

### Database Schema

Prisma schema at `prisma/schema.prisma`. Key models:
- `Building` → `Unit` → `Resident` (property hierarchy)
- `Vehicle` → `ParkingPass` (parking tracking with soft deletes, in-out privileges)
- `ParkingRule` (per-building configurable validation rules incl. consecutive day limits, auto-extension, in-out)
- `Violation`, `AuditLog` (enforcement with escalation workflow)
- `AuthorizedGuest` (resident-managed guest list)
- `PatrolLogEntry` (electronic patrol logbook entries)

Key enums: `EscalationLevel` (NONE → WARNING → FORMAL_LETTER → TOW_NOTICE), `PatrolEntryType` (ENTRY, EXIT, SPOT_CHECK, NOTE)

### Path Alias

Use `@/` for imports from `src/` directory (configured in tsconfig.json).

## Validation Rules

Business rules are enforced per-building via `ParkingRule` model:
- `maxVehiclesPerUnit` - Max active passes per unit (default: 2)
- `maxConsecutiveHours` - Max hours a vehicle can park consecutively (default: 24)
- `cooldownHours` - Required wait time between passes for same vehicle (default: 2)
- `maxConsecutiveDays` - Max consecutive calendar days (default: 3)
- `allowedDurations` - Available pass durations in hours (default: [2, 4, 8, 12, 24])
- `autoExtensionEnabled` - Whether passes can be auto-extended (default: true)
- `inOutPrivileges` - Whether in-out tracking is enabled (default: true)
- Emergency override bypasses most restrictions when enabled

### In-Out Privileges

API endpoints for tracking vehicle movement:
- `POST /api/passes/[id]/exit` - Record vehicle exit
- `POST /api/passes/[id]/entry` - Record vehicle re-entry
- `POST /api/passes/[id]/reactivate` - Reactivate unexpired pass
- `POST /api/passes/auto-extend` - Apply auto-extension

## Patrol Mode (License Plate OCR)

Mobile-first enforcement tool for security personnel to scan and verify vehicles.

### Components

- **Patrol Dashboard** (`src/components/patrol/patrol-dashboard.tsx`) - Main scanner UI at `/` for authenticated users
- **Camera Capture** (`src/components/patrol/camera-capture.tsx`) - Web camera integration with plate guides
- **Scan Result Card** (`src/components/patrol/scan-result-card.tsx`) - Color-coded status display (green=valid, red=violation, yellow=expiring)
- **Quick Violation Dialog** (`src/components/patrol/quick-violation-dialog.tsx`) - One-tap violation logging with photo evidence
- **Patrol FAB** (`src/components/patrol/patrol-fab.tsx`) - Floating action button for quick access
- **Patrol Logbook** (`src/components/patrol/patrol-logbook.tsx`) - Electronic logbook with filtering
- **Log Entry Form** (`src/components/patrol/log-entry-form.tsx`) - Add patrol log entries
- **Log Entry List** (`src/components/patrol/log-entry-list.tsx`) - Scrollable chronological entries
- **Vehicle History Dialog** (`src/components/patrol/vehicle-history-dialog.tsx`) - Full vehicle history with tabbed view (passes, violations, patrol logs)

### Violation Escalation (`src/components/violations/`)

- **Escalation Timeline** - Visual timeline of escalation stages (NONE → WARNING → FORMAL_LETTER → TOW_NOTICE)
- **Escalation Dialog** - Confirmation dialog for escalating violations

### Hooks

- **useCamera** (`src/hooks/use-camera.ts`) - Camera stream management, capture, permissions
- **usePatrolScanner** (`src/hooks/use-patrol-scanner.ts`) - Full scan workflow (OCR → lookup → display)

### API Endpoints

- `POST /api/ocr/recognize` - Server-side OCR processing using Tesseract.js
- `POST /api/patrol/lookup` - Full vehicle lookup (passes, blacklist, violations, history, grace period, resident detection)
- `GET/POST /api/patrol/log` - List/create patrol log entries
- `PATCH/DELETE /api/patrol/log/[id]` - Update/delete patrol log entries
- `POST /api/violations/[id]/escalate` - Escalate violation level
- `GET /api/vehicles/[id]/history` - Full vehicle history (passes, violations, patrol logs)

### OCR Features

- **Client-side by default**: Uses Tesseract.js in browser for reliability (no server dependency)
- **Server-side opt-in**: Set `preferServer: true` in options to use server processing with client fallback
- **Offline support**: IndexedDB caching for lookups when network unavailable
- **License plate patterns**: Supports common US formats (ABC123, 123ABC, etc.)
- **Confidence scoring**: Reports OCR confidence percentage

### CSP Configuration

Tesseract.js requires specific Content Security Policy settings in `next.config.js`:
- `script-src`: Must include `blob:` and `https://cdn.jsdelivr.net` for worker scripts
- `worker-src`: Must include `blob:` for web workers
- `connect-src`: Must include `blob:` and `https://cdn.jsdelivr.net` for WASM/data fetches

### Access Control

Patrol mode available to: `SUPER_ADMIN`, `MANAGER`, `SECURITY` roles (requires `passes:view_all` permission)

## Resident Portal

Mobile-first portal for residents to manage parking passes and guests.

### Authentication

Dual NextAuth credential providers in `src/lib/auth.ts`:
- `staff-credentials` — email + password for dashboard users
- `resident-credentials` — building slug + unit number + password for residents

JWT tokens include `loginType` ('staff' | 'resident'), `unitId`, and `residentId` for resident sessions.

### Resident Components (`src/components/resident/`)

- `resident-login-form.tsx` — building search + suite + password
- `resident-nav.tsx` — tab navigation (Passes | Guests | Activity | Settings)
- `create-pass-dialog.tsx` — create pass for a guest
- `guest-form.tsx` — add/edit guest dialog
- `resident-settings-form.tsx` — contact info, access code, password change

### Resident API Routes

- `GET/POST /api/resident/passes` — list/create passes for unit
- `DELETE /api/resident/passes/[id]` — cancel a pass
- `GET/POST /api/resident/guests` — list/add authorized guests
- `PATCH/DELETE /api/resident/guests/[id]` — update/remove guest
- `POST /api/resident/send-pass` — send SMS link to guest
- `GET/PATCH /api/resident/settings` — profile, access code, password
- `GET /api/resident/activity` — paginated unit activity history
- `GET/POST/DELETE /api/resident/vehicles` — resident vehicle management

### Resident Permissions

`resident:manage_guests`, `resident:manage_vehicles`, `resident:send_pass`, `resident:view_activity`

## Internationalization (i18n)

Uses `next-intl` for translations. Configured via `src/i18n/request.ts` with `next-intl/plugin` in `next.config.js`.

- **Locales**: en (default), es, fr — defined in `src/i18n/routing.ts`
- **Messages**: `src/messages/{locale}.json` — organized by namespace (landing, registration, resident, patrol, dashboard, common)
- **Server components**: Use `getTranslations('namespace')` from `next-intl/server`
- **Client components**: Use `useTranslations('namespace')` from `next-intl`
- **Root layout**: Wrapped with `NextIntlClientProvider` in `src/app/layout.tsx`

## PWA Support

- **Manifest**: `public/manifest.json` — name, icons, theme color, standalone display mode
- **Service worker**: `public/sw.js` — cache-first for static assets, network-first for API routes
- **Registration**: `src/components/pwa/sw-register.tsx` — auto-registers service worker on load
- **Icons**: `public/icons/` — SVG icons (192x192, 512x512) with "AP" branding
- **Meta tags**: Configured in root layout metadata (theme-color, apple-web-app-capable, manifest link)

## Testing

- **Unit tests**: Vitest with `src/test/setup.ts` for mocking Prisma
- **E2E tests**: Playwright in `e2e/` directory, runs with single worker for database consistency
- Coverage thresholds: 80% statements/functions/lines, 75% branches
