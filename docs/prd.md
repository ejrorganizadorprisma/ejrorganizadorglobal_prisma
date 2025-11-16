# EJR Organizador Product Requirements Document (PRD)

**Version:** 1.0
**Date:** November 15, 2025
**Product Manager:** John
**Status:** Draft - MVP Scope

---

## Table of Contents

1. [Goals and Background Context](#goals-and-background-context)
2. [Requirements](#requirements)
3. [User Interface Design Goals](#user-interface-design-goals)
4. [Technical Assumptions](#technical-assumptions)
5. [Epic List](#epic-list)
6. [Epic Details](#epic-details)
7. [Next Steps](#next-steps)

---

## Goals and Background Context

### Goals

- **Automate 90% of operational workflows** to reduce manual work by 60-70% and eliminate human errors
- **Provide real-time visibility** of inventory, sales, and performance metrics across three hierarchical levels (Owner, Director, Manager)
- **Establish scalable foundation** that supports growth from current 10-person team to 20-30 people without system migration
- **Enable data-driven decision making** through automated dashboards, intelligent alerts, and scheduled reports
- **Reduce inventory costs** by 20-30% through intelligent stock management, automatic reordering suggestions, and predictive analytics
- **Increase sales productivity** by 15-25% through streamlined quote-to-order workflows and automated document generation
- **Create role-specific experiences** where Owner sees results, Director has control, Manager handles operations, and staff execute tasks efficiently

### Background Context

EJR Organizador addresses the need to professionalize management for a 10-person organization (Owner + Director + Manager + 7 staff) currently operating with manual or semi-automated processes. Viability analysis revealed that a complete system would be excessive for current operations, but a well-architected MVP with maximum automation offers optimal cost-benefit.

The adopted strategy is "think big, start small" - building with scalable architecture while implementing 8-9 essential modules with intelligent automation. The key differentiator is serving three critical access profiles: the Owner who wants executive results only, the Director who needs total control and audit capabilities, and the Manager who handles day-to-day operations. The system must "work by itself" through intelligent alerts, automatic reports, validations, and automated workflows.

**Current Pain Points:**
- Manual inventory tracking leads to stockouts and overstocking
- Quote creation takes 30-45 minutes per quote
- No visibility into real-time sales performance
- Manual data entry causes 15-20% error rate
- No audit trail of who did what
- Reporting requires 4-6 hours of manual compilation weekly

**Expected Outcomes:**
- ROI within 6-10 months
- System operational in 4-5 months
- 60-70% reduction in administrative overhead
- Real-time business intelligence for strategic decisions
- Foundation for scaling to 20-30 employees without system replacement

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-11-15 | 1.0 | Initial MVP PRD with maximum automation scope | John (PM) + Mary (Analyst) |

---

## Requirements

### Functional Requirements

**Core Entity Management:**
- **FR1:** System shall allow CRUD operations for Products with fields: name, internal code, category, manufacturer, cost price, sale price, description, single photo, current stock quantity, minimum stock threshold
- **FR2:** System shall allow CRUD operations for Customers with fields: name, CPF/CNPJ, phone, email, primary address, notes
- **FR3:** System shall allow CRUD operations for Suppliers with fields: name, CNPJ, contact info, products supplied, payment terms

**Inventory Management:**
- **FR4:** System shall track all inventory movements (in/out) with: product, quantity, movement type (purchase/sale/adjustment/return), reason, date/time, responsible user, and optional reference (invoice, order number)
- **FR5:** System shall automatically reduce stock when a sale is registered
- **FR6:** System shall calculate and display total inventory value in real-time using current stock quantities and cost prices
- **FR7:** System shall generate automatic alerts when product stock reaches defined minimum threshold
- **FR8:** System shall suggest reorder quantities based on last 30/60/90 days sales average
- **FR9:** System shall prevent sales of products with zero stock and suggest alternatives

**Commercial Workflow:**
- **FR10:** System shall support Quote creation with: customer selection, product selection with quantities, automatic total calculation, validity period, responsible salesperson
- **FR11:** System shall automatically generate professional PDF for quotes with company branding, sequential numbering, and all quote details
- **FR12:** System shall allow Quote to be converted to Order with single action, preserving all quote data
- **FR13:** System shall allow Order to be finalized as Sale, automatically triggering stock reduction
- **FR14:** System shall send quote PDF via email to customer (optional, triggered by user)
- **FR15:** Salespersons shall only see product availability (available/unavailable), not exact stock quantities

**Pricing Intelligence:**
- **FR16:** System shall automatically suggest sale price based on: cost price + desired margin % + estimated tax % + operational costs %
- **FR17:** System shall allow manual price override with automatic margin recalculation
- **FR18:** System shall track actual margin for each sale

**Role-Based Dashboards:**
- **FR19:** Owner Dashboard shall display: daily/weekly/monthly revenue, revenue vs previous period %, total inventory value, average margin %, top 5 most profitable products, critical alerts only
- **FR20:** Director Dashboard shall display: all KPIs, performance by salesperson, inventory movements (24h), pending quotes count, all alerts with details, action audit log, customizable reports
- **FR21:** Manager Dashboard shall display: products below minimum stock, pending quotes, daily sales total, pending tasks by team member, operational alerts
- **FR22:** All dashboards shall update in real-time when data changes

**Automation & Notifications:**
- **FR23:** System shall send daily email at 9:00 AM to Director with: previous day sales summary, current low stock products
- **FR24:** System shall send weekly email every Monday at 8:00 AM to Owner with: week summary, top 5 products, revenue, comparison to previous week
- **FR25:** System shall send monthly email on 1st day of month to Owner + Director with: comprehensive monthly report attachment
- **FR26:** System shall send real-time notification when: stock reaches minimum, quote requires approval, sale exceeds daily average, system backup completes/fails
- **FR27:** System shall send automatic email to customer when quote is created (optional feature)
- **FR28:** System shall detect anomalies and alert: sales drop >20% week-over-week, product unsold 60+ days, salesperson with no sales 3+ days

**Access Control:**
- **FR29:** System shall implement 6 user roles with distinct permissions: Owner (read-only executive view), Director (full access + approvals), Manager (operational CRUD), Salesperson (limited: products, quotes, own sales), Stock (inventory movements only), Technician (service orders, parts)
- **FR30:** System shall log all critical actions with: user, timestamp, action type, affected entity, before/after values (for edits)
- **FR31:** Salesperson discount >10% shall require Manager approval; discount >30% shall require Director approval
- **FR32:** System shall not display cost prices to Salesperson or Stock roles

**Backup & Data Security:**
- **FR33:** System shall perform automatic full backup daily at 2:00 AM
- **FR34:** System shall retain last 30 daily backups
- **FR35:** System shall upload backup to cloud storage automatically
- **FR36:** System shall send email confirmation of successful backup to Manager; failure alert to Director

**Reporting:**
- **FR37:** System shall generate sales reports with filters: date range, salesperson, product, customer
- **FR38:** System shall generate inventory movement reports with filters: date range, movement type, product
- **FR39:** System shall generate margin analysis report showing: product, total sales, total cost, margin %, quantity sold
- **FR40:** All reports shall be exportable to PDF and Excel formats

### Non-Functional Requirements

**Performance:**
- **NFR1:** Dashboard data shall load within 2 seconds on desktop browsers
- **NFR2:** Search operations (products, customers) shall return results within 1 second for databases up to 10,000 records
- **NFR3:** PDF generation shall complete within 5 seconds
- **NFR4:** System shall support concurrent usage by 10 users without performance degradation

**Scalability:**
- **NFR5:** Architecture shall support growth to 30 concurrent users without major refactoring
- **NFR6:** Database schema shall accommodate 100,000+ products, 50,000+ customers, 1M+ transactions

**Usability:**
- **NFR7:** Salesperson quote creation workflow shall be completable in maximum 5 clicks/steps
- **NFR8:** Owner dashboard shall be readable on mobile devices (responsive design)
- **NFR9:** All user-facing error messages shall be in Portuguese and actionable

**Reliability:**
- **NFR10:** System uptime shall be minimum 99.5% during business hours (8 AM - 6 PM local time)
- **NFR11:** Automatic backup shall have 99% success rate; failures shall trigger immediate alerts
- **NFR12:** Data loss tolerance: maximum 24 hours of data loss in disaster scenarios

**Security:**
- **NFR13:** User passwords shall be hashed using industry-standard algorithms (bcrypt, minimum cost factor 10)
- **NFR14:** All API endpoints shall require authentication except public-facing pages
- **NFR15:** Audit logs shall be immutable and retained for minimum 12 months
- **NFR16:** Session timeout shall be 2 hours of inactivity; forced re-login required

**Maintainability:**
- **NFR17:** Codebase shall have minimum 70% unit test coverage
- **NFR18:** All business logic shall be documented with inline comments
- **NFR19:** System shall use consistent coding standards enforced by linters
- **NFR20:** Database migrations shall be version-controlled and reversible

**Compliance:**
- **NFR21:** System shall comply with LGPD (Brazilian data protection law) for customer data storage and processing
- **NFR22:** Financial data shall be retained for minimum 5 years for tax compliance

---

## User Interface Design Goals

### Overall UX Vision

The EJR Organizador interface prioritizes **role-specific clarity and task efficiency**. Each user role sees only what they need, reducing cognitive load and increasing productivity. The design philosophy is "intelligent simplicity" - the system handles complexity behind the scenes while presenting clean, focused interfaces.

**Key Principles:**
- **Progressive Disclosure:** Show basic info by default, details on demand
- **Task-Oriented Layouts:** Each role's interface optimized for their primary workflows
- **Real-Time Feedback:** Immediate visual confirmation of actions
- **Guided Workflows:** Step-by-step processes for complex operations
- **Mobile-First for Executives:** Owner dashboard fully functional on smartphones

### Key Interaction Paradigms

**Dashboard-Centric Navigation:**
- All users land on their role-specific dashboard upon login
- Dashboard serves as mission control showing actionable items and key metrics
- Quick actions available directly from dashboard (e.g., "Create Quote" button for salespeople)

**Search-First for Operations:**
- Manager and operational roles use search as primary navigation
- Global search bar always visible, searches products/customers/orders
- Recent items and favorites for quick access

**Notification Center:**
- Bell icon with badge count showing unread notifications
- Notifications categorized by urgency (critical, warning, info)
- Click notification to jump directly to relevant context

**Inline Editing:**
- Data editable directly in tables/lists where permissions allow
- Auto-save with visual confirmation
- Undo functionality for accidental changes

### Core Screens and Views

**Authentication & Onboarding:**
1. **Login Screen** - Simple email/password, "Remember Me" option, password recovery link
2. **First-Time Setup Wizard** (Manager only) - Company info, initial product import, first user creation

**Owner Role:**
3. **Executive Dashboard** - Primary and only screen, all KPIs visible without scrolling on desktop
4. **Detailed Report View** - Drill-down from dashboard cards into historical charts and tables

**Director Role:**
5. **Director Dashboard** - Multi-tab interface (Overview, Sales, Inventory, People, Reports)
6. **Audit Log Viewer** - Filterable log of all system actions
7. **User Management** - CRUD for users, role assignment, permission management
8. **System Configuration** - Alert thresholds, email settings, backup schedule

**Manager Role:**
9. **Manager Dashboard** - Task-focused: pending approvals, low stock alerts, daily summary
10. **Product Management** - Product list with search/filter, product detail/edit form
11. **Customer Management** - Customer list, customer detail with purchase history
12. **Supplier Management** - Supplier list, supplier detail
13. **Inventory Movement Form** - Quick entry for stock in/out with validations

**Salesperson Role:**
14. **Sales Dashboard** - Personal metrics, pending quotes, quick actions
15. **Quote Builder** - Multi-step wizard: select customer → add products → review → generate
16. **Product Search** - Simplified product browser showing availability and prices only

**Stock Role:**
17. **Stock Dashboard** - Today's movements, low stock alerts, pending receiving
18. **Stock Movement Form** - Streamlined entry/exit recording

**Technician Role:**
19. **Service Dashboard** - Open service orders, parts needed
20. **Service Order Form** - Create/update service orders, parts usage

**Common Components:**
- **Global Header** - Logo, user menu, notifications, search (role-dependent)
- **Empty States** - Helpful guidance when lists/dashboards are empty
- **Loading States** - Clear feedback during async operations
- **Error States** - User-friendly error messages with recovery actions

### Accessibility

**Level: WCAG 2.1 AA Compliance**

**Specific Requirements:**
- Minimum contrast ratio 4.5:1 for normal text, 3:1 for large text
- All interactive elements keyboard-accessible with visible focus indicators
- Form inputs with associated labels and error messages
- Alternative text for all informative images
- Responsive text sizing (supports 200% zoom without horizontal scrolling)
- Color not used as sole method of conveying information

**Rationale:** AA compliance ensures usability for users with visual impairments and aligns with Brazilian accessibility legislation (LBI - Law 13.146/2015).

### Branding

**Brand Identity:**
- Company name: EJR Organizador
- Tagline: "Gestão Inteligente, Resultados Reais"
- Logo: To be provided (placeholder in development)

**Color Palette:**
- Primary: Professional blue (#2563EB) - trust, stability
- Secondary: Success green (#10B981) - positive actions, confirmations
- Alert: Warning amber (#F59E0B) - attention needed
- Danger: Alert red (#EF4444) - errors, critical alerts
- Neutral: Gray scale (#F3F4F6 to #1F2937) - backgrounds, text

**Typography:**
- Headers: Inter (sans-serif) - modern, clean
- Body: Inter (sans-serif) - high readability
- Monospace (for codes/numbers): JetBrains Mono

**Visual Style:**
- Clean, modern, professional
- Generous whitespace
- Subtle shadows for depth
- Rounded corners (4px-8px) for friendly feel
- Iconography: Heroicons (consistent, professional icon set)

### Target Device and Platforms

**Primary: Web Responsive**
- Desktop browsers (Chrome, Firefox, Safari, Edge) - latest 2 versions
- Tablet (iPad, Android tablets) - landscape and portrait
- Mobile smartphones - portrait primarily

**Responsive Breakpoints:**
- Mobile: 320px - 767px
- Tablet: 768px - 1023px
- Desktop: 1024px+

**Platform-Specific Optimizations:**
- **Mobile (Owner Dashboard):** Swipeable cards, large touch targets (minimum 44x44px), vertical scrolling
- **Tablet (Director/Manager):** Optimized for landscape, side-by-side panels
- **Desktop:** Multi-column layouts, hover states, keyboard shortcuts

**Future Considerations (Out of MVP Scope):**
- Native mobile apps (iOS/Android) for offline capability
- Progressive Web App (PWA) for install-to-home-screen experience

**Rationale:** Web-responsive covers all devices with single codebase, reducing development cost and maintenance. Owner specifically requested mobile access to dashboard, satisfied by responsive design.

---

## Technical Assumptions

### Repository Structure

**Monorepo**

**Rationale:** Monorepo approach chosen for MVP to:
- Simplify deployment coordination (frontend + backend + shared types deployed together)
- Enable code sharing (TypeScript interfaces shared between frontend/backend)
- Reduce complexity for 4-5 month development timeline
- Facilitate atomic commits across full-stack features

**Structure:**
```
/
├── apps/
│   ├── web/          # Frontend application
│   └── api/          # Backend API
├── packages/
│   ├── shared-types/ # TypeScript interfaces/types
│   ├── ui/           # Shared UI components
│   └── utils/        # Shared utilities
├── docs/             # Project documentation
└── tools/            # Build scripts, configs
```

### Service Architecture

**Monolith (Single Backend Service)**

**Rationale:**
- **Simplicity:** 10-user scale doesn't justify microservices complexity
- **Performance:** Reduced network overhead with in-process calls
- **Development Speed:** Faster iteration, easier debugging
- **Cost:** Single deployment target reduces infrastructure costs
- **Future Path:** Modular monolith structure allows future extraction to microservices if needed

**Architecture:**
- **Frontend:** Single-page application (SPA)
- **Backend:** RESTful API with modular domain structure
- **Database:** Single relational database (PostgreSQL)
- **File Storage:** Local filesystem with path to S3/cloud migration

**Modular Domains Within Monolith:**
- `products/` - Product catalog management
- `customers/` - Customer relationship management
- `inventory/` - Stock movements and tracking
- `sales/` - Quotes, orders, sales workflow
- `users/` - Authentication, authorization, user management
- `reports/` - Report generation and scheduling
- `notifications/` - Alert and email management

### Testing Requirements

**Unit + Integration Testing**

**Coverage Targets:**
- Business logic: 80% minimum coverage
- API endpoints: 70% minimum coverage
- UI components: 60% minimum coverage

**Testing Layers:**
1. **Unit Tests:**
   - Business logic functions (pricing calculations, stock validations)
   - Utility functions
   - Individual React components (isolated)

2. **Integration Tests:**
   - API endpoint tests (request → response, including database)
   - Workflow tests (quote creation → order → sale)
   - Authentication/authorization flows

3. **Manual Testing:**
   - End-to-end user workflows before each release
   - Cross-browser testing (Chrome, Firefox, Safari)
   - Responsive design testing (mobile, tablet, desktop)

**Out of Scope for MVP:**
- E2E automated testing (e.g., Playwright, Cypress)
- Performance testing
- Load testing

**Rationale:** Unit + Integration provides good confidence-to-cost ratio for MVP. E2E automation deferred to post-MVP as it requires significant setup and maintenance.

### Additional Technical Assumptions and Requests

**Language & Runtime:**
- **Frontend:** TypeScript + React 18+
- **Backend:** TypeScript + Node.js 20 LTS
- **Rationale:** TypeScript for type safety across stack, reducing bugs. React for rich UI. Node.js for JavaScript ecosystem and team familiarity.

**Database:**
- **Primary:** PostgreSQL 15+
- **Rationale:** Relational model fits business domain well. PostgreSQL offers reliability, JSONB for flexibility, and strong community support.

**ORM:**
- **Prisma**
- **Rationale:** Type-safe database access, excellent TypeScript integration, developer-friendly migrations.

**API Framework:**
- **Express.js** (or Fastify for performance)
- **Rationale:** Mature ecosystem, middleware availability, team familiarity. Fastify optional if performance benchmarks require.

**Authentication:**
- **JWT-based authentication** with HTTP-only cookies
- **Bcrypt** for password hashing (cost factor 12)
- **Rationale:** Stateless authentication scales well, cookies prevent XSS attacks on tokens.

**Frontend Framework & Tools:**
- **Vite** - Build tool (fast dev server, optimized production builds)
- **React Router** - Client-side routing
- **TanStack Query (React Query)** - Server state management, caching
- **Tailwind CSS** - Utility-first styling for rapid UI development
- **Headless UI** - Accessible component primitives

**State Management:**
- **React Context** for auth/user state
- **TanStack Query** for server state
- **No Redux/Zustand needed** for MVP scope
- **Rationale:** Minimal state management reduces complexity. TanStack Query handles most server state elegantly.

**PDF Generation:**
- **Puppeteer** (headless Chrome) or **PDFKit**
- **Rationale:** Puppeteer for HTML/CSS-to-PDF (design flexibility), PDFKit for programmatic generation if performance is critical.

**Email Sending:**
- **Nodemailer** with SMTP provider (e.g., SendGrid, AWS SES)
- **Rationale:** Reliable delivery, template support, delivery tracking.

**File Storage:**
- **MVP:** Local filesystem with organized directory structure
- **Future:** AWS S3 or compatible service
- **Rationale:** Local storage sufficient for MVP scale, path to cloud migration planned.

**Hosting & Deployment:**
- **Backend:** Linux VPS (e.g., DigitalOcean Droplet, Linode, AWS EC2 t3.small)
- **Database:** Managed PostgreSQL or self-hosted on same VPS
- **Frontend:** Nginx serving static build
- **Reverse Proxy:** Nginx
- **SSL:** Let's Encrypt (automated via certbot)
- **Rationale:** VPS provides control and cost-effectiveness for 10-user scale. Managed database optional for reduced ops burden.

**CI/CD:**
- **GitHub Actions** (or GitLab CI if using GitLab)
- **Automated:** Lint, test, build on pull requests
- **Deployment:** Semi-automated (manual approval, automated deploy script)
- **Rationale:** Free tier sufficient for small team, integrated with code repository.

**Monitoring & Logging:**
- **Application Logging:** Winston or Pino (structured JSON logs)
- **Error Tracking:** Sentry (free tier)
- **Uptime Monitoring:** UptimeRobot (free tier)
- **Rationale:** Essential visibility into production issues without significant cost.

**Development Tools:**
- **Code Quality:** ESLint + Prettier
- **Git Workflow:** Feature branches, pull requests, squash merges
- **Package Manager:** pnpm (fast, efficient, monorepo-friendly)

**Security:**
- **Rate Limiting:** Express-rate-limit on API endpoints
- **SQL Injection Protection:** Prisma parameterized queries
- **XSS Protection:** React auto-escaping + Content Security Policy headers
- **CSRF Protection:** SameSite cookies + CSRF tokens for state-changing operations

**Backup Strategy:**
- **Database:** Daily automated PostgreSQL dumps (pg_dump)
- **Files:** Daily rsync to remote backup location
- **Retention:** 30 days rolling backups
- **Storage:** Cloud storage (Backblaze B2 or AWS S3 Glacier for cost efficiency)

**Localization:**
- **Language:** Portuguese (Brazil) only for MVP
- **Date/Time:** Brazil timezone (America/Sao_Paulo), DD/MM/YYYY format
- **Currency:** BRL (R$)
- **Number Format:** Decimal comma (1.234,56)

**Performance Budget:**
- **Page Load:** < 3s on 3G connection
- **Time to Interactive:** < 5s
- **Lighthouse Score:** > 80 for Performance, Accessibility, Best Practices

---

## Epic List

The following epics deliver the EJR Organizador MVP in logical, sequential order. Each epic provides deployable, testable functionality that builds upon previous work.

### Epic 1: Foundation & Authentication
**Goal:** Establish project infrastructure, deployment pipeline, and secure user authentication system that enables role-based access.

**Deliverables:** Running application with login, user management, and basic dashboard skeleton for all roles.

---

### Epic 2: Core Entity Management
**Goal:** Enable CRUD operations for Products, Customers, and Suppliers, providing the foundational data required for all business operations.

**Deliverables:** Manager can create, view, edit, and delete products, customers, and suppliers. Data persisted in database and visible in respective management screens.

---

### Epic 3: Inventory Management
**Goal:** Implement complete inventory tracking with automated stock movements, real-time calculations, and intelligent alerting.

**Deliverables:** Stock movements recorded, inventory value calculated automatically, low-stock alerts generated, and stock levels updated in real-time.

---

### Epic 4: Sales Workflow
**Goal:** Enable complete quote-to-sale workflow with automated PDF generation, role-based validations, and stock integration.

**Deliverables:** Salespeople create quotes, Manager approves and converts to orders, sales completion triggers stock reduction, and all actions logged.

---

### Epic 5: Dashboards & Real-Time Analytics
**Goal:** Provide role-specific dashboards with real-time data, actionable insights, and automated alerts tailored to each user's responsibilities.

**Deliverables:** Owner sees executive summary, Director has full analytics and audit trail, Manager gets operational view, and all update in real-time.

---

### Epic 6: Automation & Notifications
**Goal:** Implement intelligent automation layer including scheduled reports, anomaly detection, automatic alerts, and workflow automations that reduce manual work.

**Deliverables:** Daily/weekly/monthly automated emails, intelligent alert system, automatic validations and approvals routing, and backup automation.

---

### Epic 7: Reporting & Data Export
**Goal:** Provide comprehensive reporting capabilities with customizable filters, multiple export formats, and margin analytics.

**Deliverables:** Sales reports, inventory reports, margin analysis, all with date/entity filters and PDF/Excel export.

---

### Epic 8: Polish, Performance & Production Readiness
**Goal:** Optimize performance, enhance UX with polish and refinements, complete security hardening, and ensure production-ready deployment.

**Deliverables:** Performance targets met, all security measures implemented, comprehensive testing completed, deployment automated, and system ready for production use.

---

**Rationale for Epic Structure:**

Each epic delivers end-to-end value:
- Epic 1 enables team to authenticate and see basic structure
- Epic 2 enables data entry (foundational for all other features)
- Epic 3 enables inventory control (core business need)
- Epic 4 enables revenue generation (quote and sell)
- Epic 5 enables management visibility (critical for leadership)
- Epic 6 reduces manual work through automation (efficiency gains)
- Epic 7 enables reporting and analysis (insights and compliance)
- Epic 8 ensures production quality (reliability and performance)

Cross-cutting concerns (logging, security, testing) flow through all epics rather than being isolated.

---

## Epic Details

### Epic 1: Foundation & Authentication

**Epic Goal:** Establish the technical foundation and deployment infrastructure for the EJR Organizador system. Deliver a secure, production-ready authentication system with role-based access control that will underpin all subsequent features. By epic completion, the team can deploy to production, users can log in with role-specific credentials, and basic dashboard skeletons are visible to all user types.

---

#### Story 1.1: Project Setup & Development Environment

**As a** Developer,
**I want** a fully configured monorepo development environment with all necessary tooling,
**so that** the team can begin feature development with consistent code quality and rapid feedback loops.

**Acceptance Criteria:**
1. Monorepo structure created with `apps/web`, `apps/api`, `packages/shared-types`
2. TypeScript configured for both frontend and backend with strict mode enabled
3. Pnpm workspace configured with shared dependencies hoisted
4. ESLint and Prettier configured with agreed-upon rules, enforced on pre-commit
5. Git repository initialized with .gitignore for Node.js, build artifacts, and environment files
6. README.md documents: how to install dependencies, run dev servers, run tests, build for production
7. Development servers start successfully: frontend on localhost:5173, backend on localhost:3000
8. Environment variable management configured using .env files with .env.example templates

---

#### Story 1.2: Database Setup & Schema Foundation

**As a** Developer,
**I want** a PostgreSQL database with Prisma ORM configured and initial schema for users,
**so that** I can persist user authentication data with type safety and managed migrations.

**Acceptance Criteria:**
1. PostgreSQL database created (local development instance)
2. Prisma installed and initialized in `apps/api`
3. Prisma schema defines `User` model with fields: id (UUID), email (unique), passwordHash, role (enum: OWNER, DIRECTOR, MANAGER, SALESPERSON, STOCK, TECHNICIAN), createdAt, updatedAt
4. Prisma schema defines `AuditLog` model with fields: id (UUID), userId (foreign key), action, entity, entityId, timestamp, changes (JSONB)
5. Initial migration created and applied to database
6. Prisma Client generated and importable in backend code
7. Database connection tested with simple query (e.g., User.count())
8. Seed script created to insert test users for each role (passwords: "password123")

---

#### Story 1.3: Backend API Foundation

**As a** Developer,
**I want** a Node.js Express API with routing, middleware, and error handling foundation,
**so that** I can build API endpoints with consistent patterns and robust error management.

**Acceptance Criteria:**
1. Express.js server initialized in `apps/api/src/index.ts`
2. Middleware configured: CORS (allow frontend origin), helmet (security headers), express.json (parse JSON bodies), morgan (request logging)
3. Global error handler middleware catches all errors and returns consistent JSON format: `{ error: { message, code, details? } }`
4. Health check endpoint `/api/health` returns `{ status: "ok", timestamp, version }` with 200 status
5. API versioning implemented (all routes under `/api/v1`)
6. Environment variables loaded from .env: PORT, DATABASE_URL, JWT_SECRET
7. Server listens on configured PORT with startup log message
8. Unhandled promise rejections and uncaught exceptions logged and exit gracefully

---

#### Story 1.4: Authentication System - Backend

**As a** System,
**I want** JWT-based authentication with secure password handling,
**so that** users can log in securely and subsequent requests are authenticated and authorized.

**Acceptance Criteria:**
1. POST `/api/v1/auth/login` endpoint accepts `{ email, password }` and returns `{ user: { id, email, role }, token }` with 200 if credentials valid, 401 if invalid
2. Passwords hashed using bcrypt with cost factor 12 before storing in database
3. JWT tokens signed with JWT_SECRET, include payload: `{ userId, role }`, expire in 24 hours
4. POST `/api/v1/auth/register` endpoint (Manager role only) accepts `{ email, password, role }` and creates new user, returns 201 with user object (excluding passwordHash)
5. Authentication middleware `verifyToken` extracts JWT from Authorization Bearer header, verifies token, attaches `req.user = { userId, role }` to request, returns 401 if token invalid/expired
6. Authorization middleware `requireRole(...roles)` checks `req.user.role` against allowed roles, returns 403 if unauthorized
7. GET `/api/v1/auth/me` endpoint (authenticated) returns current user's profile: `{ id, email, role }`
8. All password fields excluded from API responses (using Prisma select/omit)

---

#### Story 1.5: Frontend Foundation & Routing

**As a** Developer,
**I want** a React application with routing and authenticated layout structure,
**so that** I can build role-specific pages with protected routes.

**Acceptance Criteria:**
1. React app created in `apps/web` using Vite + TypeScript template
2. Tailwind CSS configured with custom color palette from design goals
3. React Router configured with routes: `/login`, `/dashboard/*` (protected)
4. AuthContext created providing: `{ user, login, logout, isAuthenticated, isLoading }`
5. ProtectedRoute component wraps dashboard routes, redirects to /login if not authenticated
6. API client utility configured (axios or fetch wrapper) with base URL from environment variable, automatic Authorization header injection from stored token
7. Token stored in localStorage (key: "auth_token"), loaded on app initialization
8. Login page UI created with email and password inputs, submit button, calls `login()` function
9. Successful login redirects to `/dashboard` (renders placeholder "Dashboard" heading)
10. Logout function clears token from localStorage and redirects to `/login`

---

#### Story 1.6: Role-Based Dashboard Skeletons

**As a** logged-in User,
**I want** to see a dashboard layout specific to my role upon login,
**so that** I can access features relevant to my responsibilities.

**Acceptance Criteria:**
1. Dashboard route `/dashboard` renders different components based on `user.role`:
   - OWNER → `<OwnerDashboard />` (placeholder showing "Owner Dashboard" heading)
   - DIRECTOR → `<DirectorDashboard />` (placeholder showing "Director Dashboard" heading)
   - MANAGER → `<ManagerDashboard />` (placeholder showing "Manager Dashboard" heading)
   - SALESPERSON → `<SalesPersonDashboard />` (placeholder showing "Salesperson Dashboard" heading)
   - STOCK → `<StockDashboard />` (placeholder showing "Stock Dashboard" heading)
   - TECHNICIAN → `<TechnicianDashboard />` (placeholder showing "Technician Dashboard" heading)
2. Each dashboard component includes shared header with: logo placeholder, user email, role badge, logout button
3. Header logout button calls `logout()` from AuthContext
4. Dashboard layout responsive: stacks vertically on mobile, horizontal header on desktop
5. All dashboard pages accessible after login without errors

---

#### Story 1.7: User Management (Director Role)

**As a** Director,
**I want** to view all users and create/edit user accounts,
**so that** I can manage system access for the team.

**Acceptance Criteria:**
1. GET `/api/v1/users` endpoint (Director only) returns array of all users: `[{ id, email, role, createdAt }]`
2. POST `/api/v1/users` endpoint (Director only) accepts `{ email, password, role }`, creates user, returns 201 with user object
3. PATCH `/api/v1/users/:id` endpoint (Director only) accepts `{ email?, role? }`, updates user, returns 200 with updated user
4. DELETE `/api/v1/users/:id` endpoint (Director only) soft-deletes or deletes user, returns 204
5. Director dashboard includes "User Management" link in navigation
6. User Management page (`/dashboard/users`) displays table: Email, Role, Created Date, Actions (Edit, Delete)
7. "Add User" button opens modal/form with inputs: email, password, role (dropdown), submit
8. Edit icon on user row opens modal pre-filled with user data, allows editing email and role
9. Delete icon prompts confirmation, then calls DELETE endpoint and refreshes list
10. Form validation: email format, password minimum 8 characters, required fields
11. Success/error notifications displayed after create/update/delete operations

---

#### Story 1.8: CI/CD Pipeline & Deployment

**As a** Developer,
**I want** automated testing and deployment pipeline,
**so that** code quality is maintained and deployments are reliable and repeatable.

**Acceptance Criteria:**
1. GitHub Actions workflow (or equivalent) configured to run on pull requests and main branch pushes
2. Workflow steps: install dependencies (pnpm), run linters (ESLint), run tests (if any exist at this stage), build frontend and backend
3. Workflow fails if linting errors or build errors occur
4. Deployment script created (`scripts/deploy.sh`) that: pulls latest code, installs dependencies, runs migrations, builds frontend, restarts backend service, serves frontend via Nginx
5. Production environment variables documented in .env.production.example
6. Nginx configuration template provided for reverse proxy setup (frontend static files, API proxy to backend)
7. SSL certificate setup documented (Let's Encrypt certbot instructions)
8. Deployment script tested on staging/production server, successful deployment verified
9. Health check endpoint `/api/health` returns 200 after deployment
10. Frontend accessible via HTTPS, login functional on production

---

### Epic 2: Core Entity Management

**Epic Goal:** Enable comprehensive CRUD operations for the three foundational business entities: Products, Customers, and Suppliers. This epic provides the data foundation that all subsequent features (inventory, sales, reporting) depend upon. By completion, Managers can fully manage the product catalog, customer base, and supplier relationships through intuitive interfaces with proper validation and error handling.

---

#### Story 2.1: Product Data Model & API

**As a** Backend System,
**I want** a complete Product data model with API endpoints,
**so that** product data can be created, retrieved, updated, and deleted programmatically.

**Acceptance Criteria:**
1. Prisma schema defines `Product` model with fields: id (UUID), name (string), internalCode (string, unique), category (string), manufacturer (string, optional), costPrice (decimal), salePrice (decimal), description (text, optional), photoUrl (string, optional), currentStock (integer, default 0), minimumStock (integer, default 0), isActive (boolean, default true), createdAt, updatedAt
2. Migration created and applied
3. GET `/api/v1/products` endpoint (authenticated, Manager+) returns array of products with pagination (query params: page, limit, search)
4. GET `/api/v1/products/:id` endpoint (authenticated) returns single product by ID, 404 if not found
5. POST `/api/v1/products` endpoint (Manager+) accepts product data, validates required fields, returns 201 with created product
6. PATCH `/api/v1/products/:id` endpoint (Manager+) accepts partial product data, updates product, returns 200 with updated product
7. DELETE `/api/v1/products/:id` endpoint (Manager+) soft-deletes product (sets isActive = false), returns 204
8. Validation errors return 400 with details: name required, internalCode unique, prices must be positive numbers
9. Search functionality filters products by name, internalCode, or category (case-insensitive)
10. Products sorted by name alphabetically by default

---

#### Story 2.2: Product Management UI (Manager)

**As a** Manager,
**I want** a user-friendly interface to manage products,
**so that** I can maintain an accurate and complete product catalog.

**Acceptance Criteria:**
1. Manager dashboard navigation includes "Products" link
2. Products page (`/dashboard/products`) displays table: Photo (thumbnail), Name, Internal Code, Category, Sale Price, Stock, Actions (Edit, Delete)
3. Table supports pagination (20 items per page) with Previous/Next buttons
4. Search bar above table filters products in real-time by name, code, or category
5. "Add Product" button opens modal/form with fields: name, internal code, category, manufacturer, cost price, sale price, description, minimum stock, photo upload
6. Photo upload accepts image files (jpg, png), displays preview, uploads to `/uploads/products/` directory, stores path in database
7. Edit button on row opens same modal pre-filled with product data
8. Delete button prompts "Are you sure?", then calls DELETE endpoint, shows success message, refreshes table
9. Form validation: name and internal code required, prices must be numbers > 0, duplicate internal code shows error
10. Calculated margin displayed: `((salePrice - costPrice) / salePrice * 100).toFixed(2)%` in read-only field
11. Success/error toasts shown for create/update/delete operations
12. Empty state shown when no products exist: "No products yet. Add your first product to get started."

---

#### Story 2.3: Customer Data Model & API

**As a** Backend System,
**I want** a complete Customer data model with API endpoints,
**so that** customer data can be managed and referenced in sales workflows.

**Acceptance Criteria:**
1. Prisma schema defines `Customer` model with fields: id (UUID), name (string), cpfCnpj (string, unique), phone (string), email (string, optional), addressStreet (string, optional), addressCity (string, optional), addressState (string, optional), addressZip (string, optional), notes (text, optional), createdAt, updatedAt
2. Migration created and applied
3. GET `/api/v1/customers` endpoint (authenticated) returns array of customers with pagination and search
4. GET `/api/v1/customers/:id` endpoint (authenticated) returns single customer, 404 if not found
5. POST `/api/v1/customers` endpoint (Manager+) creates customer, validates CPF/CNPJ format, returns 201
6. PATCH `/api/v1/customers/:id` endpoint (Manager+) updates customer, returns 200
7. DELETE `/api/v1/customers/:id` endpoint (Manager+) soft-deletes customer, returns 204
8. CPF/CNPJ validation function checks format (11 or 14 digits), returns 400 if invalid
9. Search filters by name, CPF/CNPJ, phone, or email
10. Customers sorted by name alphabetically

---

#### Story 2.4: Customer Management UI (Manager)

**As a** Manager,
**I want** a user-friendly interface to manage customers,
**so that** I can maintain accurate customer records for sales and reporting.

**Acceptance Criteria:**
1. Manager dashboard navigation includes "Customers" link
2. Customers page (`/dashboard/customers`) displays table: Name, CPF/CNPJ, Phone, Email, City, Actions (Edit, Delete)
3. Table supports pagination (20 per page) and search bar
4. "Add Customer" button opens form with fields: name, CPF/CNPJ, phone, email, address (street, city, state, ZIP), notes
5. CPF/CNPJ field validates format on blur, shows error if invalid
6. Edit button pre-fills form with customer data
7. Delete button prompts confirmation, then deletes and refreshes
8. Form validation: name and CPF/CNPJ required, email format validated if provided
9. Success/error toasts for all operations
10. Empty state: "No customers yet. Add your first customer."

---

#### Story 2.5: Supplier Data Model & API

**As a** Backend System,
**I want** a complete Supplier data model with API endpoints,
**so that** supplier data can be managed and referenced in inventory workflows.

**Acceptance Criteria:**
1. Prisma schema defines `Supplier` model with fields: id (UUID), name (string), cnpj (string, unique), contactName (string, optional), phone (string), email (string, optional), productsSupplied (text, optional), paymentTerms (text, optional), notes (text, optional), createdAt, updatedAt
2. Migration created and applied
3. GET `/api/v1/suppliers` endpoint (Manager+) returns array of suppliers with pagination and search
4. GET `/api/v1/suppliers/:id` endpoint (Manager+) returns single supplier, 404 if not found
5. POST `/api/v1/suppliers` endpoint (Manager+) creates supplier, validates CNPJ format, returns 201
6. PATCH `/api/v1/suppliers/:id` endpoint (Manager+) updates supplier, returns 200
7. DELETE `/api/v1/suppliers/:id` endpoint (Manager+) soft-deletes supplier, returns 204
8. CNPJ validation checks 14-digit format, returns 400 if invalid
9. Search filters by name, CNPJ, or contact name
10. Suppliers sorted by name alphabetically

---

#### Story 2.6: Supplier Management UI (Manager)

**As a** Manager,
**I want** a user-friendly interface to manage suppliers,
**so that** I can maintain supplier relationships and reference them during inventory receiving.

**Acceptance Criteria:**
1. Manager dashboard navigation includes "Suppliers" link
2. Suppliers page (`/dashboard/suppliers`) displays table: Name, CNPJ, Contact, Phone, Email, Actions (Edit, Delete)
3. Table supports pagination and search
4. "Add Supplier" button opens form with fields: name, CNPJ, contact name, phone, email, products supplied, payment terms, notes
5. CNPJ field validates format on blur
6. Edit and delete functionality similar to customers
7. Form validation: name and CNPJ required
8. Success/error toasts for all operations
9. Empty state: "No suppliers yet. Add your first supplier."

---

#### Story 2.7: Product Autocomplete & Quick Search

**As a** Salesperson or Manager,
**I want** fast product search with autocomplete,
**so that** I can quickly find products when creating quotes or checking inventory.

**Acceptance Criteria:**
1. Shared component `<ProductAutocomplete />` created for reuse across features
2. Component renders search input that triggers API call on typing (debounced 300ms)
3. GET `/api/v1/products/search?q=term` endpoint returns top 10 matching products: `[{ id, name, internalCode, salePrice, currentStock }]`
4. Dropdown shows results as: "Name (Code) - R$ Price - Stock: X units"
5. Clicking result triggers `onSelect(product)` callback
6. Keyboard navigation supported: arrow keys to navigate results, Enter to select, Escape to close
7. Loading indicator shown while searching
8. "No results" message when search returns empty
9. Recent searches remembered locally (last 5 searches) and shown when input focused (before typing)
10. Component used in quote creation workflow (next epic)

---

#### Story 2.8: Customer Autocomplete & Quick Search

**As a** Salesperson or Manager,
**I want** fast customer search with autocomplete,
**so that** I can quickly select customers when creating quotes or orders.

**Acceptance Criteria:**
1. Shared component `<CustomerAutocomplete />` created
2. Component renders search input, debounced API call to GET `/api/v1/customers/search?q=term`
3. Endpoint returns top 10 customers: `[{ id, name, cpfCnpj, phone }]`
4. Dropdown shows: "Name - CPF/CNPJ - Phone"
5. Keyboard navigation supported
6. onSelect callback passes selected customer
7. Loading and empty states
8. Recent customers remembered locally (last 5)
9. Component reusable across features

---

### Epic 3: Inventory Management

**Epic Goal:** Implement a comprehensive inventory tracking system that records all stock movements, calculates inventory value in real-time, generates intelligent alerts for low stock, and provides historical movement reports. This epic transforms the static product catalog into a dynamic inventory management system with automated calculations and proactive notifications that reduce stockouts and overstocking.

---

#### Story 3.1: Inventory Movement Data Model & API

**As a** Backend System,
**I want** a complete inventory movement tracking model with API,
**so that** all stock changes are recorded with full audit trail and real-time stock calculations.

**Acceptance Criteria:**
1. Prisma schema defines `InventoryMovement` model with fields: id (UUID), productId (FK to Product), movementType (enum: IN, OUT, ADJUSTMENT), quantity (integer), reason (string), referenceType (optional: PURCHASE, SALE, RETURN, ADJUSTMENT, TRANSFER), referenceId (optional UUID), userId (FK to User), notes (optional text), createdAt
2. Migration created and applied
3. POST `/api/v1/inventory/movements` endpoint (Manager, Stock roles) accepts: `{ productId, movementType, quantity, reason, referenceType?, referenceId?, notes? }`, creates movement record, returns 201
4. After creating movement, endpoint updates Product.currentStock: adds quantity if IN, subtracts if OUT, sets to quantity if ADJUSTMENT
5. Transaction ensures movement creation and stock update are atomic (both succeed or both fail)
6. GET `/api/v1/inventory/movements` endpoint (authenticated) returns movements with pagination, filters: productId, movementType, dateFrom, dateTo
7. GET `/api/v1/products/:id/movements` endpoint returns all movements for specific product, sorted newest first
8. Validation: quantity must be positive integer, productId must exist, movementType OUT requires sufficient stock (currentStock >= quantity), returns 400 if validation fails
9. Audit log created for each movement: action "INVENTORY_MOVEMENT", entity "Product", entityId, changes include before/after stock values
10. GET `/api/v1/inventory/value` endpoint (Manager+) calculates and returns total inventory value: sum of (currentStock * costPrice) for all active products

---

#### Story 3.2: Stock Movement Entry UI (Stock Role)

**As a** Stock handler,
**I want** a simple, fast interface to record inventory in/out,
**so that** I can keep stock levels accurate without complex navigation.

**Acceptance Criteria:**
1. Stock dashboard includes prominent "Record Movement" section
2. Movement form includes: product autocomplete, movement type (radio: IN / OUT), quantity (number input), reason (dropdown with common reasons + "Other"), notes (textarea, optional), submit button
3. Reason dropdown options for IN: "Purchase", "Return from Customer", "Adjustment - Found Extra", "Transfer In", "Other"
4. Reason dropdown options for OUT: "Sale", "Transfer Out", "Loss/Damage", "Adjustment - Correction", "Other"
5. After selecting product, current stock displayed: "Current Stock: X units"
6. If OUT selected and quantity > current stock, submit button disabled with error message: "Insufficient stock. Available: X units."
7. On successful submission: form clears, success toast shows "Movement recorded. New stock: X units", product autocomplete refocuses for next entry
8. On error: error toast shows validation message, form remains filled for correction
9. Stock dashboard shows "Recent Movements" table: Time, Product, Type (badge: IN green, OUT red), Quantity, Reason, New Stock (last 10 movements, auto-refreshes after new entry)
10. Mobile-optimized: large touch targets, numeric keypad for quantity input

---

#### Story 3.3: Inventory Value Dashboard (Manager, Director)

**As a** Manager or Director,
**I want** to see total inventory value and breakdown,
**so that** I can understand capital invested in stock and monitor high-value items.

**Acceptance Criteria:**
1. Manager and Director dashboards include "Inventory Value" card/widget
2. Widget displays: Total Inventory Value (R$ X,XXX), number of products, last updated timestamp
3. Widget fetches data from GET `/api/v1/inventory/value` on mount and every 30 seconds (auto-refresh)
4. Click on widget navigates to `/dashboard/inventory/value` detail page
5. Detail page shows table: Product Name, Cost Price, Current Stock, Total Value (cost * stock), sorted by Total Value descending
6. Table footer shows totals: sum of Total Value column
7. Table filterable by category (dropdown)
8. Export button generates Excel file with same data
9. Loading state shown while fetching data
10. If no products, shows empty state: "No products in inventory. Add products to track value."

---

#### Story 3.4: Low Stock Alert System

**As a** System,
**I want** to detect products below minimum stock and generate alerts,
**so that** Managers and Directors are proactively notified to reorder.

**Acceptance Criteria:**
1. Background job (cron or scheduled task) runs every hour, queries products where `currentStock <= minimumStock AND isActive = true`
2. For each low-stock product, check if alert already sent in last 24 hours (track in new `Alert` model: id, alertType, entityType, entityId, sentAt, resolvedAt)
3. If alert not recently sent, create alert record and add to notification queue
4. Alert includes: product name, internal code, current stock, minimum stock, suggested reorder quantity (based on 30-day average if available, else minimumStock * 2)
5. Notification displayed in Manager and Director dashboards: red badge on bell icon, "X low stock alerts" message
6. Clicking notification opens `/dashboard/inventory/alerts` page listing all active low-stock products
7. Alerts page shows table: Product, Current Stock, Minimum Stock, Suggested Reorder, Days Since Last Purchase (if available), Actions (Mark Ordered, Dismiss)
8. "Mark Ordered" button resolves alert (sets resolvedAt timestamp), removes from active list
9. "Dismiss" button also resolves alert
10. Alert automatically resolved when product stock updated above minimum threshold

---

#### Story 3.5: Reorder Suggestions Based on Sales History

**As a** Manager,
**I want** intelligent reorder quantity suggestions,
**so that** I can maintain optimal stock levels based on actual demand.

**Acceptance Criteria:**
1. GET `/api/v1/products/:id/reorder-suggestion` endpoint calculates suggested reorder quantity
2. Calculation logic: query all OUT movements for product in last 30, 60, 90 days, calculate average daily sales, multiply by lead time (default 7 days if not configured), add safety margin (20%), round up to nearest 5 or 10 units
3. If insufficient sales history (<5 sales), fallback to `minimumStock * 2`
4. Endpoint returns: `{ suggestedQuantity, calculationBasis: "30_DAY_AVERAGE" | "60_DAY_AVERAGE" | "90_DAY_AVERAGE" | "FALLBACK", averageDailySales?, estimatedDaysOfStock? }`
5. Low stock alerts page shows suggested quantity from this calculation
6. Product detail page (Manager view) shows reorder suggestion widget: "Based on recent sales, consider ordering X units. This provides approximately Y days of stock."
7. Suggestion updates when new sales recorded (calculation run on-demand, cached for 1 hour)
8. If product has seasonal variations, uses most recent 30 days for highest accuracy

---

#### Story 3.6: Inventory Movement History & Reporting

**As a** Manager,
**I want** detailed inventory movement reports,
**so that** I can audit stock changes and investigate discrepancies.

**Acceptance Criteria:**
1. Manager dashboard navigation includes "Inventory Reports" link
2. Inventory Reports page (`/dashboard/inventory/reports`) has filter form: Date Range (from/to datepickers, default last 30 days), Product (autocomplete, optional), Movement Type (dropdown: All / IN / OUT, default All), User (dropdown of Stock users, optional)
3. "Generate Report" button fetches movements matching filters from GET `/api/v1/inventory/movements`
4. Report table displays: Date/Time, Product, Type (badge), Quantity, Reason, User, Before Stock, After Stock, Notes
5. Table sortable by Date/Time (default newest first)
6. Table pagination (50 rows per page)
7. "Export to Excel" button generates Excel file with same data plus summary: total IN quantity, total OUT quantity, net change
8. Summary section above table shows: Total Movements, Total IN, Total OUT, Net Change, Date Range
9. Empty state if no movements in selected filters: "No movements found. Try adjusting filters."
10. Report generation completes within 2 seconds for 10,000 movements

---

#### Story 3.7: Stock Level Visualization (Manager Dashboard)

**As a** Manager,
**I want** visual overview of stock levels,
**so that** I can quickly identify issues and trends.

**Acceptance Criteria:**
1. Manager dashboard includes "Stock Overview" widget
2. Widget shows three sections: Critical (stock = 0), Low (0 < stock <= minimum), Healthy (stock > minimum)
3. Each section displays count and top 3 products (clickable, links to product detail)
4. Color coding: Critical (red background), Low (yellow), Healthy (green)
5. "View All" link in each section filters inventory page by that status
6. Widget auto-refreshes every 2 minutes
7. Hover tooltip on product shows: Current Stock, Minimum Stock, Last Movement Date
8. If no critical/low products, shows green checkmark: "All products adequately stocked"

---

#### Story 3.8: Prevent Negative Stock

**As a** System,
**I want** to enforce stock validation rules,
**so that** inventory integrity is maintained and negative stock is prevented.

**Acceptance Criteria:**
1. All OUT movements validated: if `movementType === OUT && quantity > product.currentStock`, return 400 error: "Insufficient stock. Available: X units. Requested: Y units."
2. Validation occurs in transaction before stock update committed
3. Sales workflow (Epic 4) also validates stock before finalizing sale
4. Stock role UI shows available stock and disables submit if quantity exceeds available
5. If race condition occurs (concurrent OUT movements), database constraint prevents negative stock: `CHECK (currentStock >= 0)` on Product table
6. If constraint violation, transaction rolls back, user receives error: "Stock no longer available. Please refresh and try again."
7. Manager dashboard shows audit report of attempted negative stock operations (from audit logs)

---

### Epic 4: Sales Workflow

**Epic Goal:** Implement the complete quote-to-sale workflow that enables salespeople to create professional quotes, managers to approve and convert to orders, and automated sale finalization with stock reduction. This epic delivers the core revenue-generating capability with PDF generation, email notifications, role-based validations for discounts, and comprehensive audit trails.

---

#### Story 4.1: Quote Data Model & Creation API

**As a** Backend System,
**I want** complete quote data models with creation API,
**so that** quotes can be created with line items and customer information.

**Acceptance Criteria:**
1. Prisma schema defines `Quote` model: id (UUID), quoteNumber (string, unique, auto-generated), customerId (FK), salesPersonId (FK to User), status (enum: DRAFT, PENDING, APPROVED, REJECTED, EXPIRED), subtotal (decimal), discountPercent (decimal, default 0), discountAmount (decimal, default 0), total (decimal), validUntil (date), notes (text, optional), createdAt, updatedAt
2. Prisma schema defines `QuoteItem` model: id (UUID), quoteId (FK), productId (FK), productName (string, snapshot), productCode (string, snapshot), quantity (integer), unitPrice (decimal, snapshot), subtotal (decimal, calculated), createdAt
3. Migrations created and applied
4. POST `/api/v1/quotes` endpoint (Salesperson+) accepts: `{ customerId, items: [{ productId, quantity }], discountPercent?, notes? }`, creates quote with auto-generated quoteNumber (format: "QT-YYYYMMDD-XXXX"), returns 201 with full quote including items
5. Quote creation transaction: validates all productIds exist, validates stock availability for all items (quantity <= currentStock), snapshots product name/code/price into QuoteItem, calculates subtotals (quantity * unitPrice), calculates quote total ((sum of subtotals) * (1 - discountPercent/100)), sets validUntil (7 days from creation), sets status DRAFT
6. If validation fails (product not found, insufficient stock), returns 400 with specific error
7. Quote number uniqueness enforced by database constraint
8. salesPersonId automatically set from authenticated user (req.user.userId)

---

#### Story 4.2: Quote Builder UI (Salesperson)

**As a** Salesperson,
**I want** an intuitive multi-step quote builder,
**so that** I can create accurate quotes quickly for customers.

**Acceptance Criteria:**
1. Salesperson dashboard includes "Create Quote" prominent button
2. Quote builder opens as multi-step wizard: Step 1 (Select Customer), Step 2 (Add Products), Step 3 (Review & Submit)
3. **Step 1:** Customer autocomplete component, "New Customer" quick-add button (opens inline mini-form: name, phone, CPF/CNPJ), "Next" button (disabled until customer selected)
4. **Step 2:** Product autocomplete to add items, added items shown in table: Product Name (Code), Unit Price, Quantity (editable number input), Subtotal (auto-calculated), Remove button
5. Quantity input validation: must be positive integer, cannot exceed available stock (show warning: "Only X units available")
6. Running subtotal shown: "Subtotal: R$ X.XX"
7. Discount field (percentage): if discount > 10%, shows warning badge: "Requires Manager approval", if discount > 30%, shows error: "Maximum discount 30% (requires Director approval via separate flow)"
8. Total after discount shown: "Total: R$ X.XX"
9. Notes textarea (optional)
10. **Step 3:** Review screen shows customer details, all items, subtotal, discount, total, validity date ("Valid until: DD/MM/YYYY"), "Submit" and "Back" buttons
11. "Submit" calls POST `/api/v1/quotes`, on success: shows success message with quote number, offers actions: "Generate PDF", "Send Email", "Create Another"
12. On error: shows error message, allows back to edit

---

#### Story 4.3: PDF Generation for Quotes

**As a** System,
**I want** to generate professional PDF documents for quotes,
**so that** salespeople can send polished quotes to customers.

**Acceptance Criteria:**
1. GET `/api/v1/quotes/:id/pdf` endpoint (authenticated, quote creator or Manager+) generates PDF and returns file stream with Content-Type: application/pdf
2. PDF includes: Company logo (placeholder), company name "EJR Organizador", quote number, date, validity date, customer name and contact info, salesperson name
3. PDF table shows quote items: Item #, Product Name, Code, Quantity, Unit Price, Subtotal (all values formatted with R$)
4. PDF footer shows: Subtotal, Discount (if any), Total
5. PDF includes notes section if notes provided
6. PDF footer includes: "Thank you for your business! Contact: [salesperson email/phone]"
7. PDF generated using Puppeteer with HTML/CSS template (styled for professional appearance)
8. PDF filename: "Quote-{quoteNumber}-{customerName}.pdf"
9. PDF generation completes within 5 seconds
10. Quote builder "Generate PDF" button downloads PDF immediately

---

#### Story 4.4: Email Quote to Customer

**As a** Salesperson,
**I want** to email quotes to customers directly from the system,
**so that** I can deliver quotes instantly without manual email composition.

**Acceptance Criteria:**
1. POST `/api/v1/quotes/:id/send-email` endpoint (authenticated, quote creator or Manager+) sends email to customer
2. Email recipient: customer email from Customer record, sender: configured FROM address (e.g., sales@ejrorganizador.com), subject: "Quote #{quoteNumber} - EJR Organizador"
3. Email body (HTML template): greeting ("Dear {customerName},"), message ("Attached is your quote #{quoteNumber} for review. This quote is valid until {validUntil}. Please contact {salespersonName} at {salespersonEmail} with any questions."), footer ("Best regards, EJR Organizador Team")
4. Email attachment: generated PDF (same as PDF endpoint)
5. Email sent using Nodemailer with configured SMTP provider
6. On success, returns 200: `{ message: "Email sent successfully" }`
7. On error (customer has no email, SMTP failure), returns 400/500 with error details
8. Quote builder "Send Email" button calls endpoint, shows loading spinner, then success/error toast
9. Email sending tracked in audit log
10. Quote model updated with sentAt timestamp when email successfully sent

---

#### Story 4.5: Quote Management Dashboard (Salesperson & Manager)

**As a** Salesperson or Manager,
**I want** to view and manage all quotes,
**so that** I can track quote status and follow up with customers.

**Acceptance Criteria:**
1. Navigation includes "Quotes" link
2. Quotes page displays table: Quote #, Customer, Salesperson (hidden for Salesperson viewing own), Date, Valid Until, Total, Status (badge with color-coding), Actions
3. Table filterable by: Status (dropdown: All / Draft / Pending / Approved / Rejected / Expired), Date Range, Salesperson (Manager only), Customer (autocomplete)
4. Table sortable by Date (default newest first), Total
5. Table pagination (20 per page)
6. **Salesperson sees:** only their own quotes
7. **Manager sees:** all quotes
8. Actions column buttons: View Details, Generate PDF, Send Email, Edit (draft only), Delete (draft only), Convert to Order (approved only)
9. Status badge colors: Draft (gray), Pending (yellow), Approved (green), Rejected (red), Expired (red)
10. Quote detail modal shows: full quote info, customer details, items table, timeline (created date/time, status changes, email sent timestamp)
11. Empty state: "No quotes yet. Create your first quote to get started."

---

#### Story 4.6: Quote Approval Workflow (Manager)

**As a** Manager,
**I want** to review and approve/reject quotes with discounts >10%,
**so that** I can control pricing and maintain margins.

**Acceptance Criteria:**
1. When quote created with discountPercent > 10%, status automatically set to PENDING (not DRAFT)
2. Manager dashboard shows "Pending Approvals" widget with count of pending quotes
3. Clicking widget navigates to Quotes page filtered by status PENDING
4. Quote detail modal for pending quotes shows "Approve" and "Reject" buttons
5. PATCH `/api/v1/quotes/:id/approve` endpoint (Manager+) sets status to APPROVED, returns 200
6. PATCH `/api/v1/quotes/:id/reject` endpoint (Manager+) sets status to REJECTED, optionally accepts `{ rejectionReason }`, returns 200
7. On approval: salesperson receives in-app notification "Quote #{quoteNumber} approved by {managerName}", automatic email sent to customer (optional config)
8. On rejection: salesperson receives notification "Quote #{quoteNumber} rejected: {reason}", quote remains editable to revise
9. Approved quotes show "Convert to Order" button
10. Audit log records approval/rejection with Manager user ID and timestamp

---

#### Story 4.7: Convert Quote to Order & Sale

**As a** Manager,
**I want** to convert approved quotes to orders and finalize as sales,
**so that** the sales workflow progresses from quote to revenue.

**Acceptance Criteria:**
1. Prisma schema defines `Order` model: id (UUID), orderNumber (string, unique, auto-generated format "ORD-YYYYMMDD-XXXX"), quoteId (FK, optional), customerId (FK), salesPersonId (FK), status (enum: PENDING, COMPLETED, CANCELLED), subtotal, discountPercent, discountAmount, total, paymentMethod (enum: CASH, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, PIX), paymentStatus (enum: PENDING, PAID), createdAt, completedAt (nullable)
2. Prisma schema defines `OrderItem` model: similar to QuoteItem
3. POST `/api/v1/orders/from-quote/:quoteId` endpoint (Manager+) creates order by copying quote data, returns 201 with order
4. Order creation: validates quote status is APPROVED, validates stock still available for all items, creates order with PENDING status, creates OrderItems snapshots, updates quote status to CONVERTED (new status)
5. If stock insufficient, returns 400: "Stock no longer available for {productName}. Available: X, Required: Y."
6. Order detail page shows: all order info, "Finalize Sale" button (if status PENDING)
7. "Finalize Sale" opens modal with: payment method dropdown (required), payment status toggle (Paid / Pending), "Complete Sale" button
8. POST `/api/v1/orders/:id/complete` endpoint (Manager+) accepts `{ paymentMethod, paymentStatus }`, updates order: sets status COMPLETED, sets completedAt timestamp, creates inventory OUT movements for all items (automatic stock reduction), returns 200
9. Stock reduction transaction ensures all items reduced atomically
10. Completed sale shows success message: "Sale completed! Order #{orderNumber}. Stock updated."

---

#### Story 4.8: Sales History & Reporting

**As a** Manager or Director,
**I want** comprehensive sales reports,
**so that** I can analyze revenue, performance, and trends.

**Acceptance Criteria:**
1. Navigation includes "Sales Reports"
2. Sales Reports page has filter form: Date Range (default last 30 days), Salesperson (dropdown, optional), Customer (autocomplete, optional), Payment Method (dropdown, optional)
3. "Generate Report" button fetches completed orders matching filters
4. Report shows summary cards: Total Sales (R$), Number of Sales, Average Ticket (total / count), Total Discount Given (sum of discountAmount)
5. Report table: Date, Order #, Customer, Salesperson, Items Count, Subtotal, Discount, Total, Payment Method
6. Table sortable by Date, Total
7. Table pagination
8. "Export to Excel" button generates Excel with same data plus summary sheet
9. Chart visualization (optional for MVP): daily sales trend line chart (total sales per day)
10. Report generation completes within 3 seconds for 10,000 orders

---

### Epic 5: Dashboards & Real-Time Analytics

**Epic Goal:** Build role-specific, real-time dashboards that provide actionable insights tailored to each user's responsibilities. Owner gets executive KPIs, Director gets operational control and audit visibility, Manager gets task-focused operational views, and all dashboards update in real-time as data changes. This epic transforms raw data into business intelligence accessible at a glance.

---

#### Story 5.1: Owner Dashboard - Executive KPIs

**As an** Owner,
**I want** a clean, high-level dashboard showing only key business metrics,
**so that** I can assess business health and trends without operational details.

**Acceptance Criteria:**
1. Owner dashboard (`/dashboard`) displays four primary metric cards in prominent row: Today's Revenue, This Week's Revenue, This Month's Revenue, Total Inventory Value
2. Each card shows: main value (large, bold, R$ formatted), comparison indicator (% vs previous period with up/down arrow and color: green if up, red if down), small trend sparkline chart (last 7 days for daily, last 4 weeks for weekly/monthly)
3. GET `/api/v1/analytics/owner-metrics` endpoint returns: `{ todayRevenue, todayVsPrevious, weekRevenue, weekVsPrevious, monthRevenue, monthVsPrevious, inventoryValue, revenueSparkline: [...] }`
4. "Top 5 Most Profitable Products" widget shows table: Product Name, Units Sold (this month), Revenue, Margin %, sorted by Revenue descending
5. GET `/api/v1/analytics/top-products?period=month&limit=5` returns data
6. "Critical Alerts" section shows only critical issues: low stock on high-revenue products (top 20% products by revenue with stock below minimum), sales drop >30% week-over-week
7. If no critical alerts, shows: "✓ No critical issues. All metrics healthy."
8. All data auto-refreshes every 60 seconds using polling or WebSocket
9. Dashboard fully responsive: stacks vertically on mobile, horizontal layout on tablet/desktop
10. Loading skeletons shown while data fetching

---

#### Story 5.2: Director Dashboard - Operational Control

**As a** Director,
**I want** a comprehensive multi-tab dashboard with all operational metrics and controls,
**so that** I can supervise all aspects of the business and drill into details as needed.

**Acceptance Criteria:**
1. Director dashboard has tabbed interface: Overview, Sales, Inventory, People, Audit Log
2. **Overview Tab:** shows same metrics as Owner plus: Pending Quotes (count, clickable), Low Stock Products (count, clickable), Users Online (count), System Health (green/yellow/red indicator)
3. **Sales Tab:** displays charts: revenue trend (last 30 days line chart), sales by salesperson (bar chart), sales by payment method (pie chart), table of recent orders (last 20)
4. **Inventory Tab:** shows: inventory value breakdown by category (bar chart), low stock alerts table (product, current stock, minimum, suggested reorder), recent movements table (last 20)
5. **People Tab:** displays: salesperson performance table (name, quotes created this month, sales completed, total revenue, conversion rate %), user list with last login timestamp
6. **Audit Log Tab:** filterable log of all critical actions: login/logout, user creation/deletion, quote approval/rejection, order completion, inventory adjustments, with filters: date range, user, action type
7. GET `/api/v1/analytics/director-overview` endpoint aggregates all overview data in single request (reduce API calls)
8. All charts interactive: hover shows exact values, click navigates to detailed view
9. Dashboard auto-refreshes every 30 seconds
10. "Export All Data" button (footer) generates comprehensive Excel workbook with all tabs

---

#### Story 5.3: Manager Dashboard - Task-Focused Operations

**As a** Manager,
**I want** a dashboard that highlights my actionable tasks and operational metrics,
**so that** I can prioritize my work and manage day-to-day operations efficiently.

**Acceptance Criteria:**
1. Manager dashboard divided into three sections: Action Items, Today's Summary, Inventory Alerts
2. **Action Items:** shows cards with counts: Pending Quote Approvals (clickable), Low Stock Products Needing Orders (clickable), Incomplete Orders (status PENDING for >24 hours, clickable)
3. Clicking action item card navigates to relevant page with filter applied
4. **Today's Summary:** shows: Sales Today (R$, count), Quotes Created Today (count), New Customers (count), Stock Movements (IN count, OUT count)
5. "Quick Actions" buttons: Create Quote, Add Product, Record Stock Movement (direct shortcuts to forms)
6. **Inventory Alerts:** table of products below minimum stock: Product Name, Current Stock, Minimum, Suggested Order Qty, Last Order Date (if available), "Mark as Ordered" button
7. "Mark as Ordered" button creates inventory movement of type IN with PENDING status and reason "Reorder Placed", removes from alerts
8. GET `/api/v1/analytics/manager-tasks` endpoint returns all action items and summary data
9. Dashboard auto-refreshes every 60 seconds
10. Mobile-optimized: large buttons, clear priorities, scrollable sections

---

#### Story 5.4: Real-Time Dashboard Updates

**As a** System,
**I want** dashboards to update in real-time when relevant data changes,
**so that** users always see current information without manual refreshing.

**Acceptance Criteria:**
1. **Option 1 (Polling):** Frontend dashboards poll relevant endpoints every 30-60 seconds (configurable per dashboard role), fetches new data, updates displayed values with smooth transition animations
2. **Option 2 (WebSocket - preferred if time allows):** Backend implements WebSocket server (Socket.io), frontend establishes WebSocket connection on dashboard mount, backend emits events when relevant data changes (e.g., "sale_completed", "stock_updated", "quote_created"), frontend listens for events and updates only affected widgets
3. For MVP, implement polling for simplicity and reliability; WebSocket can be post-MVP enhancement
4. When data updates, changed values highlighted briefly (e.g., 1-second yellow background fade) to draw attention
5. Update timestamp shown in dashboard footer: "Last updated: 2 minutes ago" (relative time, updates every 10 seconds)
6. "Refresh Now" button allows manual refresh
7. If API request fails (network error), shows non-intrusive warning banner: "Connection issue. Retrying..." without breaking dashboard
8. Dashboard pauses auto-refresh when user navigates away from tab (use Page Visibility API), resumes on return
9. Performance: dashboard updates do not cause full page re-renders, only affected components update
10. Loading indicators shown only on initial load, not on background refreshes

---

#### Story 5.5: Salesperson Personal Metrics Dashboard

**As a** Salesperson,
**I want** to see my personal sales performance and goals,
**so that** I can track my progress and stay motivated.

**Acceptance Criteria:**
1. Salesperson dashboard shows "My Performance" hero section with cards: This Month's Sales (R$), Quotes Created, Conversion Rate (%), Rank (e.g., "2nd out of 5 salespeople")
2. "Monthly Goal" progress bar: if monthly sales target configured, shows progress (e.g., "R$ 15,000 / R$ 25,000 (60%)"), with motivational message if close to goal: "You're almost there! Just R$ 10,000 to go!"
3. "My Recent Quotes" table: Quote #, Customer, Date, Status, Total, Actions (View, Edit if Draft, Send Email)
4. "My Recent Sales" table: Order #, Customer, Date, Total, Payment Status
5. "Top Customers" widget: shows top 5 customers by total purchases (from this salesperson), encourages repeat business
6. GET `/api/v1/analytics/salesperson-metrics/:userId` endpoint returns all personal metrics
7. Dashboard auto-refreshes every 60 seconds
8. "Create New Quote" prominent CTA button always visible
9. If no sales yet, shows motivational empty state: "Start selling! Create your first quote to track your performance."
10. Mobile-optimized for salespeople checking stats on-the-go

---

#### Story 5.6: Inventory Valuation & Category Breakdown

**As a** Manager or Director,
**I want** detailed inventory valuation with category breakdown,
**so that** I can understand where capital is invested and optimize stock allocation.

**Acceptance Criteria:**
1. Inventory dashboard page (`/dashboard/inventory/value`) shows total inventory value card (large, prominent)
2. "Value by Category" section shows bar chart: categories on X-axis, total value (R$) on Y-axis, sorted by value descending
3. Table below chart: Category, Product Count, Total Units, Total Value, % of Total Inventory
4. GET `/api/v1/analytics/inventory-by-category` endpoint aggregates products grouped by category: `[{ category, productCount, totalUnits: sum(currentStock), totalValue: sum(currentStock * costPrice) }]`
5. "Value by Manufacturer" optional secondary view (tab or toggle)
6. "Slow-Moving Inventory" section shows products with stock >30 days old (last movement >30 days ago), sortable by value
7. Filters: Category (multi-select), Manufacturer (multi-select), "Show Only Active Products" toggle
8. "Export to Excel" button
9. Chart interactive: click bar to filter table by category
10. Page updates when inventory movements occur (real-time or 60s polling)

---

#### Story 5.7: Sales Trend Analysis & Forecasting

**As a** Director,
**I want** sales trend visualizations and simple forecasting,
**so that** I can anticipate revenue and plan resources.

**Acceptance Criteria:**
1. Sales Analytics page (`/dashboard/sales/analytics`) shows line chart: X-axis daily dates (last 90 days), Y-axis revenue (R$)
2. Chart toggles: view by Day / Week / Month granularity
3. Chart shows two lines: Actual Sales (solid blue), Previous Period Comparison (dashed gray, e.g., if viewing last 30 days, comparison is 30 days before that)
4. Summary metrics above chart: Total Sales (selected period), Average Daily Sales, Growth % vs previous period, Best Day (highest revenue day)
5. "Simple Forecast" section: uses linear regression or moving average to project next 30 days revenue, shows: Forecasted Revenue (R$), Confidence level (Low/Medium/High based on data consistency)
6. Forecast calculation: if sales trend consistently upward/downward for last 30 days, confidence High; if erratic, Low
7. GET `/api/v1/analytics/sales-trend?days=90` endpoint returns daily sales data
8. GET `/api/v1/analytics/sales-forecast?days=30` endpoint returns forecast data
9. "Export Chart as PNG" button
10. Filters: Date Range (custom picker), Salesperson (multi-select), Product Category (multi-select)

---

#### Story 5.8: Audit Log Viewer with Advanced Filtering

**As a** Director,
**I want** comprehensive audit log with advanced filtering and search,
**so that** I can investigate issues, ensure compliance, and monitor user actions.

**Acceptance Criteria:**
1. Audit Log page (`/dashboard/audit`) displays table: Timestamp, User, Action, Entity Type, Entity ID, Details (expandable JSON), IP Address (if tracked)
2. Filters: Date Range (from/to datepickers), User (dropdown of all users), Action Type (dropdown: all audit log action types), Entity Type (Product, Customer, Order, etc.), Search (text search in Details JSON)
3. Table pagination (100 rows per page)
4. Table sortable by Timestamp (default newest first)
5. Row click expands to show full details including before/after values for edits
6. "Export to CSV" button (compliance/record-keeping)
7. Audit logs immutable: no edit or delete functionality
8. GET `/api/v1/audit-logs` endpoint with all filter query params
9. Logs retained for 12 months minimum (per NFR15)
10. Search performs well for 100,000+ log entries (database indexing on userId, action, entityType, timestamp)

---

### Epic 6: Automation & Notifications

**Epic Goal:** Implement the intelligent automation layer that reduces manual work and keeps users informed proactively. This includes scheduled email reports, anomaly detection with automatic alerts, workflow automations (approval routing, stock reduction on sale), and comprehensive notification system. By epic completion, the system "works by itself" with minimal human intervention for routine operations.

---

#### Story 6.1: Email Infrastructure & Template System

**As a** System,
**I want** a robust email sending infrastructure with reusable templates,
**so that** all automated emails are reliable, consistent, and professionally formatted.

**Acceptance Criteria:**
1. Email service class implemented in `apps/api/src/services/EmailService.ts` using Nodemailer
2. SMTP configuration loaded from environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM (sender address)
3. Email templates stored in `apps/api/src/templates/emails/` as Handlebars (.hbs) files with variables: `daily-summary.hbs`, `weekly-summary.hbs`, `monthly-report.hbs`, `low-stock-alert.hbs`, `quote-notification.hbs`
4. EmailService.send() method accepts: `{ to, subject, template, data }`, renders template with data, sends email via SMTP, logs send attempt (success/failure) to database
5. Email retry logic: if send fails (SMTP error), retry up to 3 times with exponential backoff (1s, 5s, 15s)
6. Failed emails logged to `EmailLog` table: id, to, subject, template, data, sentAt (nullable), failedAt, errorMessage, retryCount
7. GET `/api/v1/admin/email-logs` endpoint (Director only) shows email send history for debugging
8. Test endpoint POST `/api/v1/admin/test-email` (Director only) sends test email to verify SMTP configuration
9. Email templates include: professional header with logo, responsive HTML design (mobile-friendly), unsubscribe footer (placeholder link)
10. All emails tracked in audit log

---

#### Story 6.2: Daily Summary Email (Director & Manager)

**As a** Director or Manager,
**I want** to receive a daily email summarizing yesterday's performance,
**so that** I start each day informed without manually checking the system.

**Acceptance Criteria:**
1. Scheduled job (cron) runs every day at 9:00 AM server time
2. Job queries previous day's data (00:00 to 23:59 yesterday): total sales (R$), number of sales, average ticket, top 3 products sold, quotes created, new customers, low stock product count
3. For each user with role DIRECTOR or MANAGER, send email using `daily-summary.hbs` template
4. Email subject: "Daily Summary - [Yesterday's Date] - EJR Organizador"
5. Email content includes: greeting ("Good morning, {userName}"), summary metrics in clean table format, "Low Stock Alert" section (if any products below minimum, list top 5), CTA button "View Full Dashboard" (links to dashboard), footer
6. Email generation completes within 30 seconds (query optimization)
7. If no sales yesterday, email still sent with message: "No sales recorded yesterday. Review open quotes to follow up with customers."
8. Job logs execution: emails sent count, errors if any
9. GET `/api/v1/admin/scheduled-jobs` endpoint shows last run time and status of this job
10. Environment variable `DAILY_SUMMARY_ENABLED=true/false` to enable/disable feature

---

#### Story 6.3: Weekly Summary Email (Owner)

**As an** Owner,
**I want** to receive a weekly email every Monday with last week's performance,
**so that** I stay informed about business trends without daily details.

**Acceptance Criteria:**
1. Scheduled job runs every Monday at 8:00 AM
2. Job queries last week's data (Monday-Sunday): weekly revenue, revenue vs previous week (%), number of sales, average ticket, top 5 products by revenue, top salesperson (by revenue), inventory value snapshot, critical alerts count
3. Email sent to all users with role OWNER using `weekly-summary.hbs` template
4. Email subject: "Weekly Summary - [Week Date Range] - EJR Organizador"
5. Email includes: executive summary paragraph (1-2 sentences highlighting key insight, e.g., "Revenue up 15% vs last week driven by strong performance in Electronics category"), metrics table, trend chart image (optional: generated chart embedded as image), action items section (if any critical alerts), CTA "View Detailed Reports"
6. Email includes motivational tone: if revenue up, congratulatory message; if down, encouraging message with focus on opportunities
7. Job logs execution
8. Environment variable `WEEKLY_SUMMARY_ENABLED=true/false`
9. Email generation completes within 60 seconds
10. Email attached as PDF (optional enhancement: full report PDF attachment)

---

#### Story 6.4: Monthly Report Email (Owner & Director)

**As an** Owner or Director,
**I want** a comprehensive monthly report on the 1st of each month,
**so that** I can review the previous month's performance and plan ahead.

**Acceptance Criteria:**
1. Scheduled job runs on 1st of each month at 6:00 AM
2. Job generates comprehensive report for previous month: total revenue, number of sales, number of new customers, inventory value (start vs end of month), top 10 products by revenue, top 10 customers by purchases, salesperson performance ranking, profit margin analysis (if cost data available)
3. Email sent to OWNER and DIRECTOR roles using `monthly-report.hbs` template
4. Email subject: "Monthly Report - [Month Year] - EJR Organizador"
5. Email body: executive summary (key insights in paragraph form), high-level metrics, attachment: "Monthly-Report-[Month]-[Year].pdf" (detailed report PDF with charts and tables)
6. PDF report generated using Puppeteer, includes: cover page, summary page, detailed sales breakdown, inventory analysis, customer analysis, salesperson performance, recommendations section (system-generated suggestions based on data, e.g., "Consider promotions for slow-moving products in X category")
7. PDF generation completes within 2 minutes
8. Job logs execution, stores generated PDF in `reports/monthly/` directory for archival
9. GET `/api/v1/reports/monthly?month=YYYY-MM` endpoint allows downloading past monthly reports
10. Environment variable `MONTHLY_REPORT_ENABLED=true/false`

---

#### Story 6.5: Anomaly Detection & Automatic Alerts

**As a** System,
**I want** to automatically detect business anomalies and alert relevant users,
**so that** issues are identified proactively without manual monitoring.

**Acceptance Criteria:**
1. Scheduled job runs every hour, performs anomaly checks:
   - **Sales Drop Detection:** Compare last 24 hours sales to same 24-hour period last week; if drop >20%, create alert
   - **Product Stagnation Detection:** Identify products with stock >50 days old (no movements); if value >R$ 5,000, create alert
   - **Salesperson Inactivity:** If salesperson has created no quotes in last 72 hours, create alert
   - **Stock Discrepancy:** If inventory value change >30% day-over-day without corresponding movement count increase, create alert (possible error)
2. Alert record created in `Alert` table: id, alertType (enum: SALES_DROP, PRODUCT_STAGNATION, USER_INACTIVE, STOCK_DISCREPANCY, etc.), severity (LOW, MEDIUM, HIGH, CRITICAL), title, message, entityType, entityId, createdAt, resolvedAt (nullable), resolvedBy (FK to User, nullable)
3. HIGH and CRITICAL alerts immediately send in-app notification and email to Director
4. MEDIUM alerts send in-app notification to Manager
5. LOW alerts visible only in Alerts page (no email)
6. In-app notifications: bell icon badge count, notification dropdown lists recent alerts, click navigates to relevant entity or Alerts page
7. Alerts page (`/dashboard/alerts`) shows table: Severity, Type, Title, Created, Status (Active/Resolved), Actions (View Details, Resolve)
8. "Resolve" button opens modal with optional resolution notes, sets resolvedAt and resolvedBy, removes from active alerts
9. Anomaly detection logic configurable via admin settings (thresholds, enabled/disabled)
10. Alert emails use template `anomaly-alert.hbs` with clear title, description, recommended action, link to investigate

---

#### Story 6.6: Low Stock Automatic Alerts & Notifications

**As a** Manager,
**I want** automatic notifications when products reach low stock,
**so that** I can reorder before stockouts occur.

**Acceptance Criteria:**
1. Scheduled job (from Epic 3 Story 3.4) enhanced to send notifications in addition to creating Alert records
2. When product stock <= minimum stock, check if alert sent in last 24 hours; if not, create LOW_STOCK alert
3. Alert includes: product name, internal code, current stock, minimum stock, suggested reorder quantity (from Epic 3 calculation), supplier info (if associated)
4. In-app notification sent to Manager with message: "{ProductName} is low on stock. Current: X, Minimum: Y. Consider ordering Z units."
5. Email sent to Manager using `low-stock-alert.hbs` template, subject: "Low Stock Alert: {ProductName}"
6. Email includes: product details, current stock level, reorder suggestion, link to product management page, "Mark as Ordered" CTA (links to quick stock-in form pre-filled with product)
7. Notification clickable: navigates to Inventory Alerts page with product highlighted
8. Alert auto-resolves when stock updated above minimum threshold
9. If stock reaches 0, alert severity upgraded to CRITICAL, email sent to Director as well
10. Configurable: enable/disable low stock emails via settings, adjust check frequency (default hourly)

---

#### Story 6.7: Quote Approval Notification Workflow

**As a** Salesperson,
**I want** to be notified immediately when my quote is approved or rejected,
**so that** I can follow up with the customer promptly.

**Acceptance Criteria:**
1. When Manager approves quote (PATCH `/api/v1/quotes/:id/approve`), system triggers notification workflow
2. In-app notification sent to quote creator (salesperson): "Quote #{quoteNumber} approved by {managerName}. You can now convert to order."
3. Email sent to salesperson using `quote-approved.hbs` template, subject: "Quote #{quoteNumber} Approved"
4. Email includes: quote details, customer name, approval timestamp, next steps ("Convert this quote to an order to proceed with the sale"), CTA button "View Quote"
5. Notification clickable: navigates directly to quote detail page
6. When Manager rejects quote, similar notification sent with rejection reason (if provided): "Quote #{quoteNumber} rejected by {managerName}. Reason: {reason}"
7. Rejection email encourages revision: "You can edit and resubmit this quote with adjustments."
8. Audit log records notification sent
9. Notification marked as read when salesperson views quote detail page
10. Notification retention: last 30 days, older notifications archived

---

#### Story 6.8: Automatic Backup with Success/Failure Notifications

**As a** System,
**I want** automated daily backups with notifications on success or failure,
**so that** data is protected and issues are detected immediately.

**Acceptance Criteria:**
1. Scheduled job runs every day at 2:00 AM server time
2. Job executes database backup: `pg_dump` command creates SQL dump of PostgreSQL database, saves to `backups/db/backup-YYYY-MM-DD-HHMMSS.sql`
3. Job compresses backup file using gzip: `backup-YYYY-MM-DD-HHMMSS.sql.gz`
4. Job uploads backup to cloud storage (AWS S3 or configured provider) in bucket folder `ejr-backups/db/`
5. Job manages retention: deletes local backups older than 7 days, keeps last 30 backups in cloud
6. Job creates backup metadata record in `Backup` table: id, backupType (DATABASE), filePath, fileSize, createdAt, uploadedAt, status (SUCCESS, FAILED), errorMessage
7. On **success**: send email to Manager using `backup-success.hbs` template, subject: "Backup Completed - [Date]", content: confirmation message, backup file size, storage location
8. On **failure**: send HIGH severity alert and email to Director using `backup-failure.hbs` template, subject: "⚠️ Backup Failed - [Date]", content: error details, recommended action ("Check system logs and contact support if issue persists")
9. GET `/api/v1/admin/backups` endpoint lists all backups with download links
10. Manual backup trigger: POST `/api/v1/admin/backup/trigger` (Director only) initiates immediate backup

---

#### Story 6.9: Notification Center & Management

**As a** User,
**I want** a centralized notification center to view and manage all my notifications,
**so that** I never miss important alerts and can review history.

**Acceptance Criteria:**
1. Bell icon in global header shows unread notification count badge (red circle with number)
2. Clicking bell icon opens dropdown panel (max-height 400px, scrollable) showing last 20 notifications
3. Each notification shows: icon (based on type), title, message (truncated to 100 chars), timestamp (relative: "2 hours ago"), read/unread indicator (unread: bold text + blue dot)
4. Clicking notification marks as read, closes dropdown, navigates to relevant page (e.g., alert detail, quote page, product page)
5. Dropdown footer has "View All Notifications" link → navigates to `/dashboard/notifications` full page
6. Notifications page shows filterable table: Date, Type (icon + label), Message, Status (Read/Unread), Actions (Mark Read/Unread, Delete)
7. Filters: Type (multi-select: Low Stock, Quote Approval, Sale Completed, etc.), Status (All/Read/Unread), Date Range
8. "Mark All as Read" button (bulk action)
9. Real-time notifications: new notifications appear in bell dropdown without page refresh (polling every 30s or WebSocket)
10. Notification retention: 90 days, then soft-deleted

---

#### Story 6.10: System Health Monitoring & Alerts

**As a** Director,
**I want** automatic monitoring of system health with alerts on critical issues,
**so that** I can ensure uptime and address problems before users are affected.

**Acceptance Criteria:**
1. Health check endpoint `/api/health` (from Epic 1) enhanced to return detailed status: `{ status: "ok" | "degraded" | "down", timestamp, checks: { database: "ok", email: "ok", storage: "ok", backgroundJobs: "ok" } }`
2. Each check performs actual connectivity test: database query, SMTP connection test, file system write test, last job execution check (should be within expected interval)
3. External uptime monitoring service configured (UptimeRobot or similar, free tier) pings `/api/health` every 5 minutes
4. If health check returns non-200 status or `status: "down"`, uptime service sends alert to configured email (Director)
5. Internal monitoring job runs every 15 minutes, calls health check endpoint, if degraded or down, creates CRITICAL alert, sends email to Director
6. Alert email subject: "🚨 System Health Issue Detected", content: which component(s) failing, error details, timestamp, recommended action
7. System status page (`/dashboard/system-status`) shows: current status (big badge: Operational/Degraded/Down), component statuses (each check as separate card), uptime percentage (last 7 days, last 30 days), incident history table
8. If database down for >5 minutes, system enters "read-only mode" (if feasible): displays static error page with contact info
9. Background job monitoring: if critical jobs (backups, daily emails) fail 2 consecutive times, alert sent
10. All health issues logged to dedicated `SystemLog` table for post-mortem analysis

---

### Epic 7: Reporting & Data Export

**Epic Goal:** Provide comprehensive, flexible reporting capabilities across sales, inventory, and margin analytics. Enable users to filter reports by multiple dimensions (date, salesperson, product, customer), visualize data with charts, and export to multiple formats (PDF, Excel) for offline analysis and record-keeping. This epic delivers the analytical tools needed for business insights and compliance.

---

#### Story 7.1: Sales Report with Advanced Filters

**As a** Manager or Director,
**I want** detailed sales reports with flexible filtering,
**so that** I can analyze sales performance across various dimensions.

**Acceptance Criteria:**
1. Sales Reports page (`/dashboard/reports/sales`) has comprehensive filter panel: Date Range (from/to pickers, default last 30 days), Salesperson (multi-select dropdown, "All" option), Customer (autocomplete multi-select), Product Category (multi-select), Product (autocomplete multi-select), Payment Method (multi-select), Payment Status (multi-select: All/Paid/Pending)
2. "Generate Report" button fetches data from GET `/api/v1/reports/sales` endpoint with all filters as query params
3. Report summary section displays cards: Total Sales (R$), Number of Transactions, Average Ticket (R$), Total Discount Given (R$), Total Items Sold (quantity sum)
4. Report table shows: Date/Time, Order #, Customer Name, Salesperson, Items Count, Subtotal (R$), Discount (%), Total (R$), Payment Method, Payment Status
5. Table sortable by Date (default newest first), Total, Customer Name
6. Table pagination: 50 rows per page, total count shown
7. "Export to Excel" button generates Excel file with: summary sheet (all filter criteria + summary metrics), data sheet (all table rows), metadata (report generated date, user who generated)
8. "Export to PDF" button generates PDF report: header with company logo and report title, filter criteria summary, summary metrics, full table, footer with generation timestamp
9. Report generation optimized: completes within 5 seconds for 10,000 orders
10. Empty state if no results: "No sales found matching filters. Try adjusting date range or filters."

---

#### Story 7.2: Inventory Movement Report

**As a** Manager,
**I want** detailed inventory movement reports with audit trail,
**so that** I can track all stock changes and investigate discrepancies.

**Acceptance Criteria:**
1. Inventory Reports page (`/dashboard/reports/inventory`) has filter panel: Date Range, Product (autocomplete), Movement Type (All/IN/OUT/Adjustment), User (dropdown of Stock role users), Reason (dropdown based on movement type)
2. "Generate Report" button fetches from GET `/api/v1/reports/inventory-movements`
3. Report summary: Total Movements, Total IN (units), Total OUT (units), Net Change (units), Value Impact (R$, calculated as movement qty × product cost)
4. Report table: Date/Time, Product Name, Code, Movement Type (badge: IN green, OUT red, ADJUSTMENT yellow), Quantity, Reason, Reference (e.g., "Sale #ORD-123", "Purchase", "Adjustment"), User, Before Stock, After Stock, Notes
5. Table sortable by Date, Product Name, Quantity
6. Table pagination: 100 rows per page
7. "Export to Excel" includes summary and full data
8. "Export to PDF" includes company header, filters, summary, table
9. Report calculates stock accuracy: if adjustments >5% of total movements, shows warning: "High adjustment rate detected. Review stock counting procedures."
10. Report generation optimized for 50,000+ movement records

---

#### Story 7.3: Margin Analysis Report

**As a** Director,
**I want** profitability analysis showing margins by product, category, and salesperson,
**so that** I can identify most profitable areas and optimize pricing.

**Acceptance Criteria:**
1. Margin Analysis page (`/dashboard/reports/margin`) has filters: Date Range, Product Category, Salesperson, Product
2. "Generate Report" button fetches from GET `/api/v1/reports/margin-analysis`
3. Report summary displays: Total Revenue (R$), Total Cost (R$), Total Profit (R$), Average Margin (%), Highest Margin Product, Lowest Margin Product
4. **By Product Table:** Product Name, Category, Units Sold, Revenue (R$), Cost (R$), Profit (R$), Margin (%), sorted by Profit descending
5. **By Category Table:** Category, Units Sold, Revenue, Cost, Profit, Margin, sorted by Revenue descending
6. **By Salesperson Table:** Salesperson, Units Sold, Revenue, Avg Margin (%), Number of Sales, sorted by Revenue descending
7. Margin calculation: `((salePrice - costPrice) / salePrice) * 100`, aggregate at product/category/salesperson level
8. Visual indicators: Margin >40% (green text), 20-40% (yellow), <20% (red), <0% (loss, bold red)
9. Bar chart showing margin distribution: X-axis margin ranges (0-10%, 10-20%, ..., 90-100%), Y-axis product count in each range
10. Export to Excel includes all three tables (separate sheets) + summary + chart image

---

#### Story 7.4: Customer Purchase History Report

**As a** Manager,
**I want** to see complete purchase history for each customer,
**so that** I can understand customer behavior and identify opportunities.

**Acceptance Criteria:**
1. Customer detail page enhanced with "Purchase History" tab
2. Tab shows table: Date, Order #, Salesperson, Items (count), Total (R$), Payment Status, Actions (View Order)
3. Summary section: Total Purchases (R$), Number of Orders, Average Order Value (R$), First Purchase Date, Last Purchase Date, Recency (days since last purchase)
4. Customer lifetime value (LTV) calculated and displayed prominently
5. "Top Products Purchased" widget shows: Product Name, Times Purchased, Total Spent (R$)
6. Filter by Date Range (defaults to all-time)
7. "Export Customer Report" button generates PDF: customer details, summary, full purchase history, top products
8. If customer has made no purchases, shows: "No purchase history. This customer has not made any purchases yet."
9. Purchase history accessible from: customer detail page, customer list (action button), sales reports (click customer name)
10. Sorting: default newest first, can sort by Total

---

#### Story 7.5: Salesperson Performance Report

**As a** Director,
**I want** comprehensive salesperson performance reports,
**so that** I can evaluate productivity and provide targeted coaching.

**Acceptance Criteria:**
1. Salesperson Performance page (`/dashboard/reports/salespeople`) has filters: Date Range, Salesperson (multi-select, default All)
2. Report table: Salesperson Name, Quotes Created, Quotes Approved, Orders Completed, Total Sales (R$), Average Ticket (R$), Conversion Rate (orders/quotes %), Average Margin (%)
3. Table sortable by all columns
4. Leaderboard widget: ranks salespeople by Total Sales, displays top 3 prominently with badges (1st gold, 2nd silver, 3rd bronze)
5. Performance trend chart: line chart with X-axis weeks (last 12 weeks), Y-axis sales (R$), separate line for each salesperson (toggle visibility)
6. Comparison mode: select two salespeople, side-by-side comparison table of all metrics
7. Export to Excel includes: summary table, leaderboard, individual salesperson detail sheets (each salesperson gets own sheet with their full sales list)
8. Export to PDF includes: summary table, leaderboard, top 3 salespeople highlighted
9. Report accessible from Director dashboard "People" tab
10. If period has no sales, shows: "No sales data for selected period."

---

#### Story 7.6: Custom Report Builder (Stretch Goal)

**As a** Director,
**I want** to build custom reports by selecting fields and filters,
**so that** I can answer ad-hoc business questions without waiting for predefined reports.

**Acceptance Criteria:**
1. Custom Report Builder page (`/dashboard/reports/custom`) has three-step wizard: Step 1 (Select Data Source), Step 2 (Select Fields), Step 3 (Add Filters & Generate)
2. **Step 1:** Radio buttons to select data source: Sales, Inventory Movements, Products, Customers
3. **Step 2:** Checkbox list of available fields for selected source (e.g., for Sales: Date, Order Number, Customer Name, Salesperson, Product Names, Quantities, Prices, Totals, etc.), select columns to include in report
4. **Step 3:** Add filters (same filters as predefined reports for that data source), configure sorting, set row limit (max 10,000 rows)
5. "Preview Report" button shows first 20 rows in table
6. "Generate Report" button fetches full data from POST `/api/v1/reports/custom` with payload: `{ dataSource, selectedFields, filters, sort, limit }`
7. Report displayed in table format with selected columns
8. Export to Excel and CSV
9. "Save Report Configuration" button allows naming and saving custom report for reuse (stored in `SavedReport` table: id, userId, name, config JSON, createdAt)
10. "My Saved Reports" section lists saved configurations, click to re-run

---

#### Story 7.7: Excel Export with Formatting

**As a** User,
**I want** Excel exports with professional formatting,
**so that** reports are ready to share with stakeholders without manual cleanup.

**Acceptance Criteria:**
1. Excel exports use library (e.g., ExcelJS) for rich formatting
2. All exports include: header row with bold text and background color (company brand color), auto-sized columns (fit content), currency cells formatted as R$ with 2 decimals, date cells formatted DD/MM/YYYY, percentage cells formatted with %
3. Multi-sheet workbooks: summary sheet, data sheet, metadata sheet (generation date, filters applied, user who generated)
4. Freeze panes: header row frozen so columns visible when scrolling
5. Conditional formatting: margins color-coded (green/yellow/red), low stock highlighted in red
6. Charts embedded in Excel where applicable (e.g., margin analysis includes margin distribution chart)
7. Formulas preserved: total rows use SUM formulas, not static values
8. Excel file named descriptively: "Sales-Report-2025-01-15-to-2025-02-15.xlsx"
9. Export generation completes within 10 seconds for 5,000 rows
10. Download dialog with clear filename, opens directly in Excel when clicked

---

#### Story 7.8: PDF Reports with Company Branding

**As a** User,
**I want** PDF reports with professional branding and layout,
**so that** reports are suitable for presentations and external sharing.

**Acceptance Criteria:**
1. PDF exports use Puppeteer with branded HTML template
2. All PDFs include: header with company logo (left), report title (center), generation date (right), footer with page numbers ("Page X of Y"), footer with generation timestamp and user
3. Cover page (for multi-page reports like monthly report): company name, report title, date range, decorative graphic
4. Professional typography: clear headings (font size hierarchy), readable body text (min 10pt), tables with alternating row colors for readability
5. Charts rendered as high-quality images embedded in PDF
6. Page breaks optimized: tables don't split mid-row, sections start on new pages
7. Summary section always on first page (after cover if applicable)
8. PDF file named: "EJR-Organizador-Sales-Report-2025-01-15.pdf"
9. PDF generation completes within 15 seconds
10. PDF optimized for file size: <2MB for typical 20-page report

---

### Epic 8: Polish, Performance & Production Readiness

**Epic Goal:** Optimize system performance to meet NFR targets, enhance UX with polish and refinements, complete security hardening, implement comprehensive error handling, and ensure production-ready deployment with monitoring. This final epic transforms a functional MVP into a reliable, performant, and secure production system ready for daily business use.

---

#### Story 8.1: Performance Optimization - Frontend

**As a** User,
**I want** fast, responsive UI,
**so that** I can work efficiently without waiting for slow page loads.

**Acceptance Criteria:**
1. Lighthouse performance audit run on all major pages, target score >80
2. Code-splitting implemented: each dashboard role loaded as separate chunk (lazy loading), shared components in common chunk
3. Image optimization: product photos compressed and served in WebP format with fallback, thumbnails generated (max 200x200px) for lists
4. API request optimization: batch related requests (e.g., dashboard loads all widgets data in single endpoint call), implement request deduplication
5. List virtualization: tables with >50 rows use virtual scrolling (react-window or similar), only render visible rows
6. Debouncing on search inputs (300ms delay before API call)
7. Memoization of expensive calculations (React.memo, useMemo on charts, aggregations)
8. Bundle size analysis: total JS bundle <500KB gzipped, CSS <100KB
9. Performance metrics: Time to Interactive <5s on 3G, First Contentful Paint <2s, Largest Contentful Paint <3s
10. Performance regression tests: automated Lighthouse CI checks on pull requests, fails if score drops >10 points

---

#### Story 8.2: Performance Optimization - Backend

**As a** System,
**I want** optimized API response times,
**so that** frontend remains responsive even with growing data.

**Acceptance Criteria:**
1. Database query optimization: add indexes on frequently queried columns (productId, customerId, userId, createdAt on all tables), analyze slow queries with pg_stat_statements
2. N+1 query elimination: use Prisma `include` to fetch related data in single query, not in loops
3. Pagination implemented on all list endpoints with default limit 20, max limit 100
4. Caching layer: Redis cache for expensive calculations (inventory value, dashboard metrics), TTL 60 seconds, cache invalidated on data changes
5. Response compression: gzip enabled on all JSON responses >1KB
6. Connection pooling: Prisma connection pool configured (pool size 10), reuse database connections
7. Background processing: long-running operations (PDF generation, Excel export, email sending) moved to job queue (Bull or similar), return immediate response to frontend, poll for completion
8. API response time targets: GET requests <500ms (p95), POST requests <1s (p95), measured with APM tool (New Relic free tier or similar)
9. Database query time targets: simple queries <50ms, complex aggregations <200ms
10. Load testing: system handles 10 concurrent users with <1s average response time (tested with k6 or Artillery)

---

#### Story 8.3: Error Handling & User Feedback

**As a** User,
**I want** clear error messages and recovery guidance,
**so that** I understand what went wrong and how to fix it.

**Acceptance Criteria:**
1. Frontend global error boundary catches unhandled errors, displays user-friendly message: "Something went wrong. Please refresh the page. If the problem persists, contact support.", logs error to monitoring service
2. API errors return consistent format: `{ error: { code: "PRODUCT_NOT_FOUND", message: "Product with ID xxx not found", details?: {...} } }`, frontend displays message in toast notification
3. Form validation errors shown inline next to fields: red border, error icon, error text below field (e.g., "Email address is invalid")
4. Network error handling: if API request fails (network down), show retry button in toast: "Network error. [Retry]", retry up to 3 times
5. Loading states: buttons show spinner and "Loading..." text while async operation in progress, disabled to prevent double-submit
6. Success feedback: all create/update/delete actions show green success toast: "Product created successfully", auto-dismiss after 5 seconds
7. Confirmation dialogs for destructive actions: "Are you sure you want to delete this product? This action cannot be undone.", with "Cancel" (default) and "Delete" (red, destructive) buttons
8. Empty states with guidance: "No products yet. [Add Product] to get started.", with large icon, helpful text, primary action button
9. Offline detection: if user goes offline, show persistent banner: "You're offline. Changes will sync when connection is restored.", hide banner when online again
10. Error logs sent to monitoring service (Sentry) with context: user ID, action attempted, request payload (sanitized), browser/OS info

---

#### Story 8.4: Security Hardening

**As a** System,
**I want** comprehensive security measures,
**so that** user data and business operations are protected from threats.

**Acceptance Criteria:**
1. Rate limiting implemented on all API endpoints: 100 requests per 15 minutes per IP address (login endpoint: 5 requests per 15 minutes), returns 429 Too Many Requests if exceeded
2. SQL injection protection verified: all Prisma queries use parameterized queries (built-in protection), manual SQL (if any) uses prepared statements
3. XSS protection: React auto-escaping for all user input, Content Security Policy (CSP) headers configured: `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'`
4. CSRF protection: all state-changing requests (POST/PATCH/DELETE) require CSRF token (csurf middleware), token passed in request header
5. Input validation: all API endpoints validate input using schema validation library (Zod or Joi), reject invalid input with 400 and specific error
6. Authentication security: JWT tokens stored in HTTP-only cookies (not localStorage to prevent XSS), SameSite=Strict attribute, Secure flag (HTTPS only)
7. Password requirements enforced: minimum 8 characters, must include uppercase, lowercase, number, special character, reject common passwords (check against list)
8. Helmet.js configured: sets security headers (X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Strict-Transport-Security: max-age=31536000)
9. Dependency vulnerability scanning: npm audit run weekly, critical vulnerabilities patched within 7 days
10. Security audit: penetration testing checklist completed, common OWASP Top 10 vulnerabilities tested and mitigated

---

#### Story 8.5: Responsive Design Polish

**As a** User on any device,
**I want** optimized layouts for my screen size,
**so that** I can work comfortably whether on phone, tablet, or desktop.

**Acceptance Criteria:**
1. Mobile (320px-767px): all pages stack vertically, buttons full-width, tables scroll horizontally or display as cards, navigation collapses to hamburger menu, forms single-column
2. Tablet (768px-1023px): dashboards use 2-column layout, tables visible with horizontal scroll, forms 2-column where appropriate, navigation expanded
3. Desktop (1024px+): dashboards use 3-4 column grid, all tables fully visible, forms multi-column with logical grouping, sidebar navigation
4. Touch targets: all interactive elements minimum 44x44px on mobile (buttons, links, inputs), adequate spacing between clickable elements (8px minimum)
5. Typography responsive: font sizes scale with viewport (use CSS clamp()), readable on all devices (minimum 16px body text on mobile)
6. Images responsive: use srcset for different resolutions, load appropriate size based on device, product photos optimized for mobile bandwidth
7. Navigation: sticky header on scroll (desktop), collapsible sidebar (tablet), bottom tab bar or hamburger (mobile)
8. Forms: numeric inputs show numeric keyboard on mobile, date inputs show date picker, email/phone inputs show appropriate keyboard
9. Tables: on mobile, switch to card layout or horizontal scroll with sticky first column
10. Testing: manual testing on physical devices (iPhone, Android phone, iPad, various desktop resolutions), no broken layouts or inaccessible features

---

#### Story 8.6: Accessibility (WCAG 2.1 AA Compliance)

**As a** User with disabilities,
**I want** an accessible interface,
**so that** I can use the system regardless of my abilities.

**Acceptance Criteria:**
1. Color contrast: all text meets 4.5:1 ratio for normal text, 3:1 for large text (18pt+), verified with contrast checker tool
2. Keyboard navigation: all interactive elements accessible via Tab key, focus visible (blue outline), logical tab order, Escape key closes modals/dropdowns
3. Screen reader support: all images have alt text, form inputs have associated labels (not just placeholders), ARIA landmarks (header, nav, main, footer), ARIA labels for icon-only buttons
4. Focus management: after modal opens, focus trapped inside modal, after closing focus returns to trigger element
5. Error identification: form errors announced to screen readers (ARIA live regions), error messages associated with inputs (aria-describedby)
6. Headings hierarchy: proper H1-H6 structure (only one H1 per page, no skipped levels), headings describe content
7. Skip links: "Skip to main content" link at top of page (visible on focus), jumps to main content area
8. Form labels: all inputs have visible labels (not hidden), required fields indicated with * and ARIA required attribute
9. Tables: data tables have proper headers (th with scope), complex tables use caption
10. Automated testing: axe-core or similar tool integrated in CI, no critical accessibility violations, manual testing with screen reader (NVDA/JAWS)

---

#### Story 8.7: Production Deployment & Configuration

**As a** DevOps/System Administrator,
**I want** complete deployment documentation and automation,
**so that** I can deploy to production confidently and reproducibly.

**Acceptance Criteria:**
1. Production deployment checklist document created: prerequisites (server specs, PostgreSQL 15+, Node.js 20+, Nginx), step-by-step instructions, verification steps
2. Environment variables documented: complete .env.production.example file with all required variables, descriptions, and example values
3. Deployment script (`scripts/deploy-production.sh`) automates: git pull, pnpm install, database migration, frontend build, backend restart, Nginx config reload, health check
4. Database migration strategy: migrations run automatically on deploy, rollback script available if deploy fails
5. Zero-downtime deployment: use PM2 or similar process manager with cluster mode, restart backend with graceful shutdown (wait for ongoing requests)
6. SSL/TLS: Let's Encrypt certificate configured, auto-renewal enabled (certbot cron), all HTTP traffic redirects to HTTPS
7. Nginx configuration: reverse proxy for backend API, serve frontend static files with caching headers, gzip compression enabled, security headers configured
8. Systemd service: backend runs as systemd service (auto-start on reboot), logs to journalctl
9. Firewall configuration: UFW or iptables configured (allow 22/SSH, 80/HTTP, 443/HTTPS, block all others), PostgreSQL port not publicly exposed
10. Deployment tested on staging environment, smoke test checklist completed: login works, create product works, create quote works, dashboard loads

---

#### Story 8.8: Monitoring & Logging

**As a** Director,
**I want** comprehensive monitoring and logging,
**so that** I can detect and troubleshoot issues proactively.

**Acceptance Criteria:**
1. Application logging: Winston or Pino configured, structured JSON logs, log levels (error, warn, info, debug), logs written to files (error.log, combined.log), log rotation (max 7 days)
2. Error tracking: Sentry integrated (free tier), all unhandled errors automatically reported, source maps uploaded for readable stack traces
3. Uptime monitoring: UptimeRobot (or similar) configured, checks `/api/health` every 5 minutes, sends email alert on downtime, public status page URL available
4. APM (Application Performance Monitoring): basic metrics tracked (response times, error rates, throughput), dashboard accessible (New Relic free tier or self-hosted Grafana)
5. Database monitoring: PostgreSQL slow query log enabled (queries >1s logged), pg_stat_statements extension enabled, weekly review of slow queries
6. Disk space monitoring: alert when disk >80% full (cron job checks daily, sends email)
7. Log aggregation: logs from all sources (application, Nginx, PostgreSQL) centralized (option: self-hosted Loki or cloud service), searchable interface
8. Alerts configured: system down (uptime monitor), error rate spike (Sentry), database connection errors, backup failures, disk space critical
9. Monitoring dashboard: Grafana (or similar) shows: request rate, response times, error rate, database connections, CPU/memory usage (if infrastructure monitored)
10. On-call procedures documented: who to contact for critical issues, escalation path, how to access logs and monitoring

---

#### Story 8.9: User Acceptance Testing & Bug Fixes

**As a** Product Manager,
**I want** comprehensive UAT with real users,
**so that** we catch usability issues and bugs before launch.

**Acceptance Criteria:**
1. UAT plan created: test scenarios covering all major workflows (login, create product, create quote, record inventory, view dashboards, generate reports), acceptance criteria defined
2. UAT participants recruited: 1 user per role (Owner, Director, Manager, Salesperson, Stock, Technician), mix of technical and non-technical users
3. UAT sessions conducted: each user completes assigned scenarios, observers note issues and feedback, sessions recorded (with consent)
4. Feedback collected: usability issues, bugs, feature requests, pain points, positive feedback
5. Bugs triaged: P0 (critical, blocks workflow) fixed immediately, P1 (high, significant impact) fixed before launch, P2 (medium) scheduled for post-launch, P3 (low, cosmetic) backlog
6. Usability improvements implemented based on feedback: confusing labels clarified, common actions made more accessible, error messages improved
7. Regression testing: after all fixes, full test suite run to ensure no new issues introduced
8. Sign-off: all P0 and P1 bugs resolved, UAT participants re-test and approve, stakeholders (Owner, Director) approve for production launch
9. Known issues documented: any remaining P2/P3 bugs documented in release notes, workarounds provided if applicable
10. Post-launch support plan: dedicated support period (first 2 weeks), rapid bug fix deployment process, user feedback channel established

---

#### Story 8.10: Documentation & Training Materials

**As a** new User,
**I want** comprehensive documentation and training,
**so that** I can learn the system quickly and use it effectively.

**Acceptance Criteria:**
1. User manual created: separate guide for each role (Owner, Director, Manager, Salesperson, Stock, Technician), covers all features accessible to that role, includes screenshots
2. Quick start guides: one-page PDF for each role with most common tasks (e.g., Salesperson: "How to create a quote in 5 steps")
3. Video tutorials: 5-10 minute videos for key workflows (create quote, manage inventory, generate reports), hosted on YouTube or Vimeo, linked from help center
4. In-app help: "?" icons next to complex features, click opens tooltip or help article, help center accessible from user menu
5. FAQ document: common questions and answers based on UAT feedback and anticipated issues
6. Admin documentation: technical docs for Director on user management, system configuration, backup/restore, troubleshooting
7. Training sessions: live training conducted for each role (can be group session), recorded for future reference, Q&A addressed
8. Onboarding checklist: first-time users shown welcome tour (interactive walkthrough using library like Intro.js), highlights key features and navigation
9. Release notes: document new features, bug fixes, known issues, published with each release
10. Support contact: support email prominently displayed in footer and help center, expected response time communicated (e.g., "We respond within 24 hours")

---

## Next Steps

### UX Expert Prompt

Transform to the UX Expert agent using `*agent ux-expert` and execute: "Based on the EJR Organizador PRD (docs/prd.md), create a comprehensive front-end specification document that details: component hierarchy, responsive layouts for all screens, interaction patterns, accessibility implementation, and design system tokens. Focus on the role-specific dashboards (Owner, Director, Manager, Salesperson, Stock, Technician) ensuring each interface optimizes for its user's primary workflows."

### Architect Prompt

Transform to the Architect agent using `*agent architect` and execute: "Based on the EJR Organizador PRD (docs/prd.md), create a comprehensive architecture document that defines: system architecture (monorepo structure, monolithic backend with modular domains), technology stack details (React + TypeScript frontend, Node.js + Express backend, PostgreSQL database, Prisma ORM), API design (RESTful endpoints, authentication/authorization patterns), database schema with relationships, deployment architecture (VPS setup, Nginx configuration, backup strategy), and automation infrastructure (scheduled jobs, email system, notification service). Ensure the architecture supports all functional and non-functional requirements, particularly the automation workflows and real-time dashboard updates."

---

**Document Status:** Complete - Ready for Review
**Total Epics:** 8
**Total Stories:** 64
**Estimated Timeline:** 4-5 months (varies by team size and velocity)

