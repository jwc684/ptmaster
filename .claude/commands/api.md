---
name: api
description: "Scaffold a new API route with auth, validation, and error handling following project patterns"
---

# /api - API Route Scaffolding

Create a new API route following the project's established patterns.

## Project API Pattern
- Location: `src/app/api/[resource]/route.ts`
- Auth: `getAuthWithShop()` from `@/lib/shop-utils`
- Validation: Zod schemas
- Multi-tenant: `buildShopFilter()` for queries
- Error format: `{ error: string }` with appropriate status code
- Success format: `{ message: string, data? }` with 200/201

## Template Structure
```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getAuthWithShop, buildShopFilter, requireShopContext } from "@/lib/shop-utils";

const schema = z.object({ /* fields */ });

export async function GET(request: Request) {
  const authResult = await getAuthWithShop();
  if (!authResult.isAuthenticated) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  // Role check, shop filter, query, return
}

export async function POST(request: Request) {
  // Auth, validate, create, return
}
```

## Rules
- Always include auth check as first step
- Always validate request body with Zod
- Always apply shop filter for multi-tenant isolation
- Use Korean error messages matching existing patterns
- Include role-based access control where appropriate
- Use Prisma transactions for multi-step mutations

Create the API route for: $ARGUMENTS
