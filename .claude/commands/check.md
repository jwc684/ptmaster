---
name: check
description: "Run lint, type check, and build to verify project health"
---

# /check - Project Health Check

Run all validation checks in sequence and report results.

## Steps
1. Run `npx tsc --noEmit` (type checking)
2. Run `npm run lint` (ESLint)
3. Run `npm run build` (production build)

## Rules
- Run checks sequentially (each depends on previous passing)
- If a check fails, stop and show the errors with analysis
- If a check fails, suggest specific fixes for each error
- At the end, show a summary: PASS/FAIL for each step
- Format: Type Check ✓ | Lint ✓ | Build ✓

$ARGUMENTS
