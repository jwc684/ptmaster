---
name: fix
description: "Analyze and fix build errors, type errors, or lint errors in the project"
---

# /fix - Auto Fix Errors

Analyze and fix errors in the project.

## Process

### 1. Identify Errors
- If argument provided, focus on that specific file/error
- If no argument, run `npx tsc --noEmit` to find type errors
- Then run `npm run lint` to find lint errors

### 2. Analyze Each Error
- Read the file containing the error
- Understand the context and root cause
- Consider the full error chain (one error may cause others)

### 3. Fix Errors
- Apply fixes in dependency order (fix root causes first)
- For type errors: check interfaces, imports, and Prisma types
- For lint errors: follow project ESLint config
- For build errors: check Next.js and Prisma configuration

### 4. Verify
- Re-run the check that found the error
- Confirm all errors are resolved

## Common Fixes in This Project
- Prisma type mismatches → Run `npx prisma generate`
- Missing imports → Check `@/` path aliases
- Zod v4 issues → `z.record(z.string(), z.unknown())`
- NextAuth types → Check module augmentation in `auth.ts`
- Json fields → Use `Prisma.InputJsonValue` cast

Fix: $ARGUMENTS
