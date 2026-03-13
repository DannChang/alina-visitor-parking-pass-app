# Resident Invite Onboarding and Registration Passes

## Purpose

This document captures the resident onboarding system that was added to the app so future work has a single reference point for:

- how invite-only resident registration works
- which routes and files own the flow
- what auth and permission changes were made
- what operational constraints and assumptions exist

## Scope

This implementation adds invite-only onboarding for `RESIDENT` accounts.

It does **not** add invite-based onboarding for staff users.

The current resident auth model remains in place:

- one login-capable primary resident per unit
- resident login still uses `buildingSlug + unitNumber + password`
- staff login must not accept `RESIDENT` accounts

## High-level flow

1. A `SUPER_ADMIN` or `MANAGER` opens `/dashboard/registration-passes`.
2. They create a one-time resident registration pass for a building/unit/email.
3. The system stores only a hashed token and returns a one-time magic link.
4. The system attempts to email the link to the invited resident.
5. The invited resident opens `/register/resident/[token]`.
6. They set their password.
7. The app creates the linked `User` and `Resident` records in one transaction.
8. The invite is marked consumed and cannot be reused.
9. The resident is signed in and redirected to `/dashboard/passes`.

## Core constraints

- Invite TTL is 72 hours.
- Raw invite tokens are never stored in the database.
- Reissue invalidates the old live link and creates a new one.
- Revoked, expired, and consumed links cannot be redeemed.
- Managers can only manage invites for buildings assigned through `BuildingManager`.
- `ADMIN` is intentionally excluded from this feature.
- Generic staff user management no longer creates or edits `RESIDENT` users.

## Data model changes

### Prisma

Primary schema updates live in:

- `prisma/schema.prisma`
- `prisma/migrations/20260310113000_resident_invites/migration.sql`

### New model

`ResidentInvite` stores:

- issuer
- building
- unit
- recipient name/email/phone
- hashed token
- expiry
- sent timestamp
- consumed timestamp
- revoked timestamp and revoke reason
- consumed IP and user agent
- linked `User` and `Resident` after redemption

### Audit actions

New audit actions:

- `ISSUE_RESIDENT_INVITE`
- `REVOKE_RESIDENT_INVITE`
- `CONSUME_RESIDENT_INVITE`

### Integrity rule

A partial unique index was added so only one active primary resident can exist per unit:

- active
- primary
- not soft-deleted

## Auth and permission changes

### Permissions

New permission:

- `resident_invites:manage`

Granted to:

- `SUPER_ADMIN`
- `MANAGER`

Not granted to:

- `ADMIN`
- `SECURITY`
- `RESIDENT`

### Navigation and middleware

New dashboard route:

- `/dashboard/registration-passes`

Accessible only to:

- `SUPER_ADMIN`
- `MANAGER`

Relevant files:

- `src/lib/authorization.ts`
- `src/lib/navigation.ts`
- `src/middleware.ts`

### Auth hardening

Relevant file:

- `src/lib/auth.ts`

Changes:

- staff credential auth now rejects `RESIDENT` users
- resident sessions preserve `residentId`
- resident session `user.id` prefers the linked `User` id when present
- resident login still authenticates against `Resident.passwordHash`

## UI surfaces

### Dashboard management page

Route:

- `/dashboard/registration-passes`

File:

- `src/app/(dashboard)/dashboard/registration-passes/page.tsx`

Capabilities:

- list registration passes
- filter by building
- filter by status
- search by resident/email/unit/building
- create new registration pass
- revoke pending pass
- reissue non-consumed pass
- show the one-time registration URL immediately after create/reissue
- copy the link for manual sharing when needed

Dialog components:

- `src/components/dashboard/create-resident-invite-dialog.tsx`
- `src/components/dashboard/revoke-resident-invite-dialog.tsx`
- shared types in `src/components/dashboard/resident-invite-shared.ts`

### Public resident redemption page

Route:

