# Story — Approval flow API + state machine (proposal → approve → execute trigger)

**ID:** story-110-approval-flow
**Epic:** Epic E7 — Web App
**Depends on:** story-109-proposal-card, story-69-postgres-drizzle-schemas
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** mPilot user
**I want to** clicking "Approve" on a proposal triggers a clean state machine: client-side optimistic update → POST /api/proposals/[id]/approve → DB transition to 'approved' → BullMQ job enqueued for execute → next tick picks it up → live tick stream shows execute starting
**So that** the approve action feels instant (optimistic) but is durable (DB-persisted) and ties cleanly into the tick orchestrator

---

## File modification map

- `apps/web/app/api/proposals/[id]/approve/route.ts` — NEW — POST handler. Validates auth + ownership; DB transaction: SELECT proposal FOR UPDATE → check status='pending' → UPDATE status='approved' + resolvedAt=now → INSERT a BullMQ job `execute-proposal:${proposalId}`. Returns 200.
- `apps/web/app/api/proposals/[id]/reject/route.ts` — NEW — POST handler. Validates auth + ownership; UPDATE status='rejected' + resolvedAt=now. Returns 200.
- `apps/web/lib/hooks/useApproveProposal.ts` — NEW — TanStack Mutation hook with optimistic update + rollback on failure
- `apps/web/lib/state-machine/proposal.ts` — NEW — typed state transitions: `pending → approved | rejected | expired`. Throws on invalid transition.
- `packages/runtime/src/executeApprovedProposal.ts` — NEW — BullMQ job handler that calls runExecute() (story-66) for the approved proposal
- `apps/web/app/api/proposals/[id]/approve/__tests__/route.test.ts` — NEW — integration test against test DB

---

## Acceptance criteria (BDD)

```
Given a pending proposal owned by the authenticated user
When POST /api/proposals/[id]/approve is called
Then the DB transitions the proposal to status='approved', sets resolvedAt, enqueues a BullMQ execute job, returns 200

Given a proposal owned by a DIFFERENT user
When the request is made
Then it returns 403 (NOT 200 — ownership check)

Given a proposal with status='expired'
When the approve route is called
Then it returns 409 (NOT 200 — state machine refuses approve→expired transition)

Given a proposal with status='approved' (already approved, race condition)
When approve is called again
Then it returns 409 (idempotent rejection; NOT double-enqueue an execute job)

Given the optimistic update succeeds
When the API call returns 200
Then the UI updates to reflect 'approved' status WITHOUT re-fetching (the optimistic update was correct)

Given the optimistic update succeeds but API returns 409
When the rollback runs
Then the UI reverts to 'pending' AND a toast shows "Already approved or expired"

Given the BullMQ execute job is enqueued
When the runtime worker picks it up
Then runExecute(proposal) is called within 5s (Redis lock contention notwithstanding)

Given the state machine
When transitioning pending → approved → executed → recorded
Then each transition is logged in `proposals.statusHistory` (jsonb array of {status, timestamp}) for audit

Given the optimistic update
When the user disconnects mid-approval
Then on reconnect, the canonical state is fetched from DB (NOT the optimistic state retained)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd apps/web
test -f app/api/proposals/\[id\]/approve/route.ts
test -f app/api/proposals/\[id\]/reject/route.ts
test -f lib/hooks/useApproveProposal.ts
test -f lib/state-machine/proposal.ts

cd ../..

test -f packages/runtime/src/executeApprovedProposal.ts

pnpm --filter @mpilot/web run build
test $? -eq 0

# Ownership check
grep -qE "(403|ownership|userId)" apps/web/app/api/proposals/\[id\]/approve/route.ts

# State machine refuses invalid transitions
grep -qE "(409|invalid.*transition|already)" apps/web/lib/state-machine/proposal.ts

# Tests pass
pnpm --filter @mpilot/web run test 2>&1 | grep "approve" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **`SELECT FOR UPDATE` in the DB transaction** is the canonical pattern to prevent the race condition where two simultaneous approve requests both see status='pending' and both enqueue execute jobs. The FOR UPDATE locks the row; second request blocks until first commits, then sees status='approved' and returns 409.
- **Ownership check via Privy session** — the user's Privy DID → users.id → agents.userId → proposals.agentId. Single SQL join.
- **Optimistic update via TanStack Mutation**: set the proposal status to 'approved' in the local cache immediately; the API call runs in parallel; on 200, the cache is correct; on 4xx, rollback.
- **statusHistory as jsonb array** lets the dashboard show the full audit trail without a separate audit table. Schema: `[{ status: 'pending', at: ISO }, { status: 'approved', at: ISO }, ...]`.
- **NEVER double-enqueue execute jobs.** This is the single most dangerous race condition in the wedge. Double-execute = double-spend in DeFi. The DB lock + state machine 409 are the two layers of defense.
- **Reject is simpler** — no execute job to enqueue; just transition state. But still ownership-checked and state-machine-validated.
- **The execute job ID** is `execute-proposal:${proposalId}`. BullMQ dedupes by job ID; so even if for some reason the API double-enqueues, BullMQ only processes once.
- Cross-ref: `research/concierge/04-agent-runtime.md` § 6 race conditions + state machine, story-66 (runExecute callsite).
