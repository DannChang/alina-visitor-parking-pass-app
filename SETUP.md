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

### 🚧 Next Steps (To Complete Full Application)

**Authentication & Authorization:**
- [ ] Auth.js v5 configuration
- [ ] Login/logout pages
- [ ] Protected route middleware
- [ ] Role-based access control
- [ ] Session management

**UI Components (shadcn/ui):**
- [ ] Install shadcn/ui CLI and base components
- [ ] Create custom form components
- [ ] Build dashboard layout components
- [ ] Create data tables
- [ ] Build charts for analytics

**API Routes:**
- [ ] Pass CRUD endpoints (/api/passes)
- [ ] Vehicle endpoints (/api/vehicles)
- [ ] Violation endpoints (/api/violations)
- [ ] Unit management endpoints
- [ ] Analytics endpoints
- [ ] Health check endpoint
- [ ] QR code generation endpoint

**Frontend Pages:**
- [ ] Public visitor registration page
- [ ] Pass confirmation/status page
- [ ] Login page
- [ ] Manager dashboard home
- [ ] Active passes view
- [ ] Violations management
- [ ] Unit management
- [ ] Settings/configuration
- [ ] Analytics dashboard

**Additional Services:**
- [ ] Notification service (email with Resend)
- [ ] Audit logging service
- [ ] Health monitoring service
- [ ] Export service (CSV/PDF)

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

## 🚀 Quick Start (Current State)

### Prerequisites

