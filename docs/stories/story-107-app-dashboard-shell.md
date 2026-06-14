# Story — `/app` dashboard shell (3-column layout + nav + agent switcher)

**ID:** story-107-app-dashboard-shell
**Epic:** Epic E7 — Web App
**Depends on:** story-100-next-app-scaffold, story-106-onboarding-flow
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** Concierge user with an activated agent
**I want to** the `/app` route renders a stable 3-column shell (left: agent switcher + nav, center: main content area, right: contextual side panel) with persistent layout across all /app/* sub-routes
**So that** my agent state stays visible (live tick status in the side panel) regardless of which sub-route I navigate to, and the navigation never reloads the whole page

---

## File modification map

- `apps/web/app/app/layout.tsx` — UPDATE (created in story-100) — replaces placeholder with the 3-column shell that wraps all /app/* routes
- `apps/web/app/app/page.tsx` — UPDATE — the dashboard home (default route at /app)
- `apps/web/components/dashboard/Shell.tsx` — NEW — the 3-column container with resize-aware behavior
- `apps/web/components/dashboard/LeftNav.tsx` — NEW — agent switcher + primary nav (Overview / Activity / Settings / Reputation)
- `apps/web/components/dashboard/AgentSwitcher.tsx` — NEW — dropdown of the user's agents (one per chain typically)
- `apps/web/components/dashboard/SidePanel.tsx` — NEW — right column with the live tick status; switchable to chat panel
- `apps/web/components/dashboard/__tests__/Shell.test.tsx` — NEW — RTL test for layout + responsive behavior

---

## Acceptance criteria (BDD)

```
Given a user with an active agent navigates to /app
When the page renders
Then the 3-column Shell wraps the dashboard home; LeftNav + main area + SidePanel are all visible

Given the user navigates from /app → /app/activity → /app/settings
When each navigation occurs
Then the Shell does NOT re-render (verified by spy on Shell's render count); only the main area's content updates

Given a user has 2 agents
When the AgentSwitcher is opened
Then both agents appear in the dropdown with chain badges (mainnet/sepolia)

Given the user selects a different agent
When the switch is committed
Then the URL updates to `/app?agentId=<new>` AND the SidePanel reflects the new agent's tick status

Given the page is responsive at 768px (tablet)
When viewed
Then the SidePanel collapses to a toggleable drawer (NOT hidden — still accessible)

Given the page is responsive at 375px (mobile)
When viewed
Then the LeftNav becomes a hamburger; the SidePanel is hidden; main content is full-width

Given no active agent
When the user lands on /app
Then they are redirected to /app/onboarding/connect (start the flow)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd apps/web
test -f components/dashboard/Shell.tsx
test -f components/dashboard/LeftNav.tsx
test -f components/dashboard/AgentSwitcher.tsx
test -f components/dashboard/SidePanel.tsx

cd ../..

pnpm --filter @concierge-mantle/web run build
test $? -eq 0

# Redirect when no agent
grep -qE "(redirect.*onboarding|/app/onboarding)" apps/web/app/app/page.tsx

# Tests pass
pnpm --filter @concierge-mantle/web run test 2>&1 | grep "Shell" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Layout stability is non-negotiable.** Per Next.js 15 nested layouts: the `app/layout.tsx` wraps `/app/*`; navigating between sub-routes does NOT re-mount it. This is what makes the SidePanel's live tick stream stay live across navigation.
- **The AgentSwitcher is in the URL** (`?agentId=...`), not in component state. URL-as-state lets users bookmark/share specific agent views.
- **Mobile drawer for SidePanel**, NOT hidden. Hidden means inaccessible; drawer means tap-to-open. Per accessibility contract in `research/concierge/08-ux-component-intent.md`.
- **No agent → redirect** is the canonical pattern. Don't show an empty dashboard with a "create agent" CTA — too many decision steps; just redirect to onboarding.
- **Three columns at desktop, two at tablet (collapsed side panel), one at mobile.** Standard responsive shell pattern.
- Cross-ref: `research/concierge/08-ux-component-intent.md` § dashboard shell, story-108 (the live tick stream lives in SidePanel).
