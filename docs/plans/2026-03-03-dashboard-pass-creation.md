# Dashboard Pass Creation for Residents & Staff

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add visitor pass creation to the `/dashboard/passes` page so both residents and staff can create passes from the same dashboard, with residents scoped to their unit and staff able to select any unit.

**Architecture:** Convert the dashboard passes page from a server component with direct Prisma queries to a client component that fetches via the existing `/api/passes` API. Add a unified `CreatePassDialog` that detects the user's role from session — residents see a simple form (unit auto-selected), staff see the same form plus a unit selector. Update the `/api/passes` GET endpoint to scope results by `unitId` for residents. Redirect resident login to `/dashboard/passes` instead of `/resident/passes`.

**Tech Stack:** Next.js 15 App Router, NextAuth session, shadcn/ui Dialog, Zod validation, Prisma

---

## Task 1: Update `/api/passes` GET to scope results for residents

The existing GET endpoint returns all passes regardless of role. We need it to filter by `unitId` when the caller is a resident.

**Files:**
- Modify: `src/app/api/passes/route.ts` (GET handler, lines 28-120)
- Test: `src/app/api/passes/__tests__/route.test.ts`

**Step 1: Update the GET handler to read session and scope by unitId for residents**

In `src/app/api/passes/route.ts`, add unitId scoping to the `where` clause:

```typescript
// After line 43 (where: Record), add:
// Scope to resident's unit if they don't have view_all permission
const unitId = (session as unknown as Record<string, string>).unitId;
if (session.user.role === 'RESIDENT' && unitId) {
  where.unitId = unitId;
}
```

**Step 2: Run existing tests to verify nothing is broken**

Run: `pnpm vitest run src/app/api/passes/__tests__/route.test.ts`
Expected: All existing tests pass

**Step 3: Commit**

```
feat: scope dashboard passes API to resident's unit
```

---

## Task 2: Convert dashboard passes page to client component with API fetching

The current page uses direct Prisma queries (server component). We need it to be a client component so it can show the create dialog and handle real-time updates.

**Files:**
- Modify: `src/app/(dashboard)/dashboard/passes/page.tsx`

**Step 1: Rewrite the page as a client component**

Replace the entire file with a client component that:
- Fetches passes from `GET /api/passes`
- Renders the same table layout (Vehicle, Unit, Visitor, Duration, Status, Expires)
- Adds a "New Pass" button in the header
- Includes search functionality (uses the existing `search` query param on the API)
- Shows loading skeleton while fetching

Key implementation details:
- Use `useSession()` from `next-auth/react` to get the current user's role
- Show "New Pass" button for users with `passes:create` permission (RESIDENT, MANAGER, ADMIN, SUPER_ADMIN)
- Keep the same visual styling (Card, Table, Badge, status variants)
- Use `useCallback` + `useEffect` for data fetching
- Add `showCreateDialog` state for the dialog

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { Car, Clock, Search, Plus, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { CreatePassDialog } from '@/components/dashboard/create-pass-dialog';
```

**Step 2: Verify the page renders correctly**

Run: `pnpm type-check`
Expected: No type errors

**Step 3: Commit**

```
refactor: convert dashboard passes page to client component with API fetching
```

---

## Task 3: Create the unified CreatePassDialog component

A new dialog component that works for both residents (auto-scoped to their unit) and staff (with unit selector).

**Files:**
- Create: `src/components/dashboard/create-pass-dialog.tsx`

**Step 1: Create the component**

The dialog needs:
- Props: `open`, `onOpenChange`, `onSuccess`, `userRole` (from session)
- For residents: auto-detect `unitId` from session, hide unit selector
- For staff: show building search (autocomplete) + unit number input
- Shared fields: Visitor Name (required), License Plate (required), Phone (optional), Duration (2/4/8/12/24h selector)
- Submit to `POST /api/passes` for staff (uses buildingSlug + unitNumber)
- Submit to `POST /api/resident/passes` for residents (uses session unitId)
- Error display, loading state, form reset on success

```typescript
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

const DURATION_OPTIONS = [2, 4, 8, 12, 24];

interface CreatePassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}
```

Key behavior:
- `useSession()` to determine role
- If `session.user.role === 'RESIDENT'` → POST to `/api/resident/passes` with just plate/name/phone/duration
- If staff → show building search dropdown (fetches from `/api/buildings/search?q=...`) and unit number input, POST to `/api/passes` with buildingSlug/unitNumber/plate/name/phone/duration
- Building search: debounced autocomplete, same pattern as `resident-login-form.tsx`
- On success: clear form, close dialog, call `onSuccess()`

**Step 2: Run type check**

Run: `pnpm type-check`
Expected: No errors

**Step 3: Commit**

```
feat: add unified CreatePassDialog for dashboard
```

---

## Task 4: Update resident login redirect to dashboard

When a resident logs in via `/resident/login`, redirect to `/dashboard/passes` instead of `/resident/passes`.

**Files:**
- Modify: `src/components/resident/resident-login-form.tsx` (line 69)

**Step 1: Change the redirect target**

Change line 69 from:
```typescript
router.push('/resident/passes');
```
to:
```typescript
router.push('/dashboard/passes');
```

**Step 2: Run type check**

Run: `pnpm type-check`
Expected: No errors

**Step 3: Commit**

```
feat: redirect resident login to dashboard passes page
```

---

## Task 5: Update navigation for residents

Ensure the sidebar/mobile nav shows appropriate items for residents when they're in the dashboard.

**Files:**
- Modify: `src/lib/navigation.ts` (review nav items visible to RESIDENT role)

**Step 1: Verify resident nav visibility**

The RESIDENT role has `passes:view_own` and `passes:create` permissions. Looking at `NAV_ITEMS`:
- "Overview" (`/dashboard`) — permissions: `[]` — visible to all (OK)
- "Active Passes" (`/dashboard/passes`) — permissions: `['passes:view_all', 'passes:view_own']` — visible to RESIDENT (OK, has `passes:view_own`)

The rest (Violations, Patrol Log, Units, Analytics, etc.) are correctly hidden from RESIDENT since they lack those permissions.

This task may require no code changes if the permissions are already correct. Verify by checking `getNavItemsForRole('RESIDENT')` returns only Overview and Active Passes.

**Step 2: Commit (if changes needed)**

```
fix: ensure resident dashboard navigation shows correct items
```

---

## Task 6: Verify full flow and run all tests

**Step 1: Run type check**

Run: `pnpm type-check`
Expected: No errors

**Step 2: Run linter**

Run: `pnpm lint`
Expected: No new errors (existing warnings OK)

**Step 3: Run all tests**

Run: `pnpm test`
Expected: All 291+ tests pass

**Step 4: Final commit if any fixes needed**

---

## Summary of changes

| File | Change |
|------|--------|
| `src/app/api/passes/route.ts` | Scope GET results by unitId for residents |
| `src/app/(dashboard)/dashboard/passes/page.tsx` | Convert to client component with API fetching + "New Pass" button |
| `src/components/dashboard/create-pass-dialog.tsx` | New unified dialog for pass creation (resident auto-scoped, staff with unit selector) |
| `src/components/resident/resident-login-form.tsx` | Redirect to `/dashboard/passes` |
| `src/lib/navigation.ts` | Verify/fix resident nav items (may need no changes) |
