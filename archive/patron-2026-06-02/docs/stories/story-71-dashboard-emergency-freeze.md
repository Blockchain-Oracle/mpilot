# Story 71 — Dashboard `<EmergencyFreezeButton>` — the differentiator primitive

**Epic:** Epic 4 — Web App
**Estimated:** ~2h (extra care — THE differentiator UI per Cobo anchor)
**Depends on:** story-68-dashboard-shell, story-20-agent-authorizer-tests

## BDD Acceptance Criteria

```
Given a connected user is on /app/dashboard with an active agent
When the page renders
Then a large pill-shaped <EmergencyFreezeButton> is prominently visible in the top-right of the main content area
And the button is --danger red (#B91C1C) with white text
And the button has rounded-[28px] (radius-freeze per ux-spec)
And the button label reads "Emergency Freeze"
And the button height is at least 48px (touch target compliance)

Given a user clicks the Emergency Freeze button
When the click registers
Then a confirm modal opens (via <Modal> from story-62)
And the modal text reads: "This will revoke ALL agent session keys immediately. Pending agent actions will fail. You can resume any time."
And the confirm button is --danger red labeled "Freeze agent"
And the cancel button is --secondary

Given the user confirms freeze
When the confirm button is clicked
Then a POST to /users/me/agent/freeze is issued
And on success the agent status indicator (story-68) switches to "Agent frozen" within 1 second
And the dashboard main content gets a grey overlay with a lock icon
And the freeze button label changes to "Resume agent" (--success styling)
And the action is logged to the activity feed as an ERC-8004 receipt
And the button press triggers a brief spring scale animation (transform-only, 150ms)

Given the agent is frozen
When the user clicks "Resume agent"
Then a POST to /users/me/agent/unfreeze is issued
And on success the lock overlay is removed
And the button reverts to "Emergency Freeze" labeling

Given Playwright runs apps/web/e2e/dashboard-freeze.spec.ts
When the spec executes
Then it asserts: button visible + confirm modal opens + freeze sets frozen state visually in <1s + unfreeze restores
And the freeze action triggers an activity feed entry

Given a Vitest unit test on <EmergencyFreezeButton>
When tested with frozen=true and frozen=false
Then the variant + label + click handler behave per spec
```

## File modification map

- `packages/ui/src/EmergencyFreezeButton/EmergencyFreezeButton.tsx` — NEW — `"use client"`; pill-shaped --danger button; uses `<Modal>` for confirm.
- `packages/ui/src/EmergencyFreezeButton/EmergencyFreezeButton.test.tsx` — NEW — Vitest: render frozen + active states, click triggers confirm, confirm fires onConfirm.
- `apps/web/components/dashboard/EmergencyFreezeContainer.tsx` — NEW — wires `<EmergencyFreezeButton>` to API mutations + dashboard freeze overlay.
- `apps/web/components/dashboard/FrozenOverlay.tsx` — NEW — grey overlay + lock icon shown when agent.status === 'frozen'.
- `apps/web/lib/hooks/useFreezeAgent.ts` — NEW — TanStack Query mutation hook for POST /users/me/agent/freeze and /unfreeze.
- `apps/web/app/app/dashboard/page.tsx` — UPDATE — include `<EmergencyFreezeContainer />` in top-right of dashboard grid.
- `apps/web/e2e/dashboard-freeze.spec.ts` — NEW — Playwright spec.

## Shell verification

```bash
pnpm --filter @patron/ui test
pnpm --filter web build
test $? -eq 0

# Component exists + exported
test -f packages/ui/src/EmergencyFreezeButton/EmergencyFreezeButton.tsx
grep -q "EmergencyFreezeButton" packages/ui/src/index.ts

# Color is --danger (deep red) — NOT a default red-500
grep -q -- "--danger" packages/ui/src/EmergencyFreezeButton/EmergencyFreezeButton.tsx

# Pill radius
grep -q "rounded-\[28px\]\|--radius-freeze" packages/ui/src/EmergencyFreezeButton/EmergencyFreezeButton.tsx

# Playwright (with API mock)
pnpm playwright test apps/web/e2e/dashboard-freeze.spec.ts
test $? -eq 0

# Touch target ≥ 44px (a11y)
grep -qE "h-(12|14|16|\[48px\]|\[56px\])" packages/ui/src/EmergencyFreezeButton/EmergencyFreezeButton.tsx
```

## Notes

- **Anchor: Cobo Agentic Wallet** — large red one-tap "freeze all permissions" primitive; immediate visual feedback (frozen state lock-icon).
- **This is THE differentiator UI primitive** per ux-spec § Anchor products and PRD § Demo moment Stage 4. Extra care: visual prominence, < 1s freeze feedback, unambiguous semantics.
- The Cobo anchor matters because the Klarna "trust us" failure is the contrast story — Patron users can freeze with one tap.
- Per a11y minimums in ux-spec: touch target ≥ 44×44px (we use ≥ 48 for safety), visible focus ring, `aria-pressed` for toggle state.
- Spring animation: transform scale 0.98 on press, 1.0 on release, 150ms with --ease-spring. Specify `transition-[transform]` — NEVER `transition-all`.
- The freeze action MUST write an ERC-8004 receipt (story-52 in Epic 3) — the activity feed should show it.
- The confirm modal is mandatory: accidental freeze during demo = catastrophe. Confirm step adds < 1s but eliminates fat-finger risk.
- For Reduced-motion users: skip the spring animation, instant state change.
- File size < 400 LOC enforced (Button itself should be ~150 LOC).
- **Serves demo-shape Stage 4 critically** — judge clicks Freeze, dashboard immediately shows frozen state. The 90-second demo lives or dies here.
