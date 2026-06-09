# Story 72 — Dashboard `<PermissionSummary>` — plain-English session keys

**Epic:** Epic 4 — Web App
**Estimated:** ~2h
**Depends on:** story-68-dashboard-shell, story-20-agent-authorizer-tests

## BDD Acceptance Criteria

```
Given a connected user with an active agent session key navigates to /app/dashboard
When the page renders
Then a <PermissionSummary> card is visible at the top of the main content
And the card displays plain English summarizing the session key's permissions, e.g.:
  "Patron can spend up to $200 USDC per 24h on whitelisted merchants until Aug 1."

Given the session key has multiple constraints
When the summary is rendered
Then each constraint is rendered as a discrete chip:
  - "Spend cap: $200 / 24h"
  - "Merchants: 12 whitelisted"
  - "Expires: Aug 1, 2026"
  - "Chains: Mantle Mainnet only"

Given the user clicks "View details"
When the disclosure opens
Then the raw session key parameters render as a JetBrains Mono code block
And a "Modify" CTA opens /app/agent (story-73)

Given the user has no session key issued yet
When the card renders
Then it shows an onboarding state: "No active session key. Your agent needs permissions to act. Set up permissions →" linking to /app/agent

Given Playwright runs apps/web/e2e/dashboard-permissions.spec.ts
When the spec executes with mocked session key data
Then the plain-English summary renders, chips are present, View details discloses raw params

Given a Vitest unit test on <PermissionSummary>
When given session key bytecode { spendCap: 200e6, period: 86400, merchantWhitelist: [...12], expiresAt: <unix>, chainIds: [5000] }
Then the rendered summary contains "$200", "24h", "12 whitelisted", "Aug 1", and the chip count is 4
```

## File modification map

- `packages/ui/src/PermissionSummary/PermissionSummary.tsx` — NEW — `"use client"` (for disclosure); pure rendering of session-key props.
- `packages/ui/src/PermissionSummary/PermissionSummary.test.tsx` — NEW — Vitest covering the bytecode→English translation.
- `packages/ui/src/PermissionSummary/translator.ts` — NEW — pure function `sessionKeyToEnglish(key: SessionKey): { summary: string; chips: Chip[] }`. Testable in isolation.
- `packages/ui/src/PermissionSummary/translator.test.ts` — NEW — Vitest unit tests for the translator (spend cap formatting, period to human duration, merchant count, expiry date formatting via Intl.DateTimeFormat).
- `apps/web/components/dashboard/PermissionSummaryContainer.tsx` — NEW — wires `<PermissionSummary>` to API hook.
- `apps/web/lib/hooks/useSessionKey.ts` — NEW — TanStack Query hook fetching `GET /users/me/session-key`.
- `apps/web/app/app/dashboard/page.tsx` — UPDATE — render `<PermissionSummaryContainer />` at the top of the main content (above positions list).
- `apps/web/e2e/dashboard-permissions.spec.ts` — NEW — Playwright spec.

## Shell verification

```bash
pnpm --filter @patron/ui test
pnpm --filter web build
test $? -eq 0

# Component exported
grep -q "PermissionSummary" packages/ui/src/index.ts

# Translator pure function exists + tested
test -f packages/ui/src/PermissionSummary/translator.ts
test -f packages/ui/src/PermissionSummary/translator.test.ts

# 400-LOC
wc -l packages/ui/src/PermissionSummary/PermissionSummary.tsx | awk '{ if ($1 > 400) exit 1 }'

# Playwright
pnpm playwright test apps/web/e2e/dashboard-permissions.spec.ts
test $? -eq 0
```

## Notes

- **Anchor: Openfort + Privy** — translate session-key bytecode (chain/contract allowlist, spend cap, time window) into one human-readable sentence.
- This is the second pillar of Patron's "auditable agent" message — alongside Emergency Freeze and ERC-8004 receipts. The judge reads ONE SENTENCE and knows exactly what the agent can do.
- Translator (`sessionKeyToEnglish`) is a **pure function** — keep it in its own file with its own unit tests. This unlocks reuse in mini app + tooling.
- Date formatting: use `new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })` for "Aug 1" — NOT `toLocaleDateString()` (locale-flaky).
- Currency formatting: `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })` for "$200".
- Period formatting: 86400s → "24h", 3600s → "1h", 604800s → "7 days", etc. Helper in `translator.ts`.
- Chips use Radix Badge OR a custom pill component < 30 LOC.
- Banned Tailwind classes auto-checked.
- File size < 400 LOC per file enforced.
- Serves demo-shape Stage 4: when judge looks at dashboard, the permission summary is the first thing they read at the top.
