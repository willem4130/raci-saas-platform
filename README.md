# RACI Matrix SaaS Platform

> **Enterprise-grade RACI matrix application** - World-class task assignment, workload analysis, and team collaboration.

A comprehensive Next.js application for managing RACI (Responsible, Accountable, Consulted, Informed) matrices with multi-tenant architecture, real-time collaboration, and advanced analytics.

## 🎯 Key Features

- **Multi-Tenant Architecture** - Organization-based isolation with consultancy super-admin access
- **Flexible Task Organization** - Both parent-child hierarchy AND cross-cutting task groups
- **RACI Validation** - Automated validation (exactly 1 Accountable, ≥1 Responsible per task)
- **Virtual Scrolling** - Optimized for matrices up to 200 tasks × 50 members (10,000 cells)
- **Workload Analysis** - Real-time dashboards with bottleneck identification
- **Template System** - Import/export templates with selectable components
- **Comments & Collaboration** - Threaded comments with @mentions
- **Real-Time Updates** - Server-Sent Events (SSE) for live collaboration
- **Export Capabilities** - PDF and Excel export

## 🚀 Quick Start

### Prerequisites

- Node.js 20.x or later
- PostgreSQL 16
- npm or pnpm

### 1. Clone & Install

```bash
git clone https://github.com/willem4130/raci-saas-platform.git
cd raci-saas-platform
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
```

Edit `.env` with your database credentials and secrets:

```bash
# Generate NextAuth secret
openssl rand -base64 32

# Update DATABASE_URL with your PostgreSQL credentials
DATABASE_URL="postgresql://user:password@localhost:5432/raci_saas"
```

### 3. Set Up Database

```bash
# Push Prisma schema
npm run db:push

# Generate Prisma client
npm run db:generate

# (Optional) Seed demo data
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
```

Visit **http://localhost:3000**

## 📦 Tech Stack

### Frontend
- **Next.js 16** - App Router, React 19
- **TypeScript** - Strict mode, full type safety
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Accessible component library
- **@tanstack/react-virtual** - Virtual scrolling for large matrices
- **Recharts** - Analytics dashboards
- **Framer Motion** - Smooth animations

### Backend
- **tRPC v11** - End-to-end typesafe APIs
- **Prisma 6** - Type-safe ORM
- **PostgreSQL** - Primary database
- **NextAuth 5.0** - Authentication (email/password)
- **Zod** - Runtime validation
- **bcrypt** - Password hashing

### Infrastructure
- **Vercel** - Hosting + Edge Network
- **Neon PostgreSQL** - Serverless database
- **Vercel Analytics** - Privacy-friendly metrics
- **Sentry** (optional) - Error tracking

## 🏗️ Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Protected routes
│   ├── api/                      # API endpoints
│   └── ...
├── server/
│   ├── api/
│   │   ├── routers/              # tRPC routers
│   │   ├── trpc.ts               # tRPC configuration
│   │   └── root.ts               # Router composition
│   └── auth.ts                   # Authentication utilities
├── lib/                          # Business logic
│   ├── validation/               # RACI validation rules
│   ├── matrix/                   # Matrix utilities
│   └── ...
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── raci/                     # RACI matrix components
│   ├── analytics/                # Dashboard components
│   ├── templates/                # Template system
│   └── ...
└── hooks/                        # Custom React hooks

prisma/
└── schema.prisma                 # Database schema
```

## 🛠️ Available Scripts

### Development
```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Type check (CRITICAL)
```

### Database
```bash
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Create migration
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed demo data
```

### Testing
```bash
npm run test         # Run Vitest unit tests
npm run test:e2e     # Run Playwright E2E tests
```

## 📊 Data Model

### Core Entities

- **Organization** - Top-level tenant (CLIENT or CONSULTANCY type)
- **Member** - User membership in organization with role
- **Project** - Container for matrices
- **Matrix** - RACI matrix grid
- **Task** - Row in matrix (supports hierarchy + groups)
- **TaskGroup** - Cross-cutting categorization
- **Assignment** - RACI role assignment (R/A/C/I)
- **Template** - Reusable matrix templates
- **Comment** - Collaboration with @mentions

### RACI Validation Rules

1. **Exactly 1 Accountable** per task (enforced)
2. **At least 1 Responsible** per task (warning if missing)
3. **Unique assignments** - One role per task+member combination
4. **Workload tracking** - Optional capacity percentage (0-100)

## 🔒 Security Features

- HTTPS enforced (TLS 1.3)
- Password hashing with bcrypt
- SQL injection protection via Prisma
- XSS protection via Next.js escaping
- CSRF protection via NextAuth
- Row-level security (multi-tenant isolation)
- Audit logging for compliance
- Environment variables encrypted at rest

## 🚢 Production Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect repository in Vercel dashboard
3. Configure environment variables
4. Deploy!

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## 📖 Documentation

- [Implementation Plan](/.claude/plans/) - Complete 9-week roadmap
- [API Documentation](./API_DOCUMENTATION.md) - tRPC endpoints
- [Database Schema](./prisma/schema.prisma) - Full data model
- [CLAUDE.md](./CLAUDE.md) - Development guidelines

## 🤝 Contributing

See [CLAUDE.md](./CLAUDE.md) for development guidelines and code quality standards.

## 📝 License

MIT License - see [LICENSE](./LICENSE) for details.

---

**Built with ❤️ using Next.js 16, tRPC, and Prisma**
