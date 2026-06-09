# Story 73 — Agent management page at /app/agent

**Epic:** Epic 4 — Web App
**Estimated:** ~2h
**Depends on:** story-71-dashboard-emergency-freeze, story-72-dashboard-permission-summary

## BDD Acceptance Criteria

```
Given a connected user navigates to /app/agent
When the page renders
Then it shows 4 sections in order:
  1. Reputation — agent's ERC-8004 score + score history sparkline (Recharts LineChart)
  2. History — paginated list of all agent actions (reuse <ActivityFeed> from story-70 in extended mode)
  3. Settings — editable session key config (spend cap, period, merchant whitelist add/remove, expiry)
  4. Export — buttons to "Export agent state (JSON)" and "Generate agent portability key" (placeholder for v2 EIP-7702)

Given the reputation section renders
When the user hovers the score
Then a tooltip shows breakdown: total successful actions, failed actions, dispute outcomes, validation receipts
And a link "View on ERC-8004 Registry" opens https://mantlescan.xyz/address/<reputation_registry_addr>#tokentxns

Given the settings section is edited
When the user changes the spend cap from $200 to $500 and clicks Save
Then a POST to /users/me/session-key is issued
And on success the <PermissionSummary> on /app/dashboard reflects the new value
And the change is logged to the activity feed as an ERC-8004 receipt

Given the user clicks "Export agent state (JSON)"
When the export runs
Then a JSON file downloads containing: agent identity NFT id, reputation score, action history, current session key config

Given the agent is frozen (state from story-71)
When the settings section is rendered
Then all editable fields are disabled with a banner "Resume your agent to modify settings"

Given Playwright runs apps/web/e2e/agent-management.spec.ts
When the spec executes
Then all 4 sections render, settings save works, export downloads JSON, frozen-state banner appears
```

## File modification map

- `apps/web/app/app/agent/page.tsx` — NEW — server component composition of the 4 sections.
- `apps/web/components/agent/ReputationSection.tsx` — NEW — score display + sparkline + tooltip.
- `apps/web/components/agent/HistorySection.tsx` — NEW — extended `<ActivityFeed>` (filter by all action types + date range).
- `apps/web/components/agent/SettingsSection.tsx` — NEW — react-hook-form + Zod schema for session-key edit; disabled when frozen.
- `apps/web/components/agent/ExportSection.tsx` — NEW — JSON export + placeholder portability key button (disabled with "v2" tooltip).
- `apps/web/lib/hooks/useAgentReputation.ts` — NEW — TanStack Query hook hitting `GET /users/me/agent/reputation`.
- `apps/web/lib/hooks/useUpdateSessionKey.ts` — NEW — TanStack Query mutation for POST /users/me/session-key.
- `apps/web/lib/exportAgentState.ts` — NEW — utility: fetch full state, serialize, trigger download via Blob + URL.createObjectURL.
- `apps/web/e2e/agent-management.spec.ts` — NEW — Playwright spec.

## Shell verification

```bash
pnpm --filter web build
test $? -eq 0

# All 4 sections exist
test -f apps/web/components/agent/ReputationSection.tsx
test -f apps/web/components/agent/HistorySection.tsx
test -f apps/web/components/agent/SettingsSection.tsx
test -f apps/web/components/agent/ExportSection.tsx

# Page composes sections
grep -q "ReputationSection" apps/web/app/app/agent/page.tsx
grep -q "HistorySection" apps/web/app/app/agent/page.tsx
grep -q "SettingsSection" apps/web/app/app/agent/page.tsx
grep -q "ExportSection" apps/web/app/app/agent/page.tsx

# 400-LOC per file
for f in apps/web/components/agent/*.tsx; do
  wc -l "$f" | awk '{ if ($1 > 400) exit 1 }'
done

# Playwright
pnpm playwright test apps/web/e2e/agent-management.spec.ts
test $? -eq 0
```

## Notes

- **Anchor: Lindy** — settings UI for agent capabilities; clear edit vs view modes.
- Reputation score: pull from ERC-8004 Reputation Registry via `ReputationProxy.sol` view function (already deployed in Epic 1).
- Sparkline: Recharts LineChart, < 100 LOC component, no axes/legend (just the trend).
- Settings form: react-hook-form + `@hookform/resolvers/zod` for validation. Spend cap min $10, max $10000; period from a fixed dropdown (1h, 24h, 7 days, 30 days); whitelist managed as a chip-add UI.
- Frozen-state disable: read agent status from same `useAgentState()` hook as story-68's status indicator.
- Export JSON includes everything to support agent portability narrative (even if EIP-7702 portability is v2).
- Banned Tailwind classes auto-checked.
- File size < 400 LOC per file enforced.
- Does NOT directly serve a demo-shape stage but supports the "you own your agent" message — judges may click here off-script.
