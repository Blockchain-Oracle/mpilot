# Story 87 — Mini App checkout flow (/checkout/:orderId)

**Epic:** Epic 5 — Telegram Mini App
**Estimated:** ~2h
**Depends on:** story-86-mini-merchant-directory, story-76-checkout-flow-page

## BDD Acceptance Criteria

```
Given an authenticated user lands on /checkout/:orderId (via deep-link, story-88, or in-app navigation)
When apps/mini/app/checkout/[orderId]/page.tsx renders
Then the page fetches the order intent via GET /orders/:orderId
And displays:
  - Item summary (name, image, price)
  - Merchant block with <ReputationBadge>
  - Yield math copy **mirrors PRD Demo moment Stage 2 framing** but renders **live numbers from `/api/rates`** (story-64): template like *"Your sUSDe is yielding {susdeApy}% APY. We'll borrow ${orderAmount} USDC against it at {usdcBorrowApr}% APR via Aave Mantle E-Mode 1. Net carry: {spreadPp}pp — your collateral covers the loan cost, so you keep the item AND your sUSDe stays in your wallet."* NEVER hardcode rate numbers; the template must render whatever the rates API returns. While loading, show the template with skeleton placeholders.
  - Klarna comparison line (small) beneath
  - TG MainButton labeled "Confirm purchase" — Patron brand color (`#1E40AF`)

Given the user is not authenticated
When they land on /checkout/:orderId
Then they are redirected to /onboarding?next=/checkout/:orderId

Given the user taps the TG MainButton
When the press registers
Then a POST /orders/:orderId/confirm fires (Epic 3 trigger)
And the screen switches to an <AgentProgressTree> showing the sub-agent steps (verify merchant → health check → openLoan → Aave borrow → pay merchant → ERC-8004 receipt)
And TG MainButton becomes disabled with progress text "Agent is working…"

Given the agent completes successfully
When the success event arrives via SSE / poll
Then the screen shows "Done. Item paid." + receipt CTA → /audit/:txHash (web)
And `WebApp.HapticFeedback.notificationOccurred('success')` fires
And TG MainButton text changes to "Back to dashboard" → routes to /

Given the agent declines
When the decline reason arrives
Then a plain-English explanation displays + CTA "Adjust permissions" → /agent
And `WebApp.HapticFeedback.notificationOccurred('error')` fires

Given the order intent is expired or invalid
When the fetch returns 404 / 410
Then a friendly empty state shows: "This checkout link has expired" + CTA → /merchants

Given Playwright runs apps/mini/e2e/checkout.spec.ts
When the spec executes with mocked Privy + API + SSE
Then the full flow (load → confirm → progress → success) renders correctly
```

## File modification map

- `apps/mini/app/checkout/[orderId]/page.tsx` — NEW — `"use client"`; auth-gated; orchestrates fetch + confirm + progress + result states.
- `apps/mini/components/checkout/MiniCheckoutSummary.tsx` — NEW — item + merchant + yield math + Klarna comparison; reuses `<ReputationBadge>` and `<YieldMathViz>` (story-64) from packages/ui.
- `apps/mini/components/checkout/MiniAgentProgress.tsx` — NEW — mobile-optimized progress tree (one step per row, spinner → checkmark).
- `apps/mini/components/checkout/MiniCheckoutSuccess.tsx` — NEW — success state with receipt CTA.
- `apps/mini/components/checkout/MiniCheckoutDecline.tsx` — NEW — decline state with adjust-permissions CTA.
- `apps/mini/components/checkout/MiniCheckoutExpired.tsx` — NEW — expired-intent state.
- `apps/mini/lib/hooks/useOrderIntent.ts` — NEW — TanStack Query GET /orders/:id.
- `apps/mini/lib/hooks/useConfirmOrder.ts` — NEW — TanStack Query mutation POST /orders/:id/confirm + SSE subscription for sub-agent progress (poll fallback every 1s).
- `apps/mini/e2e/checkout.spec.ts` — NEW — Playwright spec.

## Shell verification

```bash
pnpm --filter mini build
test $? -eq 0

# Route + components
test -f "apps/mini/app/checkout/[orderId]/page.tsx"
test -f apps/mini/components/checkout/MiniCheckoutSummary.tsx
test -f apps/mini/components/checkout/MiniAgentProgress.tsx
test -f apps/mini/components/checkout/MiniCheckoutSuccess.tsx
test -f apps/mini/components/checkout/MiniCheckoutDecline.tsx

# MainButton drives confirm
grep -q "useMainButton" "apps/mini/app/checkout/[orderId]/page.tsx" || grep -q "useMainButton" apps/mini/components/checkout/MiniCheckoutSummary.tsx

# Verbatim PRD yield math copy present (canary)
grep -q "Net carry: +7 percentage points" apps/mini/components/checkout/MiniCheckoutSummary.tsx

# Playwright
pnpm playwright test apps/mini/e2e/checkout.spec.ts
test $? -eq 0

# 400-LOC
for f in $(find apps/mini/components/checkout "apps/mini/app/checkout" -type f \( -name "*.ts" -o -name "*.tsx" \)); do
  wc -l "$f" | awk '{ if ($1 > 400) exit 1 }'
done
```

## Notes

- **TG MainButton is THE primary CTA pattern** for the mini checkout — bottom of viewport, full-width, brand color. This is the bottom-action-bar convention from ux-spec anchors (TON Wallet + Hamster Kombat).
- Yield math copy MUST be verbatim from PRD Demo moment Stage 2 — judges expect this exact framing. Don't paraphrase.
- The Klarna comparison line is computed server-side using standard 23.99% APR — show the savings explicitly.
- The progress tree is the live ERC-8004-bound choreography. Each step has a spinner → checkmark with the receipt link appearing when the last step (ERC-8004) completes.
- The success state opens `/audit/:txHash` via `WebApp.openLink` (browser tab, not inside TG) so the user sees the full receipt page (story-77).
- The decline state must explain WHY in plain English (merchant not whitelisted, health factor too low, etc.) — agent transparency is the moat.
- SSE preferred; polling fallback every 1s if SSE isn't ready in Epic 2.
- Expired-intent handling matters because deep-links from web (story-88) may be stale.
- File size < 400 LOC per file enforced.
- **Serves demo-shape Stages 2-5 in mini surface** — if judges flip to mobile, this carries the demo.
