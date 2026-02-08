---
name: db
description: "Database operations - migrate, push, seed, studio, reset, or view schema"
---

# /db - Database Operations

Run the requested database operation. If no argument given, show current schema status.

## Operations
- `/db push` → `npx prisma db push` (sync schema without migration)
- `/db migrate` → `npx prisma migrate dev` (create migration)
- `/db seed` → `npx tsx prisma/seed.ts` (seed database)
- `/db studio` → `npx prisma studio` (open Prisma Studio)
- `/db reset` → `npx prisma migrate reset` (reset database - confirm first!)
- `/db generate` → `npx prisma generate` (regenerate client)
- `/db schema` → Read and display `prisma/schema.prisma`
- `/db status` → `npx prisma migrate status`

## Rules
- For `reset`, ALWAYS ask for user confirmation before executing
- After `push` or `migrate`, automatically run `generate`
- Show the command output to the user
- If an error occurs, analyze and suggest a fix

$ARGUMENTS
