# Story 51 — Intent handler: HandleDispute (evidence collection + ERC-8004 attestation)

**Epic:** Epic 3 — Agent Decision Engine
**Estimated:** ~2h
**Depends on:** story-46-intent-open-position, story-52-erc8004-receipt-logging

## BDD Acceptance Criteria

```
Given a user POSTs `/disputes` with { orderId, claim: { type: 'not_delivered'|'damaged'|'refund_owed'|'unauthorized', description, evidenceUris[] } }
When the api handler runs
Then a dispute row is inserted with status='open'
And an agent_task with intent='HandleDispute' and input={disputeId, orderId, claim} is enqueued
And the api returns `{ disputeId, status: 'open', estimatedReviewSeconds: 120 }` immediately

Given a queued agent_task with intent='HandleDispute'
When `runHandleDisputeIntent(task)` is called
Then it invokes `runAgent` with tools: [getPosition, getMerchantReputation, chainlinkPriceProof, nansenAddressLabels]
And the per-intent prompt instructs: 1) load order + merchant context, 2) review evidence URIs, 3) check merchant's prior dispute history, 4) propose a resolution
And max_iterations=10 (disputes are reasoning-heavy)

Given the agent reaches a resolution
When it returns the final answer
Then the schema is `{ resolution: 'side_with_user'|'side_with_merchant'|'split'|'escalate', rationale: string, requestedAction: { type, amountUsdc?, recipient? }, attestationPayload: object }`
And the dispute row is updated with resolution + agent_rationale
And an ERC-8004 attestation entry is written via story-52's logger with action='HandleDispute' + payload=attestationPayload
And BOTH parties (user + merchant) receive notifications with the resolution + link to the receipt URI

Given the resolution is 'side_with_user' AND requestedAction.type === 'refund'
When the dispute resolution is finalized
Then a separate refund flow is triggered (NOT automatic — written to a `pending_refunds` queue for ops review since user funds are involved)
And the dispute row is marked status='resolved-pending-refund'
And no automatic on-chain tx is broadcast by THIS intent (deferred to ops or to a separate `executeRefund` intent in v2)

Given evidence URIs include a URL that fetches malicious content (HTML, JS, oversized file)
When the agent's evidence-fetch helper runs
Then the helper enforces: max 5MB, Content-Type allowlist (image/*, application/pdf, text/plain), 10s fetch timeout
And out-of-policy responses are returned to the agent as `{ error: 'evidence_blocked', reason, uri }`
And the agent's reasoning continues without the blocked evidence (NOT a hard failure)
```

## File modification map

- `apps/api/src/agent/intents/handleDispute.ts` — NEW — `runHandleDisputeIntent(task)`; orchestrates the dispute review flow
- `apps/api/src/agent/prompts/handleDispute.ts` — NEW — per-intent prompt: 4-step review tree (load → evidence → merchant history → resolution); explicit fairness instruction (no automatic side-with-user / side-with-merchant bias)
- `apps/api/src/agent/intents/disputeResultSchema.ts` — NEW — Zod schema for resolution output
- `apps/api/src/agent/tools/evidence/fetchEvidence.ts` — NEW — tool def + handler: safe HTTP fetch with size/type/timeout guards; returns `{ uri, contentType, sizeBytes, contentSummary }` for the agent
- `apps/api/src/db/schema/disputes.ts` — NEW — Drizzle table: id, order_id, user_id, merchant_id, claim_type, description, evidence_uris jsonb, status, resolution, agent_rationale, agent_task_id, created_at, resolved_at
- `apps/api/src/db/schema/pendingRefunds.ts` — NEW — Drizzle table: id, dispute_id, order_id, amount_usdc, recipient, status, ops_reviewer, created_at
- `apps/api/src/routes/disputes.ts` — NEW — `POST /disputes` (enqueues HandleDispute task), `GET /disputes/:id` (status + resolution)
- `apps/api/src/jobs/runHandleDisputeJob.ts` — NEW — BullMQ worker for `handle-dispute` queue
- `apps/api/src/queues/handleDisputeQueue.ts` — NEW — queue + `enqueueHandleDispute(disputeId)`
- `apps/api/src/agent/intents/__tests__/handleDispute.test.ts` — NEW — Vitest with recorded fixtures: (1) side_with_user refund flow → pending_refunds row, (2) side_with_merchant decision → dispute resolved, (3) escalate with high-value claim, (4) evidence_blocked path (oversized URL) → agent still resolves

## Shell verification

```bash
cd apps/api

# Files exist
test -f src/agent/intents/handleDispute.ts
test -f src/agent/prompts/handleDispute.ts
test -f src/db/schema/disputes.ts
test -f src/db/schema/pendingRefunds.ts
test -f src/routes/disputes.ts
test -f src/agent/tools/evidence/fetchEvidence.ts

# Evidence fetch guards (size + type + timeout)
grep -q "5.*1024.*1024\|MAX_EVIDENCE_SIZE" src/agent/tools/evidence/fetchEvidence.ts
grep -q "image/\\*\\|application/pdf\\|allowlist" src/agent/tools/evidence/fetchEvidence.ts
grep -q "10000\\|10_000\\|timeout" src/agent/tools/evidence/fetchEvidence.ts

# No automatic on-chain refund — pending_refunds queue used
grep -q "pending_refunds\\|status.*resolved-pending" src/agent/intents/handleDispute.ts
! grep -q "writeContract.*refund\\|broadcast.*refund" src/agent/intents/handleDispute.ts

# ERC-8004 attestation logged
grep -q "logReputationEntry\\|attestationPayload" src/agent/intents/handleDispute.ts

# Tests pass
pnpm vitest run src/agent/intents/__tests__/handleDispute.test.ts
test $? -eq 0

# Typecheck
pnpm typecheck
test $? -eq 0
```

## Notes

- Per design spec §6, HandleDispute is the agent's sixth "real decision": collects evidence, posts ERC-8004 attestation, can mediate between user + merchant. This is the intent that makes Patron a trust system, not just a payment rail.
- Per security domain §2 (BNPL friendly-fraud): 62% of merchants report first-party misuse / friendly fraud. The dispute flow must NOT be a one-sided user-wins system — the agent reviews evidence + merchant history + makes a fair call. Bias toward neither party is explicit in the prompt.
- Per security domain §3.5 (Sybil): a user who repeatedly opens disputes with identical patterns is itself a signal — the agent reads the user's dispute history (NOT modeled in this story; v2 adds user reputation score).
- Per design spec §9 (security posture): user funds are sensitive. The agent does NOT automatically broadcast refund txs — `pending_refunds` queue routes through ops review. This is a conscious safety vs. UX tradeoff for v1.
- The evidence-fetch tool is a security boundary: untrusted URLs from dispute filers MUST NOT cause SSRF, oversized downloads, or content-type confusion. The 5MB / allowlist / 10s guards are the defense.
- ERC-8004 attestation payload includes: dispute_id, resolution, evidence_hashes (NOT content), agent_rationale. The receipt URI is the canonical record both parties can cite. Per security domain §3.7 (cross-agent collusion), attestation is signed by the user's agent identity — third parties can verify the signer.
- Max iterations 10 (higher than other intents) because dispute reasoning may need multiple tool calls + reflection rounds.
- File MUST stay under 400 LOC each.
