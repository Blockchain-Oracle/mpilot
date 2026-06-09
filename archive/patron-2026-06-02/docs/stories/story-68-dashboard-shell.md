# Story 68 — Dashboard shell at /app (sidenav + main + agent status indicator)

**Epic:** Epic 4 — Web App
**Estimated:** ~2h
**Depends on:** story-67-wagmi-rainbowkit-connect, story-62-shared-ui-package-bootstrap

## BDD Acceptance Criteria

```
Given a connected user navigates to /app
When the layout renders
Then it has a left sidenav (fixed) and a main content area (scrollable)
And the sidenav links: Dashboard (/app/dashboard), Agent (/app/agent), Merchants (/app/merchants), API keys (/api-keys)
And the top bar shows: Patron wordmark (left), agent status indicator (center), connected address pill + chain switcher (right)

Given the agent status indicator is rendered
When the user's agent is in "Active" state
Then a small green dot + label "Agent active" appears
And when the agent is "Frozen", a red lock icon + label "Agent frozen" appears
And the indicator is reactive to the freeze toggle from story-71

Given the user is on /app exactly
When the route resolves
Then it redirects to /app/dashboard

Given a non-connected user visits /app
When the layout mounts
Then they are redirected to /connect?next=/app (from middleware in story-67)

Given the sidenav is rendered on mobile (< 768px)
When the user taps the hamburger
Then a drawer opens with the same nav links

Given Playwright runs apps/web/e2e/dashboard-shell.spec.ts
When the spec executes
Then the sidenav, top bar, and "Agent active" status all render
And navigating between sidenav items updates the URL and content
```

## File modification map

- `apps/web/app/app/layout.tsx` — NEW — server component shell; wraps children in `<DashboardClient />`.
- `apps/web/app/app/page.tsx` — NEW — redirects to `/app/dashboard` via `redirect()`.
- `apps/web/components/dashboard/DashboardShell.tsx` — NEW — `"use client"`; renders sidenav + top bar + main slot.
- `apps/web/components/dashboard/Sidenav.tsx` — NEW — fixed left sidebar; uses Next `usePathname` to highlight active link.
- `apps/web/components/dashboard/TopBar.tsx` — NEW — wordmark + agent status indicator + address pill.
- `apps/web/components/dashboard/AgentStatusIndicator.tsx` — NEW — `"use client"`; reads agent state from a Zustand store or TanStack Query (`useAgentState()` hook).
- `apps/web/lib/hooks/useAgentState.ts` — NEW — TanStack Query hook fetching `GET /users/me/agent` from the API; returns `{ status: 'active' | 'frozen' | 'loading' }`.
- `apps/web/components/dashboard/MobileNavDrawer.tsx` — NEW — Radix Sheet for mobile; same links as sidenav.
- `apps/web/e2e/dashboard-shell.spec.ts` — NEW — Playwright spec.

## Shell verification

```bash
pnpm --filter web build
test $? -eq 0

# Layout files exist
test -f apps/web/app/app/layout.tsx
test -f apps/web/app/app/page.tsx

# Sidenav links present
grep -q '/app/dashboard' apps/web/components/dashboard/Sidenav.tsx
grep -q '/app/agent' apps/web/components/dashboard/Sidenav.tsx
grep -q '/app/merchants' apps/web/components/dashboard/Sidenav.tsx
grep -q '/api-keys' apps/web/components/dashboard/Sidenav.tsx

# Agent status indicator wired
grep -q "useAgentState" apps/web/components/dashboard/AgentStatusIndicator.tsx

# Playwright (with wallet stub)
pnpm playwright test apps/web/e2e/dashboard-shell.spec.ts
test $? -eq 0
```

## Notes

- **Anchor: Cleo + Lindy** — card-based agent activity feed, persistent agent status indicator at top, plain-language permission summary always visible.
- Sidenav fixed at 240px desktop / drawer mobile. Main content scrolls.
- Agent status indicator is the **single source of truth** for "is my agent running?" — judges glance once and know.
- Use Lucide React for icons (per architecture.md).
- `/app` redirect to `/app/dashboard` happens server-side via `redirect()` from `next/navigation`.
- This shell hosts stories 69-72 (positions list, activity feed, emergency freeze, permission summary) — they all render inside the main slot.
- Banned Tailwind classes auto-checked; no `divide-y` on the sidenav links (use explicit border-bottom).
- File size < 400 LOC per file enforced. The shell will be ~250 LOC; nav drawer + top bar are extracted into siblings.
- Serves demo-shape Stage 4 surface (where Emergency Freeze + permission summary live).
