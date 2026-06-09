# Story — Proposal card component (before/after state + hypothesis + action surface)

**ID:** story-109-proposal-card
**Epic:** Epic E7 — Web App
**Depends on:** story-107-app-dashboard-shell, story-65-tick-phase-propose
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** Concierge user reviewing a pending proposal
**I want to** a proposal card shows: agent's hypothesis (why), before/after state preview (what changes), action details (which protocol, how much), expiresAt countdown, primary "Approve" + secondary "Reject" CTAs
**So that** I can make a 5-second informed decision: approve when the hypothesis matches my goal, reject when something feels off

---

## File modification map

- `apps/web/components/dashboard/ProposalCard.tsx` — NEW — composed of: HypothesisSection, BeforeAfterDiff, ActionDetails, CountdownBadge, ActionButtons
- `apps/web/components/dashboard/BeforeAfterDiff.tsx` — NEW — two-column visual showing portfolio state delta (USDC balance, sUSDe balance, HF, debt) with arrows + colored deltas
- `apps/web/components/dashboard/HypothesisSection.tsx` — NEW — renders the LLM-generated hypothesis with proper typography (legible body, not a console-log dump)
- `apps/web/components/dashboard/ActionDetails.tsx` — NEW — collapsed by default; shows tx calldata + target contract + amount when expanded
- `apps/web/components/dashboard/CountdownBadge.tsx` — NEW — live countdown to expiresAt; turns red when < 5min remaining
- `apps/web/components/dashboard/__tests__/ProposalCard.test.tsx` — NEW — RTL test with fixture proposals (small, large, near-expiry)
- `apps/web/components/dashboard/__tests__/BeforeAfterDiff.test.tsx` — NEW — RTL test for delta rendering

---

## Acceptance criteria (BDD)

```
Given a proposal with hypothesis "Carry positive at 4.2%; supplying 100 USDC to maximize yield"
When ProposalCard renders
Then the HypothesisSection displays the full hypothesis text in a legible body style (≥14px, line-height ≥ 1.5)

Given a proposal with deltaState { healthFactorBefore: 2.0, healthFactorAfter: 1.8 }
When BeforeAfterDiff renders
Then it shows "HF: 2.0 → 1.8" with the after value styled to indicate the decrease (e.g., color-coded but NOT red — it's not an alarm)

Given a proposal where HF would drop below floor
When BeforeAfterDiff renders
Then the after value is styled in alarm color (red); the card displays a warning badge

Given a proposal expiring in 4 minutes
When CountdownBadge renders
Then it shows "4m 23s" in alarm color (red) — visually distinct from normal countdown

Given a proposal expiring in 50 minutes
When CountdownBadge renders
Then it shows "49m 12s" in neutral color

Given the approve button is clicked
When the click fires
Then POST /api/proposals/${id}/approve is called AND on success, the card transitions to "approved" state (NOT removed — kept for audit history)

Given the reject button is clicked
When the click fires
Then a confirmation modal appears (rejection is non-trivial); on confirm, POST /api/proposals/${id}/reject is called

Given the ActionDetails is collapsed by default
When the user clicks "Show details"
Then the calldata + target contract + value are revealed; "Show details" becomes "Hide details"

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC

Given the countdown updates
When 1 second passes
Then the displayed time decreases by 1 second (the countdown is live, not stale on render)
```

---

## Shell verification

```bash
cd apps/web
test -f components/dashboard/ProposalCard.tsx
test -f components/dashboard/BeforeAfterDiff.tsx
test -f components/dashboard/HypothesisSection.tsx
test -f components/dashboard/ActionDetails.tsx
test -f components/dashboard/CountdownBadge.tsx

cd ../..

pnpm --filter @concierge/web run build
test $? -eq 0

# Tests pass
pnpm --filter @concierge/web run test 2>&1 | grep -E "(ProposalCard|BeforeAfterDiff)" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **The hypothesis is the trust primitive.** A user reading "Carry positive at 4.2%" understands WHY the agent wants to act. A user reading "Action recommended" doesn't. Don't truncate the hypothesis aggressively — it's literally the most important text in this component.
- **Before/after diff for HF and balances** is the second trust primitive. Numbers don't lie. Showing "HF 2.0 → 1.8" before clicking approve is what separates Concierge from "trust the AI" UIs.
- **Color semantics matter.** HF dropping from 2.0 → 1.8 is NOT red (it's still safe). HF dropping below the floor IS red. Don't conflate "decreased" with "dangerous."
- **Countdown is live**, not snapshot-on-render. Use a 1s interval (or `useEffect` with `setInterval`) to update. Cleanup the interval on unmount to prevent leaks.
- **Rejection requires confirmation**, approval doesn't. Approving is reversible (you can revoke the session key, manually undo); rejection means the proposal is gone — agent might re-plan and miss the window.
- **ActionDetails is collapsed by default** to avoid overwhelming. Power users / judges click to expand and verify the calldata. Don't HIDE — they need to see the underlying tx.
- **Live tx hash + Mantlescan link** appears in the "approved" state after execute confirms (story-66 records the txHash).
- Cross-ref: `research/concierge/08-ux-component-intent.md` § proposal card, story-65 (proposal data shape).
