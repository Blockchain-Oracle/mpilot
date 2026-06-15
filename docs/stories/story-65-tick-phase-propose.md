# Story — `propose()` tick phase (insert proposal row + emit SSE event)

**ID:** story-65-tick-phase-propose
**Epic:** Epic E5 — Agent Runtime
**Depends on:** story-62-tick-loop-orchestrator, story-64-tick-phase-simulate, story-69-postgres-drizzle-schemas
**Estimate:** ~45min
**Status:** PENDING

---

## User story

**As a** mPilot tick orchestrator
**I want to** a `runPhase('propose', plan, sim)` function creates a `proposals` row in Postgres, decides if user approval is required (per policy + amount), and emits an SSE event to the user's connected web session
**So that** the user gets a real-time proposal card in the dashboard AND the agent runtime knows whether to proceed (auto-approved) or wait (manual-approval)

---

## File modification map

- `packages/runtime/src/phases/propose.ts` — NEW — `runPropose(plan, sim, state, opts)` inserts a `proposals` row with `{ agentId, planJson, simJson, kind, amountUsd, status: 'pending', expiresAt: now + 1hr, requiresApproval: <bool> }`. Decides `requiresApproval` via: amountUsd > policy.autoApprovalThresholdUSD (default $50) OR sim.deltaState.healthFactorAfter < policy.hfFloor*1.1 (within 10% of floor) OR riskFlagged. Emits SSE event `proposal.created` to the user's connected channel (via Redis pub/sub → web app SSE handler).
- `packages/runtime/src/phases/proposalSchema.ts` — NEW — Zod schemas for Proposal + ProposalDecision
- `packages/runtime/src/phases/__tests__/propose.test.ts` — NEW — unit tests: small action (< $50) gets requiresApproval=false; large action gets requiresApproval=true; near-HF-floor gets requiresApproval=true; pub/sub event payload shape

---

## Acceptance criteria (BDD)

```
Given runPropose is called with a $25 supply action + healthy HF projection
When the function runs
Then a proposals row is inserted with requiresApproval=false (auto-approved by policy); status='pending'; expiresAt is now + 1hr

Given runPropose with a $100 supply action (over $50 threshold)
When the function runs
Then requiresApproval=true; status='pending'; the SSE event 'proposal.created' is emitted with the proposal payload

Given runPropose where projected HF is 1.55 and floor is 1.5
When checked
Then requiresApproval=true (within 10% buffer of the floor triggers manual review)

Given runPropose where simulate flagged riskFlagged
When checked
Then requiresApproval=true regardless of amount

Given the SSE event payload
When emitted via Redis pub/sub on channel `user:${userId}:proposals`
Then payload contains { proposalId, kind, amountUsd, projectedHfBefore, projectedHfAfter, hypothesis }

Given runPropose returns
When the orchestrator continues
Then if requiresApproval=true → tick returns `{ phase: 'propose', awaiting: proposalId }`; if false → tick proceeds to execute

Given a proposal that exists already for this agent
When runPropose is called again (e.g., re-tick before user resolves the prior proposal)
Then it does NOT create a duplicate; it returns the existing proposal's id with status='already_pending' (idempotent — Postgres unique constraint on (agentId, status='pending'))

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd packages/runtime
test -f src/phases/propose.ts
test -f src/phases/proposalSchema.ts

cd ../..

pnpm --filter @mpilot/agent run build
test $? -eq 0

# Auto-approval threshold check is present
grep -qE "autoApprovalThresholdUSD|autoApproval" packages/runtime/src/phases/propose.ts

# Tests pass
pnpm --filter @mpilot/agent run test 2>&1 | grep "propose" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Auto-approval threshold** lives in user policy (default $50 per `research/concierge/04-agent-runtime.md` § Open questions). User can tighten ($0 = always require approval) or loosen ($500 = aggressive autopilot) per their risk tolerance.
- **HF-floor proximity check** (within 10% buffer) catches actions that would land RIGHT at the floor — those are risky even if they don't strictly violate. Better to ask the user once than auto-execute into a near-liquidation state.
- **SSE event via Redis pub/sub** decouples the worker process from the web app. The worker publishes; the web app's SSE handler subscribes; the user's browser receives. No direct worker→web HTTP call.
- **Idempotence via unique constraint**: Postgres unique index on `(agentId, status)` where status='pending' prevents duplicate pending proposals. If the agent re-ticks before the user resolves, return the existing proposal.
- **`expiresAt` = now + 1hr** default. If the user doesn't approve/reject within 1 hour, the proposal auto-cancels and the next tick re-plans. Reference: `research/concierge/04-agent-runtime.md` § 6 risks/mitigations.
- **NO LLM call in this phase.** Pure decision logic against thresholds. Fast (< 100ms per call).
- Cross-ref: `research/concierge/04-agent-runtime.md` § 3 propose row.
