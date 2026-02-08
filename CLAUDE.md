# PT Master - Claude Code Project Instructions

## Project Overview
Multi-tenant PT(Personal Training) shop management system.
Roles: SUPER_ADMIN, ADMIN, TRAINER, MEMBER

## Tech Stack
- **Framework**: Next.js 16 (App Router) + React 19
- **Auth**: NextAuth v5 (beta.30) - Kakao OAuth + Credentials
- **DB**: Prisma 5.22 + PostgreSQL
- **UI**: Tailwind CSS 4 + Radix UI + shadcn/ui (IBM Carbon design)
- **Validation**: Zod v4
- **Language**: TypeScript 5 (strict mode)

## Project Structure
```
src/
  app/
    (auth)/          # Login, invite pages
    (dashboard)/     # Authenticated pages (layout with sidebar)
    api/             # API routes
  components/
    ui/              # shadcn/ui base components
    schedule/        # Schedule-related components
  hooks/             # Custom React hooks
  lib/               # Utilities (auth, prisma, kakao, shop-utils)
  types/             # Shared TypeScript types
prisma/
  schema.prisma      # Database schema
  seed.ts            # Seed data
```

## Common Commands
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run db:push      # Sync Prisma schema to DB
npm run db:migrate   # Create migration
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed database
```

## Key Conventions

### Code Style
- Korean UI text (labels, messages, errors)
- English code (variables, functions, comments when needed)
- Use `date-fns` with `ko` locale for date formatting
- Use `sonner` toast for user notifications
- Use `lucide-react` for icons

### API Patterns
- All API routes use `getAuthWithShop()` for auth + shop context
- Multi-tenant filtering via `buildShopFilter()`
- SUPER_ADMIN uses `x-shop-id` header for shop context
- Zod validation on all request bodies
- Return `{ error: string }` on failure, `{ message: string, data }` on success

### Database
- Prisma Json fields need `Prisma.InputJsonValue` cast
- Use `Prisma.JsonNull` for null Json values
- Always use transactions for multi-step mutations

### Auth
- JWT-based sessions with cookie-based impersonation
- `invite-token` cookie for invitation OAuth flow
- Public routes defined in `src/types/index.ts` PUBLIC_ROUTES

### UI Components
- shadcn/ui with IBM Carbon design system (no border-radius)
- `rounded-none` on all components
- Mobile-first responsive design
- Free PT schedules marked with `[무료]` prefix in notes

### Zod v4
- `z.record()` requires 2 args: `z.record(z.string(), z.unknown())`
