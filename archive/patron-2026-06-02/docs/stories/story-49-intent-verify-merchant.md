# Story 49 — Intent handler: VerifyMerchant (reputation + bond + sanction + on-chain history)

**Epic:** Epic 3 — Agent Decision Engine
**Estimated:** ~1.5h
**Depends on:** story-41-agent-context-loader, story-44-tool-external-apis, story-16-merchant-registry-tests

## BDD Acceptance Criteria

```
Given a queued agent_task with intent='VerifyMerchant' and input={merchantId}
When `runVerifyMerchantIntent(task)` is called
Then it invokes `runAgent` with tools: [getMerchantReputation, sanctionScreen, nansenAddressLabels]
And the per-intent prompt instructs: 1) read on-chain reputation, 2) verify bond is posted, 3) sanction-screen the merchant's evm_address, 4) check Nansen labels for risk markers, 5) approve or flag

Given the merchant passes all checks (reputation ≥ MIN_MERCHANT_REPUTATION, bond posted, no sanction match, no high-risk Nansen labels)
When the agent processes the intent
Then the final answer is `{ decision: 'approve', score: number, checks: { reputation, bondVerified, sanctionClear, nansenClear } }`
And the merchants row is updated with status='active' and verified_at=now()
And the ERC-8004 receipt is logged with action='VerifyMerchant' + success=true

Given the merchant's address matches an OFAC SDN entry OR a Chainalysis sanction list
When sanctionScreen returns sanctioned=true
Then the agent immediately returns `{ decision: 'flag', reason: 'sanction_match', matchedLists }`
And the merchants row is updated with status='suspended' and suspended_reason='sanction_match'
And NO further tool calls are made (early-exit per security domain §1 — sanction match is non-negotiable)
And an events row is written with event_name='MerchantSanctionFlagged'

Given the merchant bond is missing or below MIN_BOND_USDC (default 100)
When the agent reads `MerchantRegistry.getBond(merchantId)`
Then it returns `{ decision: 'flag', reason: 'insufficient_bond', requiredUsdc, actualUsdc }`
And the merchants row remains status='pending' (NOT suspended — merchant can post more bond)

Given Nansen labels include any of HIGH_RISK_LABELS (mixer, exploiter, sanctioned-adjacent, phishing)
When the agent processes the response
Then it returns `{ decision: 'flag', reason: 'nansen_high_risk', labels }`
And the merchants row is updated with status='suspended' and suspended_reason='nansen_high_risk'
And a manual review notification is created for ops
```

## File modification map

- `apps/api/src/agent/intents/verifyMerchant.ts` — NEW — `runVerifyMerchantIntent(task)`; orchestrates the check pipeline via runAgent
- `apps/api/src/agent/prompts/verifyMerchant.ts` — NEW — per-intent prompt with explicit early-exit instruction on sanction match
- `apps/api/src/agent/intents/verifyResultSchema.ts` — NEW — Zod schema for { decision: 'approve'|'flag', reason?, score?, checks?, matchedLists? }
- `apps/api/src/agent/intents/merchantUpdater.ts` — NEW — pure DB helper `updateMerchantStatus(merchantId, status, reason?)` writes the row + emits events row
- `apps/api/src/jobs/runVerifyMerchantJob.ts` — NEW — BullMQ worker for `verify-merchant` queue
- `apps/api/src/queues/verifyMerchantQueue.ts` — NEW — queue + `enqueueVerifyMerchant(merchantId)` called from POST /merchants (story-34) after bond detected, AND from openPosition intent (story-46) on first encounter with an unverified merchant
- `apps/api/src/agent/intents/__tests__/verifyMerchant.test.ts` — NEW — Vitest: (1) approve all clear, (2) flag sanction match, (3) flag insufficient bond, (4) flag nansen high-risk labels
- `apps/api/src/lib/highRiskLabels.ts` — NEW — exported const array `HIGH_RISK_LABELS = ['mixer', 'exploiter', 'sanctioned', 'sanctioned-adjacent', 'phishing', 'rug-pull', 'honeypot']`
- `apps/api/src/db/schema/merchants.ts` — UPDATE — add `verified_at`, `suspended_reason` columns + migration

## Shell verification

```bash
cd apps/api

# Files exist
test -f src/agent/intents/verifyMerchant.ts
test -f src/agent/prompts/verifyMerchant.ts
test -f src/lib/highRiskLabels.ts

# Sanction-match early exit documented
grep -q "sanction\|early-exit\|early_exit" src/agent/prompts/verifyMerchant.ts

# High-risk labels enumerated
grep -q "mixer\|exploiter\|phishing" src/lib/highRiskLabels.ts

# Min bond threshold
grep -q "MIN_BOND_USDC\|100" src/agent/prompts/verifyMerchant.ts

# Tests pass
pnpm vitest run src/agent/intents/__tests__/verifyMerchant.test.ts
test $? -eq 0

# Typecheck
pnpm typecheck
test $? -eq 0
```

## Notes

- Per design spec §6, VerifyMerchant is the agent's fourth "real decision": cross-checks reputation, bond status, on-chain history, sanction screen. Approves or flags. This is the gate that protects users from merchants the protocol does not vouch for.
- Per security domain §3.5 (Sybil reputation farming on ERC-8004): reputation alone is insufficient — bond + sanction + Nansen labels add multi-source signals that a Sybil cluster cannot cheaply forge.
- Per security domain §1 (Bybit / WazirX): sanction match is non-negotiable. The prompt explicitly instructs early-exit so the agent does NOT continue evaluating after a sanction hit (no "but the reputation is high" reasoning).
- This intent is invoked in two contexts: (a) at merchant onboarding (POST /merchants, after bond posted), (b) lazily when openPosition first sees an unverified merchant. Caching: skip if merchant.verified_at is within 7 days.
- `HIGH_RISK_LABELS` is a versioned constant. Adding labels means updating the test fixtures + this constant in the same commit so the agent's decision boundary is reviewable.
- `MIN_BOND_USDC = 100` is conservative for the demo; raise for Mainnet. Stored on-chain in `MerchantRegistry`.
- The "flag" decisions write a `notifications` row + `events` row so ops can review; `approve` flips status to active. Suspension is reversible (merchant can post more bond + request re-verification).
- File MUST stay under 400 LOC each.
