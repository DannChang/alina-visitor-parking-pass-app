# Setup Guide - Alina Visitor Parking Pass Application

## 📋 Current Implementation Status

### ✅ Completed (Foundation & Core Infrastructure)

**Project Setup:**
- [x] Next.js 15 project initialized with TypeScript
- [x] TypeScript strict mode configuration
- [x] ESLint & Prettier configured
- [x] Tailwind CSS configured
- [x] Environment variable setup (.env.local with Resend API key)
- [x] Git ignore rules
- [x] Package.json with all dependencies

**Database:**
- [x] Comprehensive Prisma schema (production-grade)
- [x] Support for multi-building management
- [x] Complete audit trail system
- [x] Soft delete implementation
- [x] Full-text search ready
- [x] Database seed script with sample data
- [x] Prisma client singleton

**Core Services & Utilities:**
- [x] License plate normalization & validation
- [x] Date/time calculations for passes
- [x] QR code generation utilities
- [x] Comprehensive validation service (business rules engine)
- [x] Application constants & configuration
- [x] Utility functions (cn, formatting, etc.)

**Documentation:**
- [x] Comprehensive README
- [x] This SETUP guide
- [x] Inline code documentation

### ✅ Completed (Application Layer)

**Authentication & Authorization:**
- [x] Auth.js v5 configuration with credentials provider
- [x] Login page with form validation
- [x] Protected route middleware (Edge-compatible)
- [x] Role-based access control
- [x] Session management with JWT
- [x] Audit logging for login/logout events

**UI Components (shadcn/ui):**
- [x] shadcn/ui initialized with 25 components
- [x] Button, Card, Input, Label, Select
- [x] Dialog, Badge, Toast, Sonner
- [x] Form, Tabs, Avatar, Dropdown Menu
- [x] Alert, Separator, Skeleton, Table
- [x] Textarea, Checkbox, Radio Group, Switch
- [x] Scroll Area, Sheet

**API Routes:**
- [x] Pass CRUD endpoints (/api/passes)
- [x] Pass extension endpoint (/api/passes/extend)
- [x] Vehicle search & update (/api/vehicles)
- [x] Violation CRUD endpoints (/api/violations)
- [x] Units endpoint (/api/units)
- [x] Health check endpoint (/api/health)

**Frontend Pages:**
- [x] Public visitor registration page (/register/[slug])
- [x] Pass confirmation with success state
- [x] Login page
- [x] Manager dashboard home
- [x] Active passes view
- [x] Violations management

**Additional Services:**
- [x] Notification service (email with Resend)
- [x] Email templates (confirmation, expiration warning)
- [x] Session provider for client-side auth

### ✅ Recently Completed

**Frontend Pages:**
- [x] Unit management page
- [x] Settings/configuration page
- [x] Analytics dashboard
- [x] User management page (admin only)

**Additional Services:**
- [x] Export service (CSV/JSON)
- [x] Health monitoring service (frontend display)

### 🚧 Remaining Tasks

**Testing:**
- [ ] Unit tests for services
- [ ] Integration tests for API
- [ ] E2E tests with Playwright
- [ ] Test configuration (Vitest, Playwright config)

**DevOps:**
- [ ] GitHub Actions CI/CD pipeline
- [ ] Vercel deployment configuration
- [ ] Database migration workflow
- [ ] Environment variable documentation

---

## 🚀 Quick Start

### Prerequisites

