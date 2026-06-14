# Story — Next.js 15 app scaffold (App Router + Tailwind v4 + Biome)

**ID:** story-100-next-app-scaffold
**Epic:** Epic E7 — Web App
**Depends on:** story-24-sdk-config-loader
**Estimate:** ~45min
**Status:** PENDING

---

## User story

**As a** Concierge user
**I want to** the web app skeleton exists at `apps/web/` using Next.js 15 (App Router), Tailwind v4 (`@theme` CSS-first), and shadcn/ui (New York variant), with all the routing scaffolds for /, /app, /docs, /agent/[id]
**So that** every subsequent UI story has a known place to add components, and the routing structure matches the architecture's locked route shape

---

## File modification map

- `apps/web/package.json` — NEW — Next.js 15, React 19, Tailwind v4, peer deps on `@concierge-mantle/sdk`, `@concierge-mantle/shared`, `@concierge-mantle/agent` (read-only types)
- `apps/web/next.config.ts` — NEW — config with React strict mode, image domains for IPFS gateways
- `apps/web/tsconfig.json` — UPDATE (created in story-02) — extends base, adds Next.js plugin
- `apps/web/app/layout.tsx` — NEW — root layout with shared providers (PrivyProvider, QueryClient, Theme)
- `apps/web/app/page.tsx` — NEW — landing page placeholder (story-101 fills the hero)
- `apps/web/app/app/page.tsx` — NEW — `/app` dashboard placeholder
- `apps/web/app/app/layout.tsx` — NEW — auth-gated layout for /app/*
- `apps/web/app/docs/page.tsx` — NEW — `/docs` placeholder
- `apps/web/app/agent/[id]/page.tsx` — NEW — `/agent/[id]` placeholder
- `apps/web/app/api/auth/[...nextauth]/route.ts` — NEW — Privy session handler
- `apps/web/app/globals.css` — NEW — Tailwind v4 `@theme` directive + base styles
- `apps/web/lib/providers.tsx` — NEW — client-side provider tree (Privy + TanStack Query + Theme)
- `apps/web/components/ui/.gitkeep` — NEW — shadcn/ui components will be added here per future stories
- `apps/web/components.json` — NEW — shadcn config (New York variant, Tailwind v4, base color slate)
- `apps/web/.env.example` — UPDATE — Next.js client env vars (NEXT_PUBLIC_PRIVY_APP_ID, etc.)
- `apps/web/middleware.ts` — NEW — auth middleware for `/app/*` (redirect unauthenticated to landing)

---

## Acceptance criteria (BDD)

```
Given the package builds
When `pnpm --filter @concierge-mantle/web run build` runs
Then exit code is 0 AND the build output exists at `apps/web/.next/`

Given the dev server runs
When `pnpm --filter @concierge-mantle/web dev` runs
Then it serves at http://localhost:3000 AND `curl http://localhost:3000` returns 200

Given the routes are scaffolded
When the dev server is running, curl each route
Then `/`, `/docs`, `/agent/test-id` return 200; `/app` redirects to `/` (auth gate)

Given Tailwind v4 is configured
When inspecting globals.css
Then it contains `@theme` (NOT `@tailwind base` — Tailwind v4 syntax)

Given shadcn/ui is configured
When `bunx shadcn add button` runs
Then it succeeds and a `Button.tsx` file appears in `apps/web/components/ui/`

Given typecheck
When `pnpm --filter @concierge-mantle/web run typecheck` runs
Then exit code is 0

Given the Biome lint passes
When `bunx biome check apps/web/` runs
Then exit code is 0

Given the middleware
When an unauthenticated request hits `/app/*`
Then it redirects to `/?next=/app/...` with the intended path preserved

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd apps/web
test -f package.json
test -f next.config.ts
test -f app/layout.tsx
test -f app/page.tsx
test -f app/app/page.tsx
test -f app/docs/page.tsx
test -f app/agent/[id]/page.tsx
test -f app/globals.css
test -f components.json
test -f middleware.ts

cd ../..

pnpm --filter @concierge-mantle/web run build
test $? -eq 0
pnpm run typecheck

# Tailwind v4 syntax
grep -q "@theme" apps/web/app/globals.css

# shadcn New York variant
node -e "
  const c = require('./apps/web/components.json');
  if (c.style !== 'new-york') process.exit(1);
"

bunx biome check apps/web/
test $? -eq 0

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Next.js 15 App Router** is locked per architecture.md. No Pages Router; no Server Components avoidance. RSC by default; `'use client'` only where needed (interactive components).
- **Tailwind v4 syntax** uses `@theme` CSS-first declarations in `globals.css`. NOT `@tailwind base/components/utilities` (that's v3). Reference: tailwindcss.com/docs/upgrade-guide.
- **shadcn/ui New York variant** is the locked design system per CLAUDE.md anti-slop rules. NOT default; NOT custom. Designer agents work within this constraint.
- **Privy for auth** per Mantle hackathon ecosystem norms. Anthropic Claude users can sign in via email/social; wallet-connect later. PrivyProvider wraps the entire app.
- **TanStack Query** for server state. Used by data hooks (story-110 ticks, story-112 portfolio, etc.).
- **Auth gate via middleware** — Next.js 15 middleware runs on every request to `/app/*`; checks Privy cookie; redirects if absent. Preserves `?next=` for post-login redirect.
- **No business logic in scaffold.** This story creates the skeleton ONLY. Subsequent stories (101-115) fill components.
- Cross-ref: docs/architecture.md § Stack table + route shape.
