# Alina Visitor Parking Pass Application

**Mission-Critical Parking Management System for Residential Facilities**

A production-grade, full-stack Next.js application for managing visitor parking in multi-unit residential facilities. Built with enterprise-level security, reliability, and scalability in mind.

## 🏢 Overview

This application provides comprehensive parking pass management for residential properties, enabling:

- **Visitors & Guests**: Quick vehicle registration via QR code scanning or multi-step wizard
- **Residents**: Self-service portal for managing guests, passes, and vehicles
- **Building Managers**: Real-time monitoring and violation management
- **Security Personnel**: License plate OCR scanning, enforcement tracking, and electronic logbook
- **Administrators**: Analytics, reporting, and system configuration

## 🚀 Key Features

### Core Functionality
- ✅ QR code-based visitor registration
- ✅ Multi-step guest registration wizard with building search
- ✅ Comprehensive validation rules engine
- ✅ Real-time pass status tracking with countdown timers
- ✅ In-out privileges (vehicle entry/exit tracking)
- ✅ Auto-extension for active passes
- ✅ Grace period support
- ✅ Consecutive day limits with cooldown periods
- ✅ Violation logging and escalation workflow (NONE → WARNING → FORMAL_LETTER → TOW_NOTICE)
- ✅ Multi-building support
- ✅ Automated email and SMS notifications
- ✅ Complete audit trail

### Resident Portal
- ✅ Dual authentication (staff email/password + resident building/suite/password)
- ✅ Authorized guest management
- ✅ Self-service pass creation for guests
- ✅ Vehicle registration and management
- ✅ SMS pass sharing with guests
- ✅ Activity history and audit log
- ✅ Access code and password management

### Patrol & Enforcement
- ✅ License plate OCR scanning (Tesseract.js with client/server hybrid)
- ✅ Mobile-first patrol dashboard
- ✅ Electronic logbook with entry/exit/spot-check/note types
- ✅ Vehicle history with tabbed view (passes, violations, logs)
- ✅ Quick violation logging with photo evidence
- ✅ Escalation timeline visualization
- ✅ Offline support with IndexedDB caching
- ✅ Real-time validation with color-coded status (green/red/yellow)

### Internationalization & PWA
- ✅ Multi-language support (English, Spanish, French) with next-intl
- ✅ Progressive Web App (PWA) support
- ✅ Service worker for offline functionality
- ✅ Installable on mobile devices
- ✅ App manifest with custom icons

### Security & Compliance
- 🔒 Enterprise-grade authentication (Auth.js v5)
- 🔒 Role-based access control (RBAC)
- 🔒 Rate limiting and abuse prevention
- 🔒 Comprehensive audit logging
- 🔒 Soft deletes (data never lost)
- 🔒 Input sanitization and validation

### Performance & Reliability
- ⚡ Edge-optimized with Vercel
- ⚡ Database connection pooling
- ⚡ Optimistic UI updates
- ⚡ 99.9% uptime target
- ⚡ Sub-200ms API response times

## 📋 Prerequisites

- **Node.js**: 20.x LTS or higher
- **pnpm**: 8.x or higher (recommended package manager)
- **PostgreSQL**: 15+ (via Neon serverless)
- **Resend Account**: For email notifications

## 🛠️ Technology Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 (strict mode) |
| Database | PostgreSQL 15+ (Neon serverless) |
| ORM | Prisma 5 |
| Authentication | Auth.js v5 (dual credential providers) |
| UI Components | shadcn/ui + Radix UI |
| Styling | Tailwind CSS 3 |
| Email | Resend |
| SMS | Provider abstraction (Console/Twilio) |
| OCR | Tesseract.js (client + server) |
| i18n | next-intl (en/es/fr) |
| PWA | Service Worker + Web Manifest |
| Offline Storage | IndexedDB (idb) |
| Deployment | Vercel |
| Monitoring | Sentry |

## 📦 Installation

### 1. Clone Repository

