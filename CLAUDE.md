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

- `src/app/(public)/` - Public visitor routes (QR code registration at `/register/[slug]`)
- `src/app/(auth)/` - Authentication pages (login)
- `src/app/(dashboard)/` - Protected manager dashboard with role-based navigation

### Key Services

- **Validation Service** (`src/services/validation-service.ts`) - Core business logic for pass validation. Enforces blacklist checks, max vehicles per unit, consecutive hours limits, cooldown periods, and operating hours.
- **Notification Service** (`src/services/notification-service.ts`) - Email notifications via Resend
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
- `Vehicle` → `ParkingPass` (parking tracking with soft deletes)
- `ParkingRule` (per-building configurable validation rules)
- `Violation`, `AuditLog` (enforcement and compliance)

### Path Alias

Use `@/` for imports from `src/` directory (configured in tsconfig.json).

## Validation Rules

Business rules are enforced per-building via `ParkingRule` model:
- `maxVehiclesPerUnit` - Max active passes per unit (default: 2)
- `maxConsecutiveHours` - Max hours a vehicle can park consecutively (default: 24)
- `cooldownHours` - Required wait time between passes for same vehicle (default: 2)
- `allowedDurations` - Available pass durations in hours (default: [2, 4, 8, 12, 24])
- Emergency override bypasses most restrictions when enabled

## Patrol Mode (License Plate OCR)

Mobile-first enforcement tool for security personnel to scan and verify vehicles.

### Components

- **Patrol Dashboard** (`src/components/patrol/patrol-dashboard.tsx`) - Main scanner UI at `/` for authenticated users
- **Camera Capture** (`src/components/patrol/camera-capture.tsx`) - Web camera integration with plate guides
- **Scan Result Card** (`src/components/patrol/scan-result-card.tsx`) - Color-coded status display (green=valid, red=violation, yellow=expiring)
- **Quick Violation Dialog** (`src/components/patrol/quick-violation-dialog.tsx`) - One-tap violation logging with photo evidence
- **Patrol FAB** (`src/components/patrol/patrol-fab.tsx`) - Floating action button for quick access

### Hooks

- **useCamera** (`src/hooks/use-camera.ts`) - Camera stream management, capture, permissions
- **usePatrolScanner** (`src/hooks/use-patrol-scanner.ts`) - Full scan workflow (OCR → lookup → display)

### API Endpoints

- `POST /api/ocr/recognize` - Server-side OCR processing using Tesseract.js
- `POST /api/patrol/lookup` - Full vehicle lookup (passes, blacklist, violations, history)

### OCR Features

- **Hybrid processing**: Server-side primary, client-side fallback (Tesseract.js both)
- **Offline support**: IndexedDB caching for lookups when network unavailable
- **License plate patterns**: Supports common US formats (ABC123, 123ABC, etc.)
- **Confidence scoring**: Reports OCR confidence percentage

### Access Control

Patrol mode available to: `SUPER_ADMIN`, `MANAGER`, `SECURITY` roles (requires `passes:view_all` permission)

## Testing

- **Unit tests**: Vitest with `src/test/setup.ts` for mocking Prisma
- **E2E tests**: Playwright in `e2e/` directory, runs with single worker for database consistency
- Coverage thresholds: 80% statements/functions/lines, 75% branches
