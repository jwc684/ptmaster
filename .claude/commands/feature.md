---
name: feature
description: "Plan and scaffold a complete feature with page, API, components, and types"
---

# /feature - Feature Scaffolding

Plan and create all files needed for a complete feature.

## Feature Structure
A typical feature includes:
1. **API Route**: `src/app/api/[resource]/route.ts`
2. **Page**: `src/app/(dashboard)/[page]/page.tsx` (server)
3. **Client Component**: `src/app/(dashboard)/[page]/[page]-client.tsx`
4. **Types**: Interfaces in the component or `src/types/`
5. **Prisma Model**: If new data model needed in `prisma/schema.prisma`

## Process

### 1. Plan
- Enter plan mode to design the feature architecture
- Identify all files that need to be created or modified
- Define data models, API endpoints, and UI components
- Get user approval before implementation

### 2. Database (if needed)
- Add Prisma model to schema
- Run `npx prisma db push`
- Run `npx prisma generate`

### 3. Backend
- Create API route with auth, validation, CRUD operations
- Follow multi-tenant patterns (shop filter)

### 4. Frontend
- Create server page component (data fetching)
- Create client component (UI + interactions)
- Use existing UI components (shadcn/ui, IBM Carbon style)
- Korean labels, mobile-first responsive

### 5. Integration
- Add navigation link if needed
- Update types/interfaces
- Test the full flow

## Rules
- Always plan first, implement after approval
- Follow existing project patterns exactly
- Reuse existing components where possible
- Include proper error handling at every level

Feature request: $ARGUMENTS
