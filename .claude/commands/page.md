---
name: page
description: "Scaffold a new dashboard page with server component, client component, and proper layout"
---

# /page - Page Scaffolding

Create a new dashboard page following the project's established patterns.

## Project Page Pattern
- Location: `src/app/(dashboard)/[page-name]/page.tsx` (server component)
- Client: `src/app/(dashboard)/[page-name]/[page-name]-client.tsx` (client component)
- Server component fetches data, client component handles UI/interactions

## Server Component Template
```typescript
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageNameClient } from "./page-name-client";

export default async function PageName() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Fetch data with Prisma
  return <PageNameClient data={data} />;
}
```

## Client Component Template
```typescript
"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// IBM Carbon design: rounded-none, minimal shadows
```

## Rules
- Server components for data fetching, client components for interactivity
- Use shadcn/ui components with IBM Carbon style (rounded-none)
- Korean UI labels and messages
- Mobile-first responsive design
- Include proper TypeScript interfaces for props

Create the page for: $ARGUMENTS
