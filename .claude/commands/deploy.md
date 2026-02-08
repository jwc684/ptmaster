---
name: deploy
description: "Build, verify, and deploy to production (Render)"
---

# /deploy - Build & Deploy

Prepare and deploy the application to production.

## Steps

### 1. Pre-deploy Checks
- Run `npx tsc --noEmit` (type check)
- Run `npm run lint` (lint check)
- Run `npm run build` (production build)

### 2. Git Status
- Check for uncommitted changes
- Show current branch and last commit
- If there are uncommitted changes, ask user to commit first

### 3. Deploy
- Push to `main` branch (Render auto-deploys from main)
- `git push origin main`

### 4. Post-deploy
- Check Render deployment status using MCP tools if available
- Report success/failure

## Rules
- STOP if any pre-deploy check fails
- ALWAYS show what will be pushed before pushing
- If not on main branch, warn the user
- Never force push

$ARGUMENTS
