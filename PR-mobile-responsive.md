# Mobile-First Responsive Transformation

## Summary
- Transform the entire application to be fully mobile-first responsive
- Add hamburger menu navigation for mobile devices
- Implement horizontal scroll tables, stacked forms, and touch-friendly components
- Critical for hospital operations where 99.9% of usage is on mobile devices

## Test plan
- [ ] Test on iPhone SE (375px), iPhone 12-14 (390px), iPhone Pro Max (428px)
- [ ] Verify hamburger menu opens/closes smoothly on mobile
- [ ] Confirm all tables scroll horizontally without breaking layout
- [ ] Test all forms are usable without iOS zoom (16px font minimum)
- [ ] Verify all touch targets are minimum 44px
- [ ] Test as different roles (ADMIN, SECURITY, RESIDENT)
- [ ] Run `pnpm run build` to verify no TypeScript errors

## Changes

### Foundation (2 files)
- **tailwind.config.ts**: Added `xs: 375px` breakpoint, touch-friendly spacing utilities (`touch: 44px`, `touch-lg: 48px`)
- **src/app/globals.css**: Added mobile utilities (`.safe-area-inset`, `.touch-manipulation`, `.no-overscroll`, `.mobile-scroll-container`)

### Navigation (2 files)
- **src/components/mobile-nav.tsx**: NEW - Hamburger menu with slide-out drawer using Sheet component, role-based navigation items, user info and sign-out
- **src/app/(dashboard)/layout.tsx**: Added sticky mobile header with hamburger menu, hide desktop sidebar on mobile (`hidden md:block`), responsive main content padding

### UI Components (3 files)
- **src/components/ui/dialog.tsx**: Mobile bottom drawer pattern with drag indicator, centered modal on desktop, touch-friendly close button
- **src/components/ui/table.tsx**: Horizontal scroll wrapper (`-mx-4 px-4 md:mx-0 md:px-0`), minimum width for scroll (`min-w-[640px]`)
- **src/components/ui/button.tsx**: Added `touch` (48px) and `icon-touch` size variants, `touch-manipulation` for tap handling

### Dashboard Pages (8 files)
All pages updated with consistent responsive patterns:
- **src/app/(dashboard)/dashboard/page.tsx**: Stat cards `grid-cols-2 lg:grid-cols-4`, recent sections stacked on mobile
- **src/app/(dashboard)/dashboard/passes/page.tsx**: Stacked header, full-width search, horizontal scroll table
- **src/app/(dashboard)/dashboard/users/page.tsx**: Stacked filters, responsive dialog forms, horizontal scroll table
- **src/app/(dashboard)/dashboard/units/page.tsx**: Same patterns as users page
- **src/app/(dashboard)/dashboard/violations/page.tsx**: Responsive header and search, horizontal scroll table
- **src/app/(dashboard)/dashboard/settings/page.tsx**: Stacked building selector, scrollable tabs, responsive form grids
- **src/app/(dashboard)/dashboard/analytics/page.tsx**: Responsive stat grids, stacked charts on mobile
- **src/app/(dashboard)/dashboard/health/page.tsx**: Stacked refresh button, responsive service cards grid

### Public Pages (2 files)
- **src/app/(public)/register/[slug]/page.tsx**: Duration buttons `grid-cols-2 xs:grid-cols-3 md:grid-cols-5`, stacked visitor info, touch-friendly inputs (48px)
- **src/app/(auth)/login/page.tsx**: Touch-friendly inputs and buttons, proper mobile padding

## Responsive Patterns Used

| Pattern | Mobile | Desktop |
|---------|--------|---------|
| Sidebar | Hidden (hamburger menu) | Fixed 64px |
| Tables | Horizontal scroll | Full width |
| Forms | Stacked (single column) | Grid (2-4 columns) |
| Dialogs | Full-screen drawer | Centered modal |
| Buttons | 44-48px height | 40px height |
| Search | Full width | Fixed width |
| Stat grids | 2 columns | 4 columns |

## Screenshots
_Add mobile and desktop screenshots here_

---
Generated with [Claude Code](https://claude.com/claude-code)
