# Story 85 — Mini App agent management (/agent)

**Epic:** Epic 5 — Telegram Mini App
**Estimated:** ~1.5h
**Depends on:** story-84-mini-dashboard, story-73-agent-management-page

## BDD Acceptance Criteria

```
Given an authenticated user navigates to /agent
When apps/mini/app/agent/page.tsx renders
Then the page shows in vertical order:
  1. Agent identity card: Identity NFT ID, owner address (truncated), agent name editable inline
  2. <ReputationBadge> with lifetime score + recent delta
  3. Plain-language permission summary (full variant from packages/ui)
  4. Editable limits: per-tx cap, per-24h cap, whitelisted merchants list, expiry date
  5. "Log out" link at the bottom (Privy logout)

Given the user edits a limit
When they confirm via TG MainButton "Save changes"
Then a POST /users/me/agent-config request fires (Epic 2 backend; stub if not ready)
And on success a toast shows "Limits updated" and TG haptic notification fires
And the displayed limits reflect the new values

Given the user views their reputation
When the page renders
Then a tap on the reputation badge opens a TG WebApp.openLink to the public reputation page (TBD route or external ERC-8004 explorer link)

Given the user is on /agent
When the TG BackButton is tapped
Then router.back() runs (returns to dashboard /)

Given the user taps "Log out"
When Privy `logout()` resolves
Then router pushes to /onboarding
And TanStack Query cache is invalidated

Given Playwright runs apps/mini/e2e/agent.spec.ts
When the spec executes with mocked Privy + API
Then identity + reputation + permission + limits sections render
And editing a limit + saving updates the UI
```

## File modification map

- `apps/mini/app/agent/page.tsx` — NEW — `"use client"`; auth-gated; composes the 5 sections.
- `apps/mini/components/agent/AgentIdentityCard.tsx` — NEW — shows Identity NFT ID + owner address + editable agent name.
- `apps/mini/components/agent/AgentLimitsEditor.tsx` — NEW — form for per-tx cap, per-24h cap, merchant whitelist, expiry; mobile-optimized inputs.
- `apps/mini/components/agent/AgentLogoutLink.tsx` — NEW — calls `usePrivy().logout()` then routes to /onboarding.
- `apps/mini/lib/hooks/useAgentConfig.ts` — NEW — TanStack Query: GET + PATCH `/users/me/agent-config` (Epic 2 endpoint; stub allowed).
- `packages/ui/src/ReputationBadge/ReputationBadge.tsx` — REUSE — imported, not duplicated.
- `packages/ui/src/PermissionSummary/PermissionSummary.tsx` — REUSE — variant="full".
- `apps/mini/e2e/agent.spec.ts` — NEW — Playwright spec.

## Shell verification

```bash
pnpm --filter mini build
test $? -eq 0

# Route + components
test -f apps/mini/app/agent/page.tsx
test -f apps/mini/components/agent/AgentIdentityCard.tsx
test -f apps/mini/components/agent/AgentLimitsEditor.tsx
test -f apps/mini/components/agent/AgentLogoutLink.tsx

# MainButton drives save
grep -q "useMainButton" apps/mini/components/agent/AgentLimitsEditor.tsx

# Reuses ReputationBadge + PermissionSummary from packages/ui
grep -q "@patron/ui" apps/mini/app/agent/page.tsx

# Playwright
pnpm playwright test apps/mini/e2e/agent.spec.ts
test $? -eq 0

# 400-LOC
for f in $(find apps/mini/components/agent apps/mini/app/agent -type f \( -name "*.ts" -o -name "*.tsx" \)); do
  wc -l "$f" | awk '{ if ($1 > 400) exit 1 }'
done
```

## Notes

- **Anchor: Cobo Agentic Wallet + Openfort permissions** — explicit limits, plain-language summaries, single-tap revocation.
- Use TG MainButton for "Save changes" — only enabled when the form is dirty + valid.
- Reputation badge tap → `WebApp.openLink(externalUrl, { try_instant_view: true })` so the user stays in TG.
- Limits editor inputs should be `inputMode="numeric"` for caps; date input for expiry; multi-select for merchant whitelist.
- Logging out clears the Privy session AND the TanStack cache to prevent leakage between accounts in a shared device.
- Per ux-spec route shape: `/agent` is the canonical mini route (no `/app/agent` nesting like web).
- The agent name is the only mutable identity field in v1 — Identity NFT ID is immutable.
- File size < 400 LOC enforced.
- Polishing this page contributes to the Best UI/UX nomination — explicit user control is the product moat vs Klarna.