- `/register/resident/[token]`

Files:

- `src/app/(public)/register/resident/[token]/page.tsx`
- `src/components/registration/resident-invite-registration-form.tsx`

Behavior:

- shows invite context when token is valid
- blocks invalid, revoked, expired, or consumed links
- accepts password setup
- calls the consume API
- signs the resident in

## API surfaces

### Protected APIs

- `GET /api/resident-invites`
  - lists invites plus accessible buildings and units
- `POST /api/resident-invites`
  - creates a new invite and returns the one-time registration URL
- `POST /api/resident-invites/[id]/revoke`
  - revokes a pending invite
- `POST /api/resident-invites/[id]/reissue`
  - invalidates the old pending invite and creates a fresh one

### Public API

- `POST /api/resident-invites/consume`
  - consumes the one-time token and creates the resident account

### Service owner

Business logic is centralized in:

- `src/services/resident-invite-service.ts`

This service owns:

- token generation
- token hashing
- manager building scope enforcement
- eligibility checks
- issuance
- revoke/reissue behavior
- redemption transaction

## Eligibility rules enforced on invite creation/reissue

The system blocks invite creation if:

- the building is inactive or deleted
- the unit is inactive or deleted
- the manager does not have access to the building
- the unit already has an active primary resident
- the email already belongs to an existing user/resident
- the unit already has a live pending invite
- the email already has a live pending invite

## Email delivery

Invite email delivery uses the existing notification system.

Relevant file:

- `src/services/notification-service.ts`

Behavior:

- creates notification queue records through the existing email path
- sends a resident-specific onboarding email
- does not invalidate the invite if email delivery fails
- still returns the one-time URL so staff can share it manually

## User management changes

Relevant files:

- `src/app/api/users/route.ts`
- `src/app/(dashboard)/dashboard/users/page.tsx`

Changes:

- generic staff user management now excludes `RESIDENT`
- resident accounts cannot be created, edited, or deleted from the staff user screen
- resident onboarding is now expected to happen only through registration passes

## Seed data changes

Relevant file:

- `prisma/seed.ts`

Important correction:

- seeded resident password is now stored on `Resident.passwordHash`
- seeded `User.passwordHash` for the resident is set to `null`

This aligns the seed with the actual resident login flow.

## Verification completed

The implementation was verified with:

- `pnpm prisma generate`
- `pnpm type-check`
- `pnpm lint`
- `pnpm test`

Additional API coverage added:

- `src/app/api/resident-invites/__tests__/route.test.ts`
- `src/app/api/users/__tests__/route.test.ts`

At the time of implementation:

- `pnpm test` passed with 321 tests
- `pnpm lint` still had pre-existing warnings in patrol image components and the console SMS provider

## Operational notes

- The migration files were added to the repo but still need to be applied in the target database environment.
- The one-time registration URL is only shown at create/reissue time in the dashboard UI.
- If a manager needs a fresh URL later, they should reissue the registration pass.
- The implementation assumes managers are scoped dynamically from `BuildingManager`, not from JWT-stored building IDs.

## Primary file map

- `prisma/schema.prisma`
- `prisma/migrations/20260310113000_resident_invites/migration.sql`
- `src/lib/auth.ts`
- `src/lib/authorization.ts`
- `src/lib/navigation.ts`
- `src/middleware.ts`
- `src/services/resident-invite-service.ts`
- `src/services/notification-service.ts`
- `src/app/api/resident-invites/route.ts`
- `src/app/api/resident-invites/[id]/revoke/route.ts`
- `src/app/api/resident-invites/[id]/reissue/route.ts`
- `src/app/api/resident-invites/consume/route.ts`
- `src/app/(dashboard)/dashboard/registration-passes/page.tsx`
- `src/app/(public)/register/resident/[token]/page.tsx`
- `src/app/api/users/route.ts`
- `src/app/(dashboard)/dashboard/users/page.tsx`
- `prisma/seed.ts`