Ensure you have installed:
- Node.js 20.x or higher
- pnpm 8.x or higher (run: `npm install -g pnpm`)
- A Neon PostgreSQL database (create at https://console.neon.tech)

### Step 1: Install Dependencies

\`\`\`bash
pnpm install
\`\`\`

Expected result: All packages installed successfully

### Step 2: Configure Environment

1. Create your Neon database:
   - Go to https://console.neon.tech
   - Create new project: "Alina Parking"
   - Copy connection string

2. Update \`.env.local\`:

\`\`\`bash
# Update this with your Neon connection string
DATABASE_URL="postgresql://user:password@host.neon.tech/alina_parking?sslmode=require"

# Generate a secure secret (run: openssl rand -base64 32)
NEXTAUTH_SECRET="REPLACE_THIS_WITH_GENERATED_SECRET"

# Encryption key (run: openssl rand -base64 32)
ENCRYPTION_KEY="REPLACE_THIS_WITH_GENERATED_KEY"

# Resend API key (already configured)
RESEND_API_KEY="re_fRRPFaoh_95EXuahtQyyGm3vKnbrsrMFw"
\`\`\`

### Step 3: Initialize Database

\`\`\`bash
# Generate Prisma Client
pnpm db:generate

# Create tables (runs migrations)
pnpm db:push

# Seed with sample data
pnpm db:seed
\`\`\`

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

\`\`\`bash
pnpm dev
\`\`\`

The application will start at: http://localhost:3000

**Current working endpoints:**
- Health check (will need API route): http://localhost:3000/api/health
- Registration URL (will need page): http://localhost:3000/register/alina-visitor-parking

---

## 📂 What Has Been Built

### 1. **Database Schema** (\`prisma/schema.prisma\`)

A comprehensive, production-ready schema with:

**Core Entities:**
- Buildings & Units
- Parking Zones
- Vehicles & Parking Passes
- Violations
- Users & Authentication

**Key Features:**
- Soft deletes (data safety)
- Audit logging
- Multi-building support
- Role-based access control
- Notification queue
- System health monitoring

### 2. **Validation Service** (\`src/services/validation-service.ts\`)

Hospital-grade business logic enforcement:

**Validates:**
- ✅ Blacklist checking (security)
- ✅ Max vehicles per unit
- ✅ Consecutive hours limit
- ✅ Cooldown period
- ✅ Allowed durations
- ✅ Operating hours
- ✅ Pass extension rules

**Returns:**
- Detailed error messages
- Warning messages
- Metadata for debugging

### 3. **Utility Functions**

**License Plate Utils** (\`src/lib/utils/license-plate.ts\`):
- Normalization (ABC123)
- Formatting (ABC 123)
- Validation
- Sanitization for input fields
- Masking for privacy

**Date/Time Utils** (\`src/lib/utils/date-time.ts\`):
- Pass expiration calculations
- Consecutive hours calculation
- Cooldown period checks
- Time formatting
- Duration formatting

**QR Code Utils** (\`src/lib/utils/qr-code.ts\`):
- QR code generation (Data URL, Buffer, SVG)
- Printable QR codes with labels
- URL validation and parsing

### 4. **Configuration**

**TypeScript Config** (\`tsconfig.json\`):
- Strict mode enabled (maximum type safety)
- Path aliases (@/*)
- Latest ECMAScript features

**ESLint Config** (\`.eslintrc.json\`):
- Next.js best practices
- TypeScript rules
- No unused variables
- No explicit any

**Tailwind Config** (\`tailwind.config.ts\`):
- shadcn/ui compatible
- Custom color system
- Animations
- Responsive breakpoints

### 5. **Security Configuration**

**Next.js Config** (\`next.config.js\`):
- Security headers (CSP, HSTS, X-Frame-Options)
- Image optimization
- Compression enabled
- Production optimizations

---

## 🔧 Next Implementation Steps

To complete the application, follow these phases:

### Phase 1: Authentication (Priority: HIGH)

**Files to create:**

1. \`src/lib/auth.ts\` - Auth.js configuration
2. \`src/middleware.ts\` - Route protection middleware
3. \`src/app/api/auth/[...nextauth]/route.ts\` - Auth API routes
4. \`src/app/(auth)/login/page.tsx\` - Login page

**Commands:**
\`\`\`bash
# Auth.js is already in package.json
pnpm install
\`\`\`

### Phase 2: shadcn/ui Setup (Priority: HIGH)

**Initialize shadcn/ui:**

\`\`\`bash
npx shadcn@latest init
\`\`\`

Answer prompts:
- Style: Default
- Base color: Slate
- CSS variables: Yes

**Install required components:**

\`\`\`bash
npx shadcn@latest add button card input label select table dialog badge toast form tabs avatar dropdown-menu alert separator skeleton
\`\`\`

### Phase 3: API Routes (Priority: HIGH)

Create these API endpoints:

1. **Pass Management:**
   - POST /api/passes - Create new pass
   - GET /api/passes - List passes
   - GET /api/passes/[id] - Get pass details
   - PATCH /api/passes/[id] - Update pass
   - POST /api/passes/extend - Extend pass
   - POST /api/passes/validate - Pre-validate request

2. **Vehicles:**
   - GET /api/vehicles - Search vehicles
   - GET /api/vehicles/[id] - Vehicle details

3. **Violations:**
   - POST /api/violations - Log violation
   - GET /api/violations - List violations
   - PATCH /api/violations/[id] - Update violation

4. **Health:**
   - GET /api/health - System health check

### Phase 4: Frontend Pages (Priority: HIGH)

**Public pages:**
1. Registration form (mobile-optimized)
2. Pass confirmation/status view
3. Pass extension page

**Dashboard pages:**
1. Login
2. Dashboard home (stats overview)
3. Active passes table
4. Violation management
5. Unit management
6. Settings

### Phase 5: Services & Features (Priority: MEDIUM)

1. **Notification Service** - Email with Resend
2. **Audit Service** - Log all actions
3. **Export Service** - CSV/PDF generation
4. **Analytics Service** - Stats and metrics

### Phase 6: Testing (Priority: MEDIUM)

1. Unit tests for validation service
2. Integration tests for API endpoints
3. E2E tests for critical flows

### Phase 7: Production Prep (Priority: HIGH before launch)

1. Security audit
2. Performance testing
3. Accessibility testing (WCAG AA)
4. Production environment setup
5. CI/CD pipeline
6. Monitoring setup (Sentry)

---

## 💡 Development Tips

### Working with Prisma

**Generate client after schema changes:**
\`\`\`bash
pnpm db:generate
\`\`\`

**Create migration:**
\`\`\`bash
pnpm db:migrate
\`\`\`

**Reset database (⚠️ deletes all data):**
\`\`\`bash
pnpm db:reset
\`\`\`

**View data in Prisma Studio:**
\`\`\`bash
pnpm db:studio
\`\`\`

### Type Safety

The codebase uses TypeScript strict mode. This means:
- ✅ No \`any\` types allowed
- ✅ All variables must be initialized
- ✅ Null checks required
- ✅ Unused variables cause errors

This catches bugs early and improves code quality.

### Code Quality

**Before committing:**
\`\`\`bash
pnpm lint          # Check for issues
pnpm lint:fix      # Auto-fix issues
pnpm type-check    # TypeScript check
pnpm format        # Format code
\`\`\`

---

## 🐛 Troubleshooting

### Issue: Prisma Client not found

**Solution:**
\`\`\`bash
pnpm db:generate
\`\`\`

### Issue: Database connection error

**Check:**
1. DATABASE_URL in .env.local is correct
2. Neon database is running
3. IP is allowed in Neon dashboard

### Issue: Module not found errors

**Solution:**
\`\`\`bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
\`\`\`

### Issue: Type errors after schema change

**Solution:**
\`\`\`bash
pnpm db:generate
# Restart TypeScript server in VS Code
\`\`\`

---

## 📊 Project Statistics

**Files Created:** 20+ core files
**Lines of Code:** ~5,000+ (foundation)
**Database Tables:** 16 tables
**Enums:** 8 enums
**API Routes Planned:** 20+ endpoints
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
**Version:** 0.1.0 (Foundation Complete)
