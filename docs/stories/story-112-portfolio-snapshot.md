# Story — Portfolio snapshot (`/app` overview card)

**ID:** story-112-portfolio-snapshot
**Epic:** Epic E7 — Web App
**Depends on:** story-107-app-dashboard-shell, story-30-aave-v3-mantle-provider, story-32-mantle-dex-provider, story-34-ethena-susde-provider, story-38-meth-staking-provider
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** Concierge user
**I want to** the dashboard's overview card shows my current portfolio: USDC balance, sUSDe balance, mETH balance, Aave debt, current HF, current yield (annualized), 24h delta
**So that** I can verify "the agent is doing what I asked" at a glance without clicking into specific protocols

---

## File modification map

- `apps/web/components/dashboard/PortfolioSnapshot.tsx` — NEW — main overview card
- `apps/web/components/dashboard/BalanceRow.tsx` — NEW — single balance row (token symbol, amount, USD value, 24h delta)
- `apps/web/components/dashboard/HealthFactorGauge.tsx` — NEW — visual HF indicator (gauge or progress bar with safe/warning/danger zones)
- `apps/web/components/dashboard/YieldDisplay.tsx` — NEW — annualized yield with breakdown by source (sUSDe vs Aave supply vs mETH)
- `apps/web/lib/hooks/usePortfolio.ts` — NEW — TanStack Query hook that calls `/api/portfolio?agentId=X`
- `apps/web/app/api/portfolio/route.ts` — NEW — GET endpoint that calls each provider's read selectors, aggregates, returns
- `apps/web/components/dashboard/__tests__/PortfolioSnapshot.test.tsx` — NEW — RTL test

---

## Acceptance criteria (BDD)

```
Given a user with positions across Aave + sUSDe + mETH
When PortfolioSnapshot renders
Then it shows balances for each: USDC, sUSDe, mETH, Aave variable debt (per token); plus aggregate USD value

Given the HealthFactorGauge
When HF is 2.0
Then it renders in "safe" color zone (green)

Given the HealthFactorGauge
When HF is 1.6 (close to floor 1.5)
Then it renders in "warning" zone (amber)

Given the HealthFactorGauge
When HF is < 1.5 (below floor — should never happen if agent works)
Then it renders in "danger" zone (red) with an explicit warning message

Given the 24h delta column
When the previous day's snapshot exists
Then each balance row shows delta (e.g., "+$2.13 / +0.2%")

Given the previous day's snapshot does NOT exist (new agent)
When PortfolioSnapshot renders
Then delta columns show "—" (NOT "$0.00 / 0%" — false precision)

Given the portfolio API
When called with valid auth
Then it returns { balances, debt, hf, yieldAnnualized, computedAt } AND completes in < 2s

Given the portfolio data is stale (> 60s)
When the user refreshes
Then the data refetches AND the "last updated" timestamp updates

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd apps/web
test -f components/dashboard/PortfolioSnapshot.tsx
test -f components/dashboard/BalanceRow.tsx
test -f components/dashboard/HealthFactorGauge.tsx
test -f components/dashboard/YieldDisplay.tsx
test -f lib/hooks/usePortfolio.ts
test -f app/api/portfolio/route.ts

cd ../..

pnpm --filter @concierge-mantle/web run build
test $? -eq 0

# No hardcoded HF colors — uses design tokens
! grep -qE "#FF0000|#00FF00" apps/web/components/dashboard/HealthFactorGauge.tsx

# Tests pass
pnpm --filter @concierge-mantle/web run test 2>&1 | grep -E "(Portfolio|HealthFactor)" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Real read calls, not hardcoded.** Per CLAUDE.md no-mocks rule: the /api/portfolio endpoint MUST call each provider's `getBalance`, `getUserAccountData`, etc. — read from the actual chain. If providers aren't ready (early in development), return typed "loading" state, NOT placeholder numbers.
- **24h delta requires snapshot history.** This story implicitly requires a `portfolio_snapshots` table (added in story-69 schema migration — verify the table exists). Snapshots are taken at the end of each successful tick (story-67 record phase).
- **HF color zones map to thresholds.** safe: HF ≥ 1.8; warning: 1.5 ≤ HF < 1.8; danger: HF < 1.5. Colors come from design tokens — NEVER hardcode hex values in the component.
- **YieldDisplay breaks down by source** so users see which protocol contributes most. Annualized via `(currentAccrual / startBalance) * (365 / daysElapsed)` — naive but acceptable for v1.
- **Loading state matters.** Per `research/concierge/08-ux-component-intent.md` § loading states: don't show "0" while loading — that's a real number and looks like the user has no balances. Use skeleton placeholders or "—" with a spinner.
- **Refetch on focus.** TanStack Query's `refetchOnWindowFocus` default is true; keep it. Users who tab away and back get fresh data.
- **No `text-gray-600` body text per CLAUDE.md anti-slop.** Use the design token color for body.
- Cross-ref: `research/concierge/08-ux-component-intent.md` § portfolio snapshot, provider read selectors.
