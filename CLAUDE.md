# RACI Matrix SaaS Platform

Enterprise-grade RACI matrix application for world-class task assignment, workload analysis, and team collaboration.

## Project Structure

```
src/
  ├── app/              # Next.js App Router
  │   ├── (auth)/       # Protected routes (organizations, projects, matrices)
  │   ├── api/          # API endpoints (tRPC, realtime SSE, exports)
  │   ├── layout.tsx    # Root layout with providers
  │   ├── page.tsx      # Landing page
  │   └── globals.css   # Global styles & Tailwind
  ├── server/
  │   ├── api/
  │   │   ├── routers/  # tRPC routers (organization, matrix, task, assignment, etc.)
  │   │   ├── trpc.ts   # tRPC configuration & middleware
  │   │   └── root.ts   # Router composition
  │   └── auth.ts       # Authentication utilities (NextAuth)
  ├── lib/              # Business logic & utilities
  │   ├── validation/   # RACI validation rules (1 Accountable, ≥1 Responsible)
  │   ├── matrix/       # Matrix utilities & virtualization
  │   ├── analytics/    # Workload analysis calculations
  │   ├── export/       # PDF & Excel generators
  │   └── utils.ts      # Helper functions (cn, formatters)
  ├── components/
  │   ├── ui/           # shadcn/ui primitives (28 components)
  │   ├── raci/         # RACI matrix grid components
  │   ├── analytics/    # Dashboard & chart components
  │   ├── templates/    # Template system components
  │   ├── comments/     # Collaboration & comments
  │   └── shared/       # Shared components (org switcher, badges)
  ├── hooks/            # Custom React hooks
  └── env.js            # Environment variable validation (t3-oss)
prisma/
  ├── schema.prisma     # Complete RACI data model
  └── seed.ts           # Demo data seeding
tests/
  ├── unit/             # Vitest unit tests
  └── e2e/              # Playwright E2E tests
```

## Organization Rules

**Keep code organized and modularized:**
- API routes → `/src/server/api/routers/` (one router per domain)
- Business logic → `/src/lib/` (pure functions, no DB access)
- Components → `/src/components/ui/` for shadcn, `/src/components/[domain]/` for features
- Database queries → tRPC routers only (centralized data access)
- Tests → Next to the code they test or in `/tests`

**Modularity principles:**
- Single responsibility per file
- Clear, descriptive file names
- Group related functionality together
- Avoid monolithic files (keep under 300 lines)

## Code Quality - Zero Tolerance

After editing ANY file, run:

```bash
# 1. Type check (CRITICAL - catches 90% of bugs)
npm run typecheck

# 2. Lint (fix errors immediately)
npm run lint

# 3. Format check (optional but recommended)
npm run format:check
```

Fix ALL errors/warnings before continuing. No exceptions.

**After database schema changes:**
```bash
npm run db:push          # Push to database
npm run db:generate      # Regenerate Prisma client
npm run typecheck        # Verify no type errors
```

**If server changes require restart:**
1. Restart: `npm run dev`
2. Read terminal output/logs
3. Fix ALL warnings/errors before continuing

## Tech Stack

- **Next.js 16** (App Router, React 19, Turbopack)
- **TypeScript** (strict mode, full type safety)
- **tRPC v11** (end-to-end typesafe APIs)
- **Prisma 6** (PostgreSQL, type-safe ORM)
- **NextAuth 5.0** (authentication with bcrypt)
- **shadcn/ui** (accessible components)
- **Tailwind CSS** (utility-first styling)
- **@tanstack/react-virtual** (virtual scrolling for large matrices)
- **Recharts** (analytics dashboards)
- **Framer Motion** (smooth animations)

## RACI Validation Rules

1. **Exactly 1 Accountable** per task (enforced)
2. **At least 1 Responsible** per task (warning)
3. **Unique assignments** - One role per task+member
4. **Workload tracking** - Optional percentage (0-100)

## Multi-Tenancy

- **Organization-based isolation** - All queries filtered by `organizationId`
- **Consultancy super-admin** - Special access to all client organizations
- **Row-level security** - Middleware enforces tenant boundaries
- **Audit logging** - All mutations tracked for compliance

## Performance Targets

- Virtual scrolling for **200 tasks × 50 members** (10,000 cells)
- First contentful paint < 1.5s
- Time to interactive < 3s
- Lighthouse score > 90

## Development Workflow

1. Read existing code before modifying
2. Run quality checks after every change
3. Test in browser before committing
4. Never commit broken code
5. Update tests with code changes
