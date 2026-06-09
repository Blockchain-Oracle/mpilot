# Story 76 — Checkout flow at /checkout/:orderId

**Epic:** Epic 4 — Web App
**Estimated:** ~2h
**Depends on:** story-68-dashboard-shell, story-36-order-intent-endpoint, story-46-intent-open-position

## BDD Acceptance Criteria

```
Given a user is redirected from a merchant SDK to /checkout/:orderId
When the page renders
Then the order intent is fetched via GET /orders/:id (from Epic 2)
And a modal-style flow displays inside <Modal>:
  - Item summary: name, image, price in USD
  - Merchant: name + <ReputationBadge>
  - Yield math block (reuse `<YieldMathViz>` from story-64, which fetches live rates from `/api/rates`): renders a sentence template parameterized by the live numbers — e.g. *"Your sUSDe is yielding {susdeApy}% APY. Patron borrows ${orderAmount} USDC against it at {usdcBorrowApr}% APR via Aave Mantle E-Mode 1. Net carry: {spreadPp}pp — your collateral covers the loan cost."* — NEVER hardcode specific rate numbers; the modal must render whatever `/api/rates` returns. While loading, render the template with skeleton placeholders.
  - Fee comparison line (small, beneath confirm): "vs Klarna: $X estimated fees over the same period"
  - Big <PatronButton variant="primary" size="lg">Confirm purchase</PatronButton>

Given the user is not wallet-connected
When they land on /checkout/:orderId
Then they are redirected to /connect?next=/checkout/:orderId

Given the user clicks "Confirm purchase"
When the click registers
Then a POST to /orders/:id/confirm is issued (triggers Epic 3 agent decision flow)
And the modal shows a loading state with copy "Your agent is working: verifying merchant, opening loan, paying $X..." with a sub-agent progress tree (compact version of <ActivityFeed>)
And on success the modal switches to "Done. Item paid. Receipt: <tx hash>" with a CTA "View receipt" → /audit/:txHash AND "Back to dashboard" → /app/dashboard

Given the agent decision returns a decline (e.g., merchant not whitelisted, health factor too low)
When the failure response arrives
Then the modal shows the decline reason in plain English + a CTA "Adjust permissions" → /app/agent

Given Playwright runs apps/web/e2e/checkout-flow.spec.ts
When the spec executes with mocked order intent + agent flow
Then the modal renders all elements, confirm triggers POST, success state shows receipt link
```

## File modification map

- `apps/web/app/checkout/[orderId]/page.tsx` — NEW — `"use client"`; modal-style page (full-viewport on mobile, centered modal on desktop).
- `apps/web/components/checkout/CheckoutModal.tsx` — NEW — composition of order summary + yield math + confirm.
- `apps/web/components/checkout/AgentProgressTree.tsx` — NEW — compact `<ActivityFeed>` showing in-flight sub-agent steps.
- `apps/web/components/checkout/CheckoutSuccess.tsx` — NEW — post-success state with receipt link.
- `apps/web/components/checkout/CheckoutDecline.tsx` — NEW — decline-state UI.
- `apps/web/lib/hooks/useOrderIntent.ts` — NEW — TanStack Query hook GET /orders/:id.
- `apps/web/lib/hooks/useConfirmOrder.ts` — NEW — TanStack Query mutation POST /orders/:id/confirm + SSE subscription for sub-agent progress.
- `packages/ui/src/CheckoutModal/CheckoutModal.tsx` — NEW (alternative location if shared with mini app via packages/ui).
- `apps/web/e2e/checkout-flow.spec.ts` — NEW — Playwright spec.

## Shell verification

```bash
pnpm --filter web build
test $? -eq 0

# Route exists
test -f apps/web/app/checkout/\[orderId\]/page.tsx

# Components
test -f apps/web/components/checkout/CheckoutModal.tsx
test -f apps/web/components/checkout/AgentProgressTree.tsx
test -f apps/web/components/checkout/CheckoutSuccess.tsx
test -f apps/web/components/checkout/CheckoutDecline.tsx

# 400-LOC
for f in apps/web/components/checkout/*.tsx; do
  wc -l "$f" | awk '{ if ($1 > 400) exit 1 }'
done

# Playwright
pnpm playwright test apps/web/e2e/checkout-flow.spec.ts
test $? -eq 0
```

## Notes

- **Anchor: Stripe Checkout + Klarna widget** — modal pattern; clean confirm step; visible fee/yield math.
- The yield math copy **mirrors PRD § Demo moment Stage 2 framing** ("cost-of-credit floor: collateral yield covers borrow interest") but renders **live numbers from `/api/rates`** (story-64), NOT hardcoded values. Judges see the same framing the PRD describes; the actual rates shown are whatever Aave Oracle + DefiLlama report at render time.
- The fee comparison line is the moat: Klarna costs you 23.99% APR; Patron has a near-zero cost-of-credit floor (sUSDe yield covers USDC borrow interest, live spread shown). Compute Klarna comparison server-side using the standard 23.99% APR over the projected loan period; compare against the live Patron net cost.
- Sub-agent progress tree (`<AgentProgressTree>`) is the live version of the activity feed — shows 4-6 sub-steps in real time as the agent executes (merchant verify → health check → openLoan → Aave borrow → pay merchant → ERC-8004 receipt). Each step has a spinner → checkmark.
- SSE endpoint from Epic 2 streams progress; if not ready, poll `/orders/:id` every 1s and note as TODO.
- On success, do NOT auto-redirect — let the user click "View receipt" or "Back to dashboard" themselves (gives them control).
- Decline UI is critical: a hard "no" is fine, but the reason MUST be in plain English (judges can verify the agent declines for sound reasons).
- Banned Tailwind classes auto-checked.
- File size < 400 LOC per file enforced.
- **Serves demo-shape Stage 2 critically** — judge sees yield math + confirms. The 90-second demo passes through this screen.
