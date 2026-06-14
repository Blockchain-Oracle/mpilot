# Story — EOA fallback signed-tx queue (no smart account, no session key)

**ID:** story-55-eoa-fallback-queue
**Epic:** Epic E4 — Smart Account Layer
**Depends on:** story-69-postgres-drizzle-schemas, story-50-zerodev-sdk-bootstrap
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** Concierge user who hasn't set up a smart account (or chose to disable it)
**I want to** the agent can still act by proposing transactions to me — I sign them in my wallet, and a Postgres queue tracks the signed-but-not-yet-executed txs through to confirmation
**So that** Concierge works for EOA-only users without forcing them into ERC-4337 onboarding (Day-1 fallback if ZeroDev integration hits unexpected issues)

---

## File modification map

- `packages/smart-account/src/eoaFallback/queue.ts` — NEW — Drizzle queries against `eoa_tx_queue` table (from story-69): `enqueue({ userId, agentId, to, data, value, nonce?, gasLimit, gasPrice })`, `getPending({ agentId })`, `markSigned({ id, signedTx })`, `markConfirmed({ id, txHash, blockNumber })`, `markFailed({ id, error })`.
- `packages/smart-account/src/eoaFallback/proposer.ts` — NEW — `proposeForUser({ agentId, txParams })` writes a pending row to the queue + emits SSE/WebSocket event to the user's connected web app session. UI from story-108 renders the proposal modal.
- `packages/smart-account/src/eoaFallback/sender.ts` — NEW — `sendSignedTx({ queueId, signedTx })` called from the API endpoint when the user signs in their wallet → calls `viem.sendRawTransaction(signedTx)`, listens for confirmation, calls `markConfirmed` or `markFailed`.
- `packages/smart-account/src/eoaFallback/__tests__/queue.test.ts` — NEW — Drizzle integration test against a Postgres test container; full lifecycle of one queued tx through pending → signed → confirmed

---

## Acceptance criteria (BDD)

```
Given the EOA fallback is enabled for an agent
When the agent runtime proposes an action via proposeForUser
Then a row is inserted in eoa_tx_queue with status='pending', timestamp, and the tx params

Given the user signs the proposed tx in their wallet
When sendSignedTx is called with the signed raw tx
Then `viem.sendRawTransaction` is invoked, the row is updated to status='signed', txHash captured

Given the tx confirms
When the worker polls for confirmation
Then markConfirmed is called and status='confirmed', blockNumber set

Given the tx reverts on-chain
When sendRawTransaction returns an error
Then markFailed is called with the revert reason (extracted from the error object), status='failed'

Given multiple agents propose simultaneously
When concurrent enqueues run
Then no row is dropped (asserted via inserting 100 concurrent txs and counting rows)

Given the queue is queried for an agent's pending txs
When getPending({ agentId }) is called
Then it returns ONLY rows with status='pending' for that agent (no other agent's rows leak)

Given the EOA fallback path
When a user with no smart account starts the agent
Then the agent's tick loop produces a queue entry instead of a UserOp; the runtime detects the absence of session keys and routes to fallback

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd packages/smart-account
test -f src/eoaFallback/queue.ts
test -f src/eoaFallback/proposer.ts
test -f src/eoaFallback/sender.ts

cd ../..

pnpm --filter @concierge-mantle/smart-account run build
test $? -eq 0

# Integration test passes (requires a Postgres test container)
pnpm --filter @concierge-mantle/smart-account run test 2>&1 | grep "eoaFallback" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **EOA fallback is a graceful-degradation path**, not the primary mode. Per CLAUDE.md gotcha + ADR-010: if ZeroDev/Pimlico integration hits issues on Mantle (Day 1 spike result), this path keeps the product alive. v1.1 should phase it out.
- **No smart-account address required** — EOA fallback users sign as their wallet directly. The agent runtime proposes; the user signs; the queue tracks. Single-tx UX (no UserOp wrapping).
- **The proposeForUser → sendSignedTx flow is two API calls**: the agent runtime hits the proposer; the web UI shows the modal; the user signs and the UI hits the sender. Decoupled — neither knows about the other directly.
- **No retries on the agent side.** If a user signs and the tx reverts, the agent's record() phase logs the failure and waits for next tick to re-propose. The runtime does NOT silently re-submit (silent-failure rule).
- **Concurrency on enqueue is critical** — multiple agents tick simultaneously (BullMQ runs ticks in parallel). Use Postgres `INSERT ... RETURNING id` to atomically claim a new queue ID.
- **Status state machine:** `pending → signed → confirmed | failed`. No backward transitions. Each transition is a separate DB row update with the new timestamp captured.
- Cross-ref: ADR-010 fallback rationale, `research/concierge/05-zerodev-erc4337.md` § EOA fallback path.
