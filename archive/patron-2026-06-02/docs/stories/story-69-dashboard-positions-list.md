# Story 69 — Dashboard positions list with `<PositionCard>` + live yield ticker + paydown chart

**Epic:** Epic 4 — Web App
**Estimated:** ~2h
**Depends on:** story-68-dashboard-shell, story-35-user-profile-endpoints

## BDD Acceptance Criteria

```
Given a connected user with 1+ open positions navigates to /app/dashboard
When the page renders
Then for each position, a <PositionCard> is shown displaying:
  - Collateral: sUSDe amount + USD value
  - Debt: USDC borrowed amount
  - Net carry: yield APY minus borrow APR (displayed as "+X.Xpp" in --success green)
  - Live yield ticker: increments in real-time (every 1s; recomputes from APY × dt)
  - Paydown progress chart: Recharts AreaChart showing debt remaining over time + projected zero-out date
  - Health factor: numeric display, colored --success > 1.5, --warning 1.2–1.5, --danger < 1.2
  - Merchant: which merchant the loan funded
  - Receipt: link to /audit/:txHash (opens story-77)

Given a user has 0 positions
When /app/dashboard renders
Then an empty state with copy "No active positions yet. Browse merchants to make your first purchase." renders
And a <PatronButton variant="primary">Browse merchants</PatronButton> CTA links to /app/merchants

Given the yield ticker is rendering
When the user toggles `prefers-reduced-motion: reduce`
Then the ticker updates the displayed value but does NOT animate digit transitions

Given Playwright runs apps/web/e2e/dashboard-positions.spec.ts
When the spec executes with mocked API returning 2 positions
Then 2 <PositionCard>s render with the expected merchant, amount, and health factor fields visible

Given a Vitest unit test runs on <PositionCard>
When the position has debt of 75 USDC, collateral of 200 sUSDe at synthetic test yieldApy=5.0 and borrowApr=3.5
Then the computed net carry is exactly 1.5pp and the projected paydown days is computed from `(debt / (collateralUsd × spreadDecimal)) × 365` — the test asserts the formula, not a specific historical number (rates drift in production; the math primitive is what's under test)
```

## File modification map

- `apps/web/app/app/dashboard/page.tsx` — NEW — server component; reads positions via TanStack Query (hydrated) → renders `<PositionsList />`.
- `apps/web/components/dashboard/PositionsList.tsx` — NEW — `"use client"`; renders array of `<PositionCard>`s OR empty state.
- `packages/ui/src/PositionCard/PositionCard.tsx` — NEW — composable card; props typed via Zod schema (`{ collateralAmount, collateralUsd, debtAmount, yieldApy, borrowApr, healthFactor, merchantSlug, merchantName, receiptTxHash, openedAt }`).
- `packages/ui/src/PositionCard/PositionCard.test.tsx` — NEW — Vitest unit tests covering net carry math, health factor color thresholds, paydown projection.
- `packages/ui/src/YieldTicker/YieldTicker.tsx` — NEW — `"use client"`; live-incrementing display using `requestAnimationFrame` throttled to ~1Hz. Respects `prefers-reduced-motion`.
- `packages/ui/src/YieldTicker/YieldTicker.test.tsx` — NEW — fake timer test: advance 5s, expect value increased by APY * 5/seconds_per_year.
- `packages/ui/src/PaydownChart/PaydownChart.tsx` — NEW — Recharts AreaChart; debt vs time + projected zero date.
- `apps/web/lib/hooks/usePositions.ts` — NEW — TanStack Query hook hitting `GET /users/me/positions` from API; returns array.
- `apps/web/e2e/dashboard-positions.spec.ts` — NEW — Playwright spec with API mock.

## Shell verification

```bash
pnpm --filter @patron/ui test
pnpm --filter web build
test $? -eq 0

# PositionCard exported
grep -q "PositionCard" packages/ui/src/index.ts

# Files exist
test -f packages/ui/src/PositionCard/PositionCard.tsx
test -f packages/ui/src/YieldTicker/YieldTicker.tsx
test -f packages/ui/src/PaydownChart/PaydownChart.tsx

# 400-LOC enforcement
wc -l packages/ui/src/PositionCard/PositionCard.tsx | awk '{ if ($1 > 400) exit 1 }'

# Playwright
pnpm playwright test apps/web/e2e/dashboard-positions.spec.ts
test $? -eq 0
```

## Notes

- **Anchor: Cleo + Lindy** — card-based, clear deltas, no clutter.
- Live yield ticker: increment using `(yieldApy / SECONDS_PER_YEAR) * collateralUsd` per second. Use `Intl.NumberFormat` for currency formatting.
- Health factor thresholds align with Aave conventions: > 1.5 healthy, 1.2-1.5 caution, < 1.2 liquidation risk.
- Paydown projection: linear approximation `daysToZero = debtAmount / (collateralUsd * (yieldApy - borrowApr) / 365)`. Real agent decisions may accelerate; that's fine, this is a UI projection.
- `<YieldTicker>` is its own component because it's reused in agent management (story-73) and checkout modal (story-76).
- Per ux-spec: numeric values use JetBrains Mono (`--font-mono`), labels use Inter, headings use Fraunces.
- Banned Tailwind classes auto-checked.
- File size < 400 LOC per file enforced.
- Serves demo-shape Stage 3 (dashboard updates in real time) and Stage 4 (dashboard surface).
