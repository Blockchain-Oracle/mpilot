# Story 64 — Landing "How it works" with yield-vs-loan math viz

**Epic:** Epic 4 — Web App
**Estimated:** ~2h
**Depends on:** story-62-shared-ui-package-bootstrap

## BDD Acceptance Criteria

```
Given a visitor scrolls past the hero
When the "How it works" section enters viewport
Then 3 numbered steps render in a horizontal grid (desktop) / vertical stack (mobile)
And the steps read:
  1. "Lock your sUSDe as collateral — keep earning Ethena yield"
  2. "Patron borrows USDC against it via Aave Mantle E-Mode 1 and pays the merchant"
  3. "Your collateral's yield covers the loan interest — you keep the item AND your sUSDe stays in your wallet"

Given the yield-vs-loan math visualization renders
When the user looks at the diff bars
Then a live-spread indicator is visible (live sUSDe Ethena APY bar minus live USDC borrow APR bar, both fetched per-render from /api/rates which proxies Aave Oracle + DefiLlama)
And the spread is highlighted in --success green when ≥ 0, --warning amber when < 0 (with explanatory tooltip)
And the visualization uses Recharts (BarChart) with explicit colors (no Recharts defaults)

Given the math viz is rendered
When the page is reloaded with `prefers-reduced-motion: reduce`
Then bars render in their final state with no animation
And no transition longer than 0ms runs

Given Playwright runs apps/web/e2e/landing-how-it-works.spec.ts
When the spec executes
Then it asserts the 3 step headlines render in order
And the live-spread indicator renders with a numeric value (asserted via regex, not exact match — rates drift)
And the Recharts bars are rendered (locator: `[role="img"]` or `svg.recharts-surface`)
And the test mocks /api/rates to return a known fixture so the assertion is deterministic

Given the section serves demo-shape Stage 2 (judge understands the money math)
When a judge lands on the modal in checkout (story-76)
Then the same yield-vs-borrow math is reinforced there — visual consistency
```

## File modification map

- `apps/web/components/landing/HowItWorks.tsx` — NEW — 3-step grid + math viz.
- `apps/web/components/landing/YieldMathViz.tsx` — NEW — `"use client"`; fetches live rates from `/api/rates` (TanStack Query, 60s stale-time); Recharts BarChart with 2 dynamic bars (live sUSDe APY, live USDC borrow APR) + delta indicator. Renders skeleton while loading. < 200 LOC.
- `apps/web/app/api/rates/route.ts` — NEW — server route that calls Aave Oracle + DefiLlama and returns `{ susdeApy: number, usdcBorrowApr: number, spreadPp: number, fetchedAt: number }`. 60s server-side cache. < 100 LOC.
- `apps/web/components/landing/HowItWorks.module.css` — NEW (optional) — only if needed.
- `apps/web/app/page.tsx` — UPDATE — insert `<HowItWorks />` between `<Hero />` and `<MerchantLogos />`.
- `apps/web/package.json` — UPDATE — add `recharts@latest`.
- `apps/web/e2e/landing-how-it-works.spec.ts` — NEW — Playwright spec asserting the 3 step copy, the live-spread indicator, and chart presence.
- `packages/ui/src/YieldDeltaBadge/YieldDeltaBadge.tsx` — NEW — reusable live-spread badge that accepts `{ susdeApy, usdcBorrowApr }` props (no hardcoded numbers) and renders `+N.Npp` with `--success` styling when ≥ 0, `--warning` styling when < 0; reused in dashboard + checkout modal.
- `packages/ui/src/YieldDeltaBadge/YieldDeltaBadge.test.tsx` — NEW — render + positive/negative variants.

## Shell verification

```bash
pnpm --filter web build
test $? -eq 0

# Step copy present
curl -sf http://localhost:3000 | grep -q "Lock your sUSDe"
curl -sf http://localhost:3000 | grep -q "borrows USDC"
curl -sf http://localhost:3000 | grep -q "yield covers the loan interest"

# Live-rate route returns a number
curl -sf http://localhost:3000/api/rates | jq -e '.susdeApy | type == "number"'
curl -sf http://localhost:3000/api/rates | jq -e '.usdcBorrowApr | type == "number"'

# Recharts installed
grep -q "recharts" apps/web/package.json

# Playwright e2e
pnpm playwright test apps/web/e2e/landing-how-it-works.spec.ts
test $? -eq 0

# YieldDeltaBadge unit test
pnpm --filter @patron/ui test
```

## Notes

- **Context7 first**: query Recharts docs (v2.x BarChart props changed).
- The math is the wow moment — Klarna users pay 23.99% APR; Patron users have a near-zero cost-of-credit floor (collateral yield covers borrow interest). Show the delta unmistakably **with live numbers** — do not hardcode rates.
- **Rates are LIVE (per ADR-002 + ADR-003).** sUSDe Ethena APY comes from DefiLlama pool `66985a81-9c51-46ca-9977-42b4fe7bc6df`; USDC borrow APR is read via `getReserveData(USDC).currentVariableBorrowRate` from Aave V3 Pool `0x458F293454fE0d67EC0655f3672301301DD51422`. Same source the modal uses (story-76). Server-side cached 60s.
- **NEVER hardcode rates in the component.** Spread is currently compressed (~+0.5pp at time of spec) — hardcoded numbers will drift and embarrass the demo. Component must render whatever the API returns and show a friendly fallback while loading.
- Bars: positive yield in `--success` (forest green), borrow cost in `--warning` (amber), delta in bold Fraunces with `--success` background pill when ≥ 0 / `--warning` pill with tooltip "Spread is compressed today — your collateral still covers most of the borrow cost" when < 0.
- The `<YieldDeltaBadge>` is reused in dashboard `<PositionCard>` (story-69) and `<CheckoutModal>` (story-76) — bake the delta math primitive here.
- No `transition-all` (banned by Biome rule from story-61). Specify `transition-[opacity,transform]`.
- File size < 400 LOC enforced.
- This serves demo-shape Stage 2 indirectly by setting expectations the modal then confirms.