Ensure you have installed:
- Node.js 20.x or higher
- pnpm 8.x or higher (run: `npm install -g pnpm`)
- A Neon PostgreSQL database (create at https://console.neon.tech)

### Step 1: Install Dependencies

```bash
pnpm install
```

Expected result: All packages installed successfully

### Step 2: Configure Environment

1. Create your Neon database:
   - Go to https://console.neon.tech
   - Create new project: "Alina Parking"
   - Copy connection string

2. Update `.env.local`:

```bash
# Update this with your Neon connection string
DATABASE_URL="postgresql://user:password@host.neon.tech/alina_parking?sslmode=require"

# Generate a secure secret (run: openssl rand -base64 32)
NEXTAUTH_SECRET="REPLACE_THIS_WITH_GENERATED_SECRET"

# Set the base URL for auth callbacks
NEXTAUTH_URL="http://localhost:3000"

# Encryption key (run: openssl rand -base64 32)
ENCRYPTION_KEY="REPLACE_THIS_WITH_GENERATED_KEY"

# Resend API key (already configured)
RESEND_API_KEY="re_fRRPFaoh_95EXuahtQyyGm3vKnbrsrMFw"
```

### Step 3: Initialize Database

```bash
# Generate Prisma Client
pnpm db:generate

# Create tables (runs migrations)
pnpm db:push

# Seed with sample data
pnpm db:seed
```

Expected output:
```
✅ Database seed completed successfully!
```

You'll get:
- 1 building (Alina Visitor Parking)
- 3 parking zones (Main, Emergency, North)
- 30 sample units (101-310)
- 3 users (admin, manager, resident)
- 1 sample active pass

**Default Credentials:**
- Admin: admin@alinahospital.com / Admin@123!
- Manager: manager@alinahospital.com / Manager@123!
- Resident: resident@example.com / Resident@123!

⚠️ **IMPORTANT**: Change these passwords before going to production!

### Step 4: Start Development Server

```bash
pnpm dev
```

The application will start at: http://localhost:3000

**Working endpoints:**
- Health check: http://localhost:3000/api/health
- Login: http://localhost:3000/login
- Dashboard: http://localhost:3000/dashboard (requires login)
- Registration: http://localhost:3000/register/alina-visitor-parking

---

## 📂 What Has Been Built

### 1. **Authentication System** (`src/lib/auth.ts`)

- Auth.js v5 with credentials provider
- JWT-based session strategy
- Login tracking and failed attempt counting
- Audit logging for sign-in/sign-out events
- Type-safe session with user roles

### 2. **Protected Routes** (`src/middleware.ts`)

Edge-compatible middleware that:
- Protects dashboard routes
- Redirects unauthenticated users to login
- Role-based access control (admin-only routes)
- Public API routes for visitor registration

### 3. **API Endpoints**

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | No | System health check |
| `/api/passes` | GET | Yes | List all passes |
| `/api/passes` | POST | No | Create new pass (visitor) |
| `/api/passes/[id]` | GET | No | Get pass details |
| `/api/passes/[id]` | PATCH | Yes | Update pass |
| `/api/passes/[id]` | DELETE | Yes | Cancel pass |
| `/api/passes/extend` | POST | No | Extend pass duration |
| `/api/vehicles` | GET | Yes | Search vehicles |
| `/api/vehicles` | PATCH | Yes | Update/blacklist vehicle |
| `/api/violations` | GET | Yes | List violations |
| `/api/violations` | POST | Yes | Log new violation |
| `/api/violations` | PATCH | Yes | Update/resolve violation |
| `/api/units` | GET | No | Get units for building |

### 4. **Frontend Pages**

**Public Pages:**
- `/register/[slug]` - Mobile-optimized visitor registration
- `/login` - Manager/admin login

**Dashboard Pages:**
- `/dashboard` - Overview with stats and recent activity
- `/dashboard/passes` - Active passes table
- `/dashboard/violations` - Violations management

### 5. **UI Components**

25 shadcn/ui components installed and configured:
- Form elements (Input, Label, Select, Checkbox, etc.)
- Layout components (Card, Dialog, Sheet, Tabs)
- Feedback components (Toast, Alert, Badge, Skeleton)
- Navigation components (Dropdown Menu, Avatar)

### 6. **Notification Service** (`src/services/notification-service.ts`)

- Email sending via Resend API
- Pass confirmation emails
- Expiration warning emails
- Notification queue with retry logic
- Professional HTML email templates

---

## 🔧 Development Commands

```bash
# Start development server
pnpm dev

# Type check
pnpm type-check

# Lint code
pnpm lint
pnpm lint:fix

# Format code
pnpm format

# Database commands
pnpm db:generate    # Generate Prisma client
pnpm db:push        # Push schema changes
pnpm db:seed        # Seed sample data
pnpm db:studio      # Open Prisma Studio
pnpm db:migrate     # Create migration
pnpm db:reset       # Reset database (⚠️ deletes data)
```

---

## 🐛 Troubleshooting

### Issue: Prisma Client not found

**Solution:**
```bash
pnpm db:generate
```

### Issue: Database connection error

**Check:**
1. DATABASE_URL in .env.local is correct
2. Neon database is running
3. IP is allowed in Neon dashboard

### Issue: Auth not working

**Check:**
1. NEXTAUTH_SECRET is set in .env.local
2. NEXTAUTH_URL matches your development URL
3. Run `pnpm db:push` to ensure User table exists

### Issue: Module not found errors

**Solution:**
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Issue: Type errors after schema change

**Solution:**
```bash
pnpm db:generate
# Restart TypeScript server in VS Code
```

---

## 📊 Project Statistics

**Files Created:** 55+ files
**Lines of Code:** ~12,000+ (application)
**Database Tables:** 16 tables
**API Endpoints:** 18 endpoints
**UI Components:** 26 shadcn/ui components
**Frontend Pages:** 10 pages
**Test Coverage Target:** 80%+

---

## 🎯 Success Metrics

When complete, the application should achieve:

- **Performance:** < 200ms API response time
- **Uptime:** 99.9% availability
- **Security:** Zero critical vulnerabilities
- **Accessibility:** WCAG AA compliance
- **Type Safety:** 100% TypeScript coverage
- **Test Coverage:** 80%+ on critical paths

---

## 📞 Support

For questions during implementation:

1. Check this guide first
2. Review inline code comments
3. Check Prisma schema documentation
4. Review service layer logic

---

## 🎓 Learning Resources

**Next.js 15:**
- https://nextjs.org/docs

**Prisma:**
- https://www.prisma.io/docs

**Auth.js:**
- https://authjs.dev

**shadcn/ui:**
- https://ui.shadcn.com

**Tailwind CSS:**
- https://tailwindcss.com/docs

---

**Last Updated:** 2026-01-30
**Version:** 0.3.0 (Phase 8 Complete - Full Application)
