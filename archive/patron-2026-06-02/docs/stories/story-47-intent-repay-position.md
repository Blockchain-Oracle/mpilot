# Story 47 — Intent handler: RepayPosition (scheduled; optimal-moment repayment)

**Epic:** Epic 3 — Agent Decision Engine
**Estimated:** ~2h
**Depends on:** story-41-agent-context-loader, story-43-tool-onchain-writes, story-39-scheduler-skeleton

## BDD Acceptance Criteria

```
Given a cron job named `repay-scan` runs every 15 minutes via BullMQ
When the job executes
Then it queries open positions where yield-delta accrued since last_evaluated >= REPAY_THRESHOLD_USDC (default 5)
And for each candidate it enqueues an `RepayPosition` agent task with input={positionId, userId}
And the cron run is idempotent: rescanning before tasks complete does NOT enqueue duplicates (use a `repay_evaluated_at` column)

Given a queued agent_task with intent='RepayPosition' and input={positionId, userId}
When `runRepayPositionIntent(task)` is called
Then it invokes `runAgent` with tools: [getPosition, getHealthFactor, getOraclePrices, repayLoan]
And the per-intent prompt instructs: 1) load position state, 2) compute optimal repay amount (yield-accrued minus gas buffer), 3) check current gas + oracle prices, 4) execute repayLoan OR defer to next cycle

Given the agent decides to repay
When it calls repayLoan({ positionId, amountUsdc })
Then on success the agent_task.result is `{ decision: 'repay', txHash, amountUsdc, newDebt, newHealthFactor }`
And the order row is updated with repay_tx_hash + status='repaid' (if fully paid) OR status='opened' (if partial)
And the ERC-8004 receipt is logged with action='RepayPosition'

Given gas price > GAS_PRICE_DEFER_THRESHOLD (default 2 gwei on Mantle) AND the yield-delta < 2x gas cost
When the agent processes the intent
Then the agent's final answer is `{ decision: 'defer', reason: 'gas_too_high', currentGasGwei, breakEvenGasGwei }`
And NO repayLoan call is made
And the agent_task is marked status='succeeded' (decision='defer' is a valid successful outcome)
And the position is re-evaluated next cron cycle

Given the position is already fully repaid (debtAmount = 0)
When the agent runs
Then it returns `{ decision: 'noop', reason: 'already_repaid' }`
And no tx is broadcast
And the order row is reconciled to status='repaid' if not already
```

## File modification map

- `apps/api/src/agent/intents/repayPosition.ts` — NEW — `runRepayPositionIntent(task)`; invokes runAgent + persists result
- `apps/api/src/agent/prompts/repayPosition.ts` — NEW — per-intent prompt: decision tree (load → compute → gas check → execute/defer/noop)
- `apps/api/src/agent/intents/repayResultSchema.ts` — NEW — Zod schema for { decision: 'repay'|'defer'|'noop'|'failed', ...evidence }
- `apps/api/src/jobs/repayScanCron.ts` — NEW — BullMQ repeatable job (`cron: '*/15 * * * *'`): scans `orders` joined with on-chain position state, enqueues repay tasks for qualifying positions; idempotency via `orders.repay_evaluated_at`
- `apps/api/src/jobs/runRepayPositionJob.ts` — NEW — BullMQ worker for `repay-position` queue
- `apps/api/src/queues/repayPositionQueue.ts` — NEW — BullMQ queue + `enqueueRepayPosition(positionId)`
- `apps/api/src/db/schema/orders.ts` — UPDATE — add `repay_evaluated_at` timestamptz column + migration
- `apps/api/src/agent/intents/__tests__/repayPosition.test.ts` — NEW — Vitest using recorded fixtures: (1) happy repay path, (2) defer due to high gas, (3) noop already-repaid, (4) simulation_revert failure
- `apps/api/src/jobs/__tests__/repayScanCron.test.ts` — NEW — Vitest: cron run with N candidate positions enqueues N tasks; rerun without progress does not duplicate; idempotency works

## Shell verification

```bash
cd apps/api

# Files exist
test -f src/agent/intents/repayPosition.ts
test -f src/agent/prompts/repayPosition.ts
test -f src/jobs/repayScanCron.ts
test -f src/queues/repayPositionQueue.ts

# Cron expression set to every 15 minutes
grep -q "\\*/15\|repeat" src/jobs/repayScanCron.ts

# Gas-defer threshold defined
grep -q "GAS_PRICE_DEFER_THRESHOLD\|defer" src/agent/prompts/repayPosition.ts

# Idempotency column wired
grep -q "repay_evaluated_at" src/db/schema/orders.ts

# Tests pass
pnpm vitest run src/agent/intents/__tests__/repayPosition.test.ts
pnpm vitest run src/jobs/__tests__/repayScanCron.test.ts
test $? -eq 0

# Typecheck
pnpm typecheck
test $? -eq 0
```

## Notes

- Per design spec §6, RepayPosition is the agent's second "real decision": computes optimal moment (gas window + yield accrued), executes repayment. This story is what makes Patron a self-paying loan rather than a manual one.
- The "defer" decision is a first-class successful outcome — NOT a failure. The agent earns reputation for correct deferrals (gas spike) the same way it does for correct execution.
- Per security domain §3.4 (replay): every repay tx uses a fresh nonce; the cron's idempotency guarantees we don't enqueue the same positionId twice in-flight (DB column gate).
- Per architecture stack: BullMQ on Redis (Upstash). Repeatable jobs use `repeat: { pattern: '*/15 * * * *' }`. Worker lives in `apps/api/src/jobs/`.
- `REPAY_THRESHOLD_USDC = 5` (default) means the agent only evaluates positions where ≥$5 of yield has accrued since last check — avoids burning gas on micro-repays. Tunable via env.
- `GAS_PRICE_DEFER_THRESHOLD = 2 gwei` is generous for Mantle (typically sub-gwei); the more important check is `yieldDelta > 2x gasCost` (handled in the prompt's decision tree).
- The agent's "decision" output schema is the same shape as OpenPosition (story-46): `{ decision, reason, evidence, txHash? }`. Keep this consistent across all intents so the activity feed (story-70) renders uniformly.
- Tests use recorded fixtures (story-53) — no live LLM calls. The cron test uses a real ephemeral Postgres + a mocked BullMQ queue (in-memory).
- File MUST stay under 400 LOC each.
