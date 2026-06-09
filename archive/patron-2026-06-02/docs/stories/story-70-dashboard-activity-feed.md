# Story 70 — Dashboard `<ActivityFeed>` with sub-agent tree (Devin-style)

**Epic:** Epic 4 — Web App
**Estimated:** ~2h
**Depends on:** story-68-dashboard-shell, story-52-erc8004-receipt-logging

## BDD Acceptance Criteria

```
Given a connected user is on /app/dashboard
When the activity feed renders
Then it shows the 20 most recent agent actions in reverse-chronological order
And each entry shows: timestamp (relative + absolute on hover), action type (e.g., "OpenPosition"), merchant (if applicable), reputation delta indicator, and a link to /audit/:txHash

Given an action has child sub-agent calls (e.g., OpenPosition called VerifyMerchant + CheckHealth + Execute)
When the user expands the parent entry
Then the child entries render indented underneath, with their own timestamps + statuses
And the expansion uses a 200ms ease-spring transition on `[height,opacity]` (NOT transition-all)

Given the feed renders
When the user filters by action type using the dropdown
Then only matching entries are shown

Given a new action arrives via Server-Sent Events
When the SSE event is received
Then the new entry is prepended to the feed with a brief --success highlight flash (300ms)

Given the user has no activity yet
When the feed renders
Then an empty state copy "Your agent's decisions will appear here as they happen." displays

Given Playwright runs apps/web/e2e/dashboard-activity.spec.ts
When the spec executes with mocked feed of 5 entries (1 with children)
Then 5 entries render in order, expanding the parent reveals children, filter works
```

## File modification map

- `apps/web/components/dashboard/ActivityFeedContainer.tsx` — NEW — `"use client"`; wraps `<ActivityFeed>` with data hooks + SSE subscription.
- `packages/ui/src/ActivityFeed/ActivityFeed.tsx` — NEW — pure render component; takes `entries: ActivityEntry[]`.
- `packages/ui/src/ActivityFeed/ActivityEntry.tsx` — NEW — single entry with expand/collapse for children.
- `packages/ui/src/ActivityFeed/ActivityFeed.test.tsx` — NEW — Vitest: render N entries, expand children, filter.
- `packages/ui/src/ActivityFeed/types.ts` — NEW — Zod schema `ActivityEntrySchema` (id, parentId?, type, merchantSlug?, txHash?, reputationDelta, ts, status, summary).
- `apps/web/lib/hooks/useActivityFeed.ts` — NEW — TanStack Query + EventSource for SSE on `GET /users/me/activity/stream`.
- `apps/web/app/app/dashboard/page.tsx` — UPDATE — include `<ActivityFeedContainer />` in the dashboard grid alongside `<PositionsList />`.
- `apps/web/e2e/dashboard-activity.spec.ts` — NEW — Playwright spec with mocked SSE.

## Shell verification

```bash
pnpm --filter @patron/ui test
pnpm --filter web build
test $? -eq 0

# ActivityFeed exported
grep -q "ActivityFeed" packages/ui/src/index.ts

# Sub-agent tree (children) supported in schema
grep -q "parentId" packages/ui/src/ActivityFeed/types.ts

# 400-LOC enforcement
wc -l packages/ui/src/ActivityFeed/ActivityFeed.tsx | awk '{ if ($1 > 400) exit 1 }'
wc -l packages/ui/src/ActivityFeed/ActivityEntry.tsx | awk '{ if ($1 > 400) exit 1 }'

# Playwright
pnpm playwright test apps/web/e2e/dashboard-activity.spec.ts
test $? -eq 0
```

## Notes

- **Anchor: Cognition Devin dashboard** — sub-agent fan-out tree with parent/child task visualization; time-axis filter; clear status indicators per task.
- This is THE feature that demonstrates "auditable agent" — judges see the agent's actual reasoning trail. Critical for demo-shape Stage 3.
- Use `<details>` + `<summary>` semantically OR a Radix Collapsible for parent/child entries — both keyboard-accessible.
- SSE endpoint is provided by Epic 2 backend (`/users/me/activity/stream`); if SSE isn't ready, fall back to TanStack Query polling at 5s interval and note as TODO.
- Reputation delta indicator: tiny pill — `+1` in --success or `-1` in --danger.
- Filter dropdown: action types (OpenPosition, RepayPosition, VerifyMerchant, MonitorDepeg, PersonalizeLimits, HandleDispute) — pulled from Epic 3 intent handler list.
- Animation: 200ms `cubic-bezier(0.32, 0.72, 0, 1)` per ux-spec --ease-spring.
- Banned Tailwind classes auto-checked (specifically `transition-all`).
- File size < 400 LOC per file enforced.
- Serves demo-shape Stage 3 critically — when Mantlescan shows tx confirmations, the dashboard activity feed adds the corresponding entry with receipt link.
