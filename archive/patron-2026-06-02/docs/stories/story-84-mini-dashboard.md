# Story 84 — Mini App dashboard (/)

**Epic:** Epic 5 — Telegram Mini App
**Estimated:** ~2h
**Depends on:** story-83-mini-onboarding, story-69-dashboard-positions-list, story-70-dashboard-activity-feed, story-71-dashboard-emergency-freeze, story-72-dashboard-permission-summary

## BDD Acceptance Criteria

```
Given an authenticated user opens the Mini App
When apps/mini/app/page.tsx renders
Then the dashboard shows in this vertical order (mobile-first, 360-450px width):
  1. <PermissionSummary> (compact variant) at the top with the plain-English session-key copy
  2. <EmergencyFreezeButton> (full-pill, prominent) directly below
  3. List of <PositionCard> components for each open position
  4. <ActivityFeed> (compact mobile variant) for the most recent 5 agent actions

Given a user has no open positions
When the dashboard renders
Then an empty-state card shows: "No active loans. Browse merchants to start." with a CTA → /merchants

Given the user taps the Emergency Freeze button
When the press confirms via TG haptic + native confirm dialog
Then the freeze action is dispatched (uses the same hook as web: useEmergencyFreeze)
And the dashboard updates to show frozen state (lock icon + greyed agent capabilities)
And `WebApp.HapticFeedback.notificationOccurred('warning')` fires

Given the user has the TG BackButton (story-81) wired
When they are on / (root)
Then the BackButton is NOT shown (root)

Given the dashboard fetches data
When TanStack Query loads positions, activity, and permission summary
Then each section renders a skeleton state during loading
And errors render a small inline retry control (no whole-page crash)

Given the user is on the dashboard and the agent emits a new ERC-8004 receipt
When the API SSE/poll mechanism pushes the event
Then the activity feed prepends the new entry without a full page re-render

Given Playwright runs apps/mini/e2e/dashboard.spec.ts
When the spec executes with mocked API + Privy
Then all 4 sections render and the freeze button is interactive
```

## File modification map

- `apps/mini/app/page.tsx` — UPDATE — replace the placeholder scaffold from story-80 with the real dashboard composition; guarded by `useRequirePrivyAuth()` from story-82.
- `apps/mini/components/dashboard/MiniDashboard.tsx` — NEW — composes the 4 sections; passes `variant="compact"` to the shared `packages/ui` components where supported.
- `apps/mini/components/dashboard/EmptyPositionsState.tsx` — NEW — empty state with CTA → /merchants.
- `apps/mini/lib/hooks/useDashboardData.ts` — NEW — TanStack Query bundle: positions, activity, permission summary; revalidates on `WebApp.onEvent('mainButtonClicked')` and on focus.
- `packages/ui/src/PermissionSummary/PermissionSummary.tsx` — UPDATE — accept `variant: 'full' | 'compact'` prop (compact = single-line + tappable to expand). NO duplication in apps/mini.
- `packages/ui/src/EmergencyFreezeButton/EmergencyFreezeButton.tsx` — UPDATE — accept `confirmStrategy: 'modal' | 'telegram-native'` so the mini app can use `WebApp.showConfirm` instead of an in-app modal.
- `packages/ui/src/PositionCard/PositionCard.tsx` — UPDATE — accept `variant: 'wide' | 'compact'` (compact stacks the yield ticker beneath the principal instead of beside).
- `packages/ui/src/ActivityFeed/ActivityFeed.tsx` — UPDATE — accept `maxItems` and `variant: 'desktop' | 'mobile'`; mobile collapses sub-agent tree behind a tap-to-expand.
- `apps/mini/e2e/dashboard.spec.ts` — NEW — Playwright spec with mocked API.

## Shell verification

```bash
pnpm --filter mini build
test $? -eq 0

# Page renders 4 sections
grep -q "PermissionSummary" apps/mini/components/dashboard/MiniDashboard.tsx
grep -q "EmergencyFreezeButton" apps/mini/components/dashboard/MiniDashboard.tsx
grep -q "PositionCard" apps/mini/components/dashboard/MiniDashboard.tsx
grep -q "ActivityFeed" apps/mini/components/dashboard/MiniDashboard.tsx

# Reuses packages/ui (no duplication in apps/mini)
! find apps/mini/components -name "PositionCard.tsx" -o -name "EmergencyFreezeButton.tsx" -o -name "PermissionSummary.tsx" -o -name "ActivityFeed.tsx" | grep -q .

# Auth gate
grep -q "useRequirePrivyAuth" apps/mini/app/page.tsx

# Playwright
pnpm playwright test apps/mini/e2e/dashboard.spec.ts
test $? -eq 0

# 400-LOC
for f in $(find apps/mini/components/dashboard -type f \( -name "*.ts" -o -name "*.tsx" \)); do
  wc -l "$f" | awk '{ if ($1 > 400) exit 1 }'
done
```

## Notes

- **Anchor: Cleo + Lindy + Cobo** — card-based feed, plain-language permissions, big red freeze. Same anchors as the web dashboard, adapted to mobile.
- The mini dashboard MUST reuse `packages/ui` components — don't fork. The `variant` prop pattern keeps the surface adaptation explicit without a copy-paste.
- Per ux-spec § Telegram Mini App specifics: confirm dialogs use `WebApp.showConfirm` (native modal) instead of in-app modals where possible — feels more native.
- Vertical ordering matters: permission summary first (transparency), freeze second (control), positions third (utility), activity fourth (audit). This mirrors the web dashboard's emphasis but in a narrower viewport.
- Empty state should not be apologetic — frame as "ready to spend without selling".
- Live updates: prefer SSE from Epic 2; poll every 5s as fallback. Background tab suspends polling.
- File size < 400 LOC enforced.
- Serves demo-shape Stages 3 + 4 in the mini surface — if Demo Day flips to mobile (judge has TG open), this is what they see.