\`\`\`bash
git clone https://github.com/DannChang/alina-visitor-parking-pass-app.git
cd alina-visitor-parking-pass-app
\`\`\`

### 2. Install Dependencies

\`\`\`bash
pnpm install
\`\`\`

### 3. Set Up Database

**Create Neon Database:**

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project: "Alina Parking"
3. Copy the connection string

**Update Environment Variables:**

\`\`\`bash
cp .env.example .env.local
\`\`\`

Edit \`.env.local\` and update:

\`\`\`env
# Replace with your Neon connection string
DATABASE_URL="postgresql://user:pass@host/alina_parking?sslmode=require"

# Generate a secure secret: openssl rand -base64 32
NEXTAUTH_SECRET="your-generated-secret-here"

# Your Resend API key is already configured
RESEND_API_KEY="re_fRRPFaoh_95EXuahtQyyGm3vKnbrsrMFw"
\`\`\`

### 4. Initialize Database

\`\`\`bash
# Generate Prisma Client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed initial data
pnpm db:seed
\`\`\`

### 5. Run Development Server

\`\`\`bash
pnpm dev
\`\`\`

Application will be available at: [http://localhost:3000](http://localhost:3000)

## 🗂️ Project Structure

\`\`\`
alina-visitor-parking-pass-app/
├── prisma/
│   ├── schema.prisma           # Database schema (all Phase 0-4 models)
│   ├── migrations/             # Database migrations
│   └── seed.ts                 # Initial data seeding
│
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (public)/          # Public routes (/register/[slug], /register/guest)
│   │   ├── (auth)/            # Staff authentication
│   │   ├── (dashboard)/       # Manager dashboard (passes, violations, patrol-log)
│   │   ├── (resident)/        # Resident portal (login, passes, guests, activity)
│   │   └── api/               # API routes
│   │       ├── buildings/     # Building search
│   │       ├── passes/        # Pass management (entry, exit, reactivate, auto-extend)
│   │       ├── patrol/        # Patrol lookup and logbook
│   │       ├── resident/      # Resident APIs (passes, guests, vehicles, settings)
│   │       ├── units/         # Unit management and verification
│   │       ├── vehicles/      # Vehicle history
│   │       └── violations/    # Violation escalation
│   │
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── pass/              # Countdown timer
│   │   ├── registration/      # Multi-step wizard (6 steps)
│   │   ├── resident/          # Resident portal components
│   │   ├── patrol/            # OCR, logbook, vehicle history
│   │   ├── violations/        # Escalation timeline and dialogs
│   │   ├── pwa/               # Service worker registration
│   │   └── shared/            # Shared components
│   │
│   ├── lib/
│   │   ├── prisma.ts          # Database client
│   │   ├── auth.ts            # NextAuth dual providers
│   │   ├── authorization.ts   # RBAC permissions
│   │   ├── constants.ts       # App constants
│   │   ├── validations/       # Zod schemas
│   │   ├── utils/             # Utilities (date-time, license-plate)
│   │   └── middleware/        # Custom middleware
│   │
│   ├── services/
│   │   ├── validation-service.ts      # Business logic (consecutive days, in-out)
│   │   ├── notification-service.ts    # Email (Resend)
│   │   ├── sms-notification-service.ts # SMS abstraction
│   │   ├── sms/                       # SMS providers (console, twilio)
│   │   ├── ocr-service.ts             # Tesseract.js OCR
│   │   ├── offline-cache-service.ts   # IndexedDB caching
│   │   ├── export-service.ts          # CSV/PDF reports
│   │   └── audit-service.ts           # Audit logging
│   │
│   ├── i18n/                  # Internationalization
│   │   ├── request.ts         # next-intl request handler
│   │   └── routing.ts         # Locale routing
│   │
│   ├── messages/              # Translation files (en, es, fr)
│   ├── hooks/                 # React hooks (useCamera, usePatrolScanner, useCountdown)
│   └── types/                 # TypeScript types
│
├── public/
│   ├── icons/                 # PWA icons (192x192, 512x512)
│   ├── manifest.json          # Web app manifest
│   └── sw.js                  # Service worker
│
├── e2e/                       # Playwright E2E tests
├── docs/                      # Documentation
└── scripts/                   # Utility scripts
\`\`\`

## 🔑 Key Concepts

### Parking Pass Lifecycle

1. **Visitor Scans QR Code** → Redirected to registration page
2. **Multi-Step Registration** → Building search, suite selection, access code, vehicle info, contact info, confirmation
3. **Validation** → Rules engine checks all constraints (blacklist, cooldown, consecutive days, max vehicles)
4. **Pass Created** → Confirmation email/SMS sent with countdown timer
5. **Active Monitoring** → Dashboard shows real-time status with color coding
6. **In-Out Privileges** → Vehicle can exit and re-enter within pass duration
7. **Auto-Extension** → Eligible passes auto-extend when threshold reached
8. **Expiration** → Warning emails sent, automatic status update, grace period applied

### Validation Rules

The system enforces comprehensive business rules per building:

- **Max Vehicles Per Unit**: Default 2 (configurable)
- **Max Consecutive Hours**: Default 24 hours
- **Max Consecutive Days**: Default 3 calendar days (prevents indefinite parking)
- **Cooldown Period**: Default 2 hours between passes for same vehicle
- **Consecutive Day Cooldown**: Default 24 hours after reaching max consecutive days
- **Blacklist Check**: Automatic rejection of banned vehicles
- **Operating Hours**: Optional time restrictions (24/7 by default)
- **Duration Limits**: Configurable allowed durations [2, 4, 8, 12, 24]
- **Auto-Extension**: Enabled by default with 6-hour threshold
- **In-Out Privileges**: Entry/exit tracking with reactivation
- **Grace Period**: Applied after expiration for violations
- **Access Code Verification**: Optional suite access code requirement

### Security Model

- **RBAC**: 5 roles (Super Admin, Admin, Manager, Security, Resident)
- **Audit Logging**: Every action tracked with IP, user agent
- **Soft Deletes**: Data never permanently removed
- **Rate Limiting**: Prevents abuse and DDoS
- **Input Validation**: All inputs sanitized and validated

## 📱 Usage

### For Visitors & Guests

1. Scan QR code or navigate to registration URL
2. **Multi-step wizard:**
   - Search and select building
   - Choose suite number
   - Enter access code (if required)
   - Provide vehicle information (plate, make, model, color)
   - Contact details (name, phone, email)
   - Review and confirm
3. Receive confirmation via email/SMS with countdown timer
4. View live pass status with time remaining

### For Residents

1. Log in with building + suite + password
2. **Manage Authorized Guests:**
   - Add frequent visitors with pre-approval
   - Store guest contact information
   - Edit or remove guest access
3. **Create Parking Passes:**
   - Select from authorized guest list or create new
   - Choose duration and vehicle
   - Send pass link via SMS to guest
4. **Track Activity:**
   - View all passes created by your unit
   - Monitor active and expired passes
   - Review pass history
5. **Settings:**
   - Update contact information
   - Manage access code
   - Register resident vehicles
   - Change password

### For Security Personnel

1. Access patrol dashboard (mobile-optimized)
2. **License Plate OCR Scanning:**
   - Point camera at license plate
   - Automatic recognition via Tesseract.js
   - Instant validation with color-coded status
3. **Electronic Logbook:**
   - Log entries: Entry, Exit, Spot Check, Note
   - Add photos and detailed notes
   - Filter by type, vehicle, or date
4. **Vehicle History:**
   - View complete history (passes, violations, patrol logs)
   - Tabbed interface for easy navigation
5. **Offline Mode:**
   - Works without internet via IndexedDB caching
   - Syncs when connection restored

### For Managers

1. Log in to dashboard
2. View all active passes in real-time
3. Search by license plate or unit
4. **Violation Management:**
   - Log violations with photo evidence
   - Escalate violations (NONE → WARNING → FORMAL_LETTER → TOW_NOTICE)
   - View escalation timeline
5. Manage blacklist
6. Export reports (CSV/PDF)
7. Configure parking rules

### For Administrators

1. All manager capabilities plus:
2. User management
3. Multi-building configuration
4. System settings and rules
5. Analytics and insights
6. QR code generation

## 🧪 Testing

\`\`\`bash
# Run unit tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e

# Type checking
pnpm type-check

# Lint
pnpm lint
\`\`\`

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect Repository:**
   - Go to [Vercel Dashboard](https://vercel.com)
   - Import Git repository
   - Select project

2. **Configure Environment Variables:**
   - Add all variables from \`.env.local\`
   - Ensure \`DATABASE_URL\` points to production database
   - Set \`NEXTAUTH_URL\` to your domain

3. **Deploy:**
   - Vercel will automatically deploy on push to main
   - Run migrations: \`pnpm db:migrate:deploy\`

### Database Migrations in Production

\`\`\`bash
# From local machine
npx prisma migrate deploy

# Or use Vercel CLI
vercel env pull .env.production
npx prisma migrate deploy
\`\`\`

## 📊 Monitoring

The application includes built-in health monitoring:

- **Health Endpoint**: \`/api/health\`
- **Metrics**: Active passes, violations, system status
- **Error Tracking**: Sentry integration (optional)
- **Audit Logs**: Complete action history

## 🔧 Configuration

### Parking Rules

Rules can be configured per building via Admin dashboard or database:

\`\`\`sql
UPDATE parking_rules SET
  max_vehicles_per_unit = 3,
  max_consecutive_hours = 48,
  max_consecutive_days = 5,
  cooldown_hours = 4,
  consecutive_day_cooldown_hours = 48,
  allowed_durations = ARRAY[2, 4, 8, 12, 24, 48, 72],
  auto_extension_enabled = true,
  auto_extension_threshold_hours = 6,
  auto_extension_duration_hours = 25,
  in_out_privileges = true
WHERE building_id = 'your-building-id';
\`\`\`

### Email Templates

Email templates are in \`src/lib/email/templates/\`:

- \`pass-confirmation.tsx\` - New pass confirmation
- \`pass-expiring.tsx\` - Expiration warning
- \`violation-notice.tsx\` - Violation notifications

## 📝 License

Proprietary - Alina Residential Management

## 🤝 Support

For issues or questions:

1. Check documentation in \`/docs\`
2. Review GitHub Issues
3. Contact development team

## 🔐 Security

### Reporting Vulnerabilities

**DO NOT** create public GitHub issues for security vulnerabilities.

Contact: security@alinaresidential.com

### Security Features

- ✅ SQL injection prevention (Prisma)
- ✅ XSS protection (React + DOMPurify)
- ✅ CSRF protection (Next.js)
- ✅ Rate limiting
- ✅ Secure headers (CSP, HSTS, etc.)
- ✅ Input sanitization
- ✅ Password hashing (bcrypt)
- ✅ Audit logging

## 📈 Performance

Target metrics:

- **API Response**: < 200ms (p95)
- **Page Load**: < 2s (LCP)
- **Uptime**: 99.9%
- **Error Rate**: < 0.1%

## 🌟 Best Practices

This codebase follows:

- ✅ TypeScript strict mode
- ✅ ESLint + Prettier
- ✅ Conventional commits
- ✅ Comprehensive error handling
- ✅ Accessibility (WCAG AA)
- ✅ Mobile-first design
- ✅ Progressive enhancement

## 🗺️ Roadmap

### ✅ Phase 0: Database Schema (COMPLETED)
- [x] Complete Prisma schema with all models
- [x] Enums: EscalationLevel, PatrolEntryType
- [x] New models: AuthorizedGuest, PatrolLogEntry
- [x] In-out privileges fields
- [x] Consecutive day tracking fields
- [x] Resident authentication fields

### ✅ Phase 1: Core Pass System (COMPLETED)
- [x] QR code registration flow
- [x] Multi-step registration wizard (6 steps)
- [x] Validation engine with consecutive day limits
- [x] Manager dashboard
- [x] Email notifications
- [x] Pass countdown timer
- [x] Auto-extension logic
- [x] In-out privileges (entry/exit/reactivate)
- [x] Grace period support

### ✅ Phase 2: Resident Portal (COMPLETED)
- [x] Dual authentication (staff + resident credentials)
- [x] Resident login with building + suite + password
- [x] Authorized guest management
- [x] Self-service pass creation
- [x] Vehicle management
- [x] Activity history
- [x] Settings (contact info, access code, password)

### ✅ Phase 3: Patrol Enhancements (COMPLETED)
- [x] Electronic logbook (PatrolLogEntry with types)
- [x] Violation escalation workflow
- [x] Escalation timeline visualization
- [x] Vehicle history dialog (tabbed view)
- [x] Enhanced patrol lookup with grace period detection

### ✅ Phase 4.1: SMS Service (COMPLETED)
- [x] SMS provider abstraction
- [x] Console provider (development)
- [x] Twilio provider stub (production-ready)
- [x] Send pass link to guests via SMS

### ✅ Phase 4.2: Internationalization (COMPLETED)
- [x] next-intl integration
- [x] English, Spanish, French translations
- [x] Locale routing
- [x] Namespaced message files

### ✅ Phase 4.3: PWA Support (COMPLETED)
- [x] Web app manifest
- [x] Service worker with cache strategies
- [x] PWA icons (192x192, 512x512)
- [x] Auto-registration component
- [x] Installable on mobile devices

### 🚧 Phase 5: Future Enhancements
- [ ] Analytics dashboard with charts
- [ ] Payment integration for parking fees
- [ ] Mobile app (React Native)
- [ ] Garage integration API
- [ ] Advanced reporting with custom filters
- [ ] Push notifications
- [ ] Integration with property management systems

## 🙏 Acknowledgments

- **shadcn/ui**: For beautiful, accessible components
- **Vercel**: For outstanding Next.js hosting
- **Neon**: For serverless PostgreSQL
- **Prisma**: For type-safe database access

---

**Built with ❤️ for Alina Residential Management by the development team**

Last Updated: 2026-02-14
