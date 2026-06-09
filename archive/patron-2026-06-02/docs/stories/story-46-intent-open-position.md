# Story 46 — Intent handler: OpenPosition (merchant trust → health → rate → execute/decline)

**Epic:** Epic 3 — Agent Decision Engine
**Estimated:** ~2h
**Depends on:** story-36-order-intent-endpoint, story-41-agent-context-loader, story-42-tool-onchain-reads, story-43-tool-onchain-writes, story-44-tool-external-apis

## BDD Acceptance Criteria

```
Given a queued agent_task with intent='OpenPosition' and input={orderId, userId, merchantId, amountUsdc}
When `runOpenPositionIntent(task)` is called from apps/api/src/agent/intents/openPosition.ts
Then it invokes `runAgent({ intent: 'OpenPosition', userId, input, tools: [getMerchantReputation, getHealthFactor, getOraclePrices, sanctionScreen, nansenAddressLabels, openLoan] })`
And the system prompt suffix (per-intent) lists the decision steps: 1) verify merchant trust, 2) check user health factor, 3) confirm sUSDe yield > Aave borrow rate, 4) approve or decline, 5) execute via openLoan
And tool_choice is "any" (the agent MUST decide; it cannot pass)
And max_iterations is 8

Given the merchant has reputation_score < MIN_MERCHANT_REPUTATION (50) OR status != 'active'
When the agent processes the intent
Then the agent's final answer includes `{ decision: 'decline', reason: 'merchant_untrusted', evidence: {...} }`
And NO openLoan tool call is made
And the agent_task is marked status='succeeded' with result={decision:'decline', ...}
And the order row is updated to status='declined' with `decline_reason` set

Given the user's healthFactor < 1.2 (loaded via getHealthFactor)
When the agent processes the intent
Then the agent's final answer includes `{ decision: 'decline', reason: 'health_factor_too_low', healthFactor }`
And no openLoan call is made

Given all checks pass AND amountUsdc ≤ context.spendingCaps.perActionUsd
When the agent calls openLoan
Then on success the agent_task.result includes `{ decision: 'approve', txHash, positionId, healthFactorAfter, projectedPaydownDate }`
And the order row is updated to status='opened' with open_tx_hash + position_id
And story-52's ERC-8004 receipt is logged with action='OpenPosition' + success=true + parameters

Given the openLoan tool returns `{ error: 'simulation_revert', reason: 'AAVE_INSUFFICIENT_COLLATERAL' }`
When the agent processes the failure
Then the agent_task.result is `{ decision: 'failed', error: 'simulation_revert', reason: '...' }`
And the order is updated to status='failed'
And the ERC-8004 receipt is logged with success=false so the failure is part of the reputation history
```

## File modification map

- `apps/api/src/agent/intents/openPosition.ts` — NEW — `runOpenPositionIntent(task: AgentTaskRow)` entrypoint; calls `runAgent` with the OpenPosition prompt + tool subset; persists result + updates order row
- `apps/api/src/agent/prompts/openPosition.ts` — NEW — per-intent prompt suffix appended to system-base; explicit decision tree (merchant trust → health → rate spread → execute/decline) + structured output format requirement (JSON with `decision`, `reason`, `evidence`)
- `apps/api/src/agent/intents/openPositionResultSchema.ts` — NEW — Zod schema for the structured agent output; runner validates and throws InvalidAgentOutputError on mismatch (forces a retry within the iteration budget)
- `apps/api/src/agent/intents/orderUpdater.ts` — NEW — helper `updateOrderForDecision(orderId, decision, payload)` writes the order row transition (declined / opened / failed); pure DB layer
- `apps/api/src/jobs/runOpenPositionJob.ts` — NEW — BullMQ worker for the `open-position` queue; pulls task, calls `runOpenPositionIntent`, persists outcome, ACKs the job
- `apps/api/src/queues/openPositionQueue.ts` — NEW — BullMQ queue config + enqueue helper `enqueueOpenPosition(orderId)` called from `POST /orders/intent` (story-36)
- `apps/api/src/routes/orders.ts` — UPDATE — call `enqueueOpenPosition(orderId)` after order row is created in 'intent' status
- `apps/api/src/agent/intents/__tests__/openPosition.test.ts` — NEW — Vitest using recorded fixtures from story-53: (1) happy approve path → openLoan called → order=opened, (2) merchant-untrusted decline, (3) low-health decline, (4) simulation_revert failure path
- `apps/api/src/agent/intents/__tests__/openPositionResult.test.ts` — NEW — Vitest: schema accepts valid outputs, rejects malformed agent outputs

## Shell verification

```bash
cd apps/api

# Files exist
test -f src/agent/intents/openPosition.ts
test -f src/agent/prompts/openPosition.ts
test -f src/jobs/runOpenPositionJob.ts
test -f src/queues/openPositionQueue.ts

# tool_choice="any" enforced (the agent MUST act)
grep -q "tool_choice.*any\|'any'" src/agent/intents/openPosition.ts

# Min reputation threshold defined
grep -q "MIN_MERCHANT_REPUTATION\|50" src/agent/prompts/openPosition.ts

# Health factor threshold defined
grep -q "1.2\|HEALTH_FACTOR_MIN" src/agent/prompts/openPosition.ts

# Tests pass
pnpm vitest run src/agent/intents/__tests__/openPosition.test.ts
pnpm vitest run src/agent/intents/__tests__/openPositionResult.test.ts
test $? -eq 0

# Typecheck
pnpm typecheck
test $? -eq 0

# ERC-8004 receipt logged on every outcome
grep -q "logReputationEntry\|erc8004" src/agent/intents/openPosition.ts
```

## Notes

- Per design spec §6, OpenLoan is the agent's first "real decision": assesses merchant trust (registry + bond + reputation), checks user health factor + Aave rate vs sUSDe yield, decides approve / decline / suggest different amount. This story implements all four branches.
- Per architecture stack, this is a BullMQ-queued background job triggered by `POST /orders/intent`. The endpoint returns immediately with `status='intent'`; the agent's decision arrives asynchronously and the frontend polls or subscribes.
- Per security domain §3.8, the spending cap enforcement happens inside `openLoan` (story-43); this intent does NOT re-implement it. The agent learns the cap from context and is expected to refuse without calling openLoan if exceeded, but the tool-level cap is the last line of defense.
- The structured output requirement (Zod-validated JSON from the agent) is critical for testability AND for piping the decision into downstream UI. If the agent returns malformed JSON, retry within the iteration budget; if retries exhaust, mark the task failed with `invalid_agent_output`.
- The 4 BDD criteria correspond to the 4 failure paths spec'd by the story-53 fixture suite: approve, merchant-untrusted decline, health-too-low decline, simulation_revert failure. Story-53 records the exact tool-call sequences as Vitest snapshots.
- `MIN_MERCHANT_REPUTATION = 50` (out of 100) and `HEALTH_FACTOR_MIN = 1.2` are conservative defaults; expose as env-overridable constants so the demo can be tuned.
- Per security domain §2 (BNPL friendly-fraud): merchant must be `status='active'`, bond posted, and reputation ≥ threshold. The agent is not a fraud detector for the user — it's a trust gate for the merchant.
- File MUST stay under 400 LOC each.
