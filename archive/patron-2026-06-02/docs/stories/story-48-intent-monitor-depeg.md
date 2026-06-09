# Story 48 — Intent handler: MonitorDepeg (60s cadence; auto-rotate on threshold trip)

**Epic:** Epic 3 — Agent Decision Engine
**Estimated:** ~2h
**Depends on:** story-42-tool-onchain-reads, story-44-tool-external-apis, story-39-scheduler-skeleton

## BDD Acceptance Criteria

```
Given a cron job named `monitor-depeg` runs every 60 seconds via BullMQ
When the job executes
Then it enqueues a SINGLE MonitorDepeg agent task (not per-user — one shared scan per cycle that fans out to affected users)
And the shared scan loads all open positions across all users via a single DB query
And the agent's tool surface includes: getOraclePrices, alloraDepegProbability, getHealthFactor, rotatePosition
(Per ADR-003 the on-chain price source is Aave Oracle, accessed via getOraclePrices — the previously-scoped `chainlinkPriceProof` tool was removed in story-44 because no direct Chainlink sUSDe/USD feed exists on Mantle.)

Given the agent runs the MonitorDepeg intent
When it checks signals
Then it calls getOraclePrices({ symbols: ['sUSDe'] }) AND alloraDepegProbability({ asset: 'sUSDe' })
And the decision tree is: 1) if Aave Oracle sUSDe price < 0.995 USD (read via `getOraclePrices`, 8-decimal Aave Oracle output) → escalate; 2) if Allora depeg_probability > 0.3 AND Aave Oracle price < 0.998 → escalate; 3) if `getOraclePrices` returns `oracle_unavailable` for sUSDe → escalate (treat unavailable as worst case); 4) otherwise NOOP
And the agent's final answer is `{ decision: 'noop'|'escalate', signals: {...}, affectedPositions: number }`

Given the escalation condition trips
When the agent identifies affected positions
Then for each user with frozen=false AND auto_rotate_enabled=true it calls rotatePosition({ positionId })
And for each user with frozen=true OR auto_rotate_enabled=false it does NOT call rotatePosition
And those users receive a notification (insert into `notifications` table; story-70 surfaces it in the dashboard activity feed)

Given a user has auto_rotate_enabled=true but the rotatePosition simulation reverts
When the agent processes the failure
Then the failure is logged per-position in agent_task.result.rotationResults[]
And the agent CONTINUES to the next position (one user's failure does not block other users' rotations)
And ERC-8004 receipts are logged for each rotation attempt (success or failure)

Given the user is frozen (loaded in shared scan)
When the agent evaluates that user
Then the user is SKIPPED entirely — MonitorDepeg does NOT throw AgentFrozenError for read-only signal evaluation but DOES refuse to call rotatePosition on a frozen user
And the result.skippedUsers[] lists frozen users with reason='frozen'
```

## File modification map

- `apps/api/src/agent/intents/monitorDepeg.ts` — NEW — `runMonitorDepegIntent(task)`; loads all open positions; fans out rotations
- `apps/api/src/agent/prompts/monitorDepeg.ts` — NEW — per-intent prompt: decision tree (price + probability + health factor → escalate or noop); thresholds documented inline
- `apps/api/src/agent/intents/monitorResultSchema.ts` — NEW — Zod schema for { decision, signals, affectedPositions, rotationResults[], skippedUsers[] }
- `apps/api/src/jobs/monitorDepegCron.ts` — NEW — BullMQ repeatable job (`cron: '* * * * * *' every 60s` — actually `*/1 * * * *`); enqueues ONE MonitorDepeg task per minute (not per user)
- `apps/api/src/jobs/runMonitorDepegJob.ts` — NEW — BullMQ worker
- `apps/api/src/queues/monitorDepegQueue.ts` — NEW — queue config + `enqueueMonitorDepeg()`
- `apps/api/src/db/schema/users.ts` — UPDATE — add `auto_rotate_enabled: boolean default false`, `rotate_policy: jsonb` columns + migration
- `apps/api/src/db/schema/notifications.ts` — NEW — Drizzle table `notifications` (id, user_id, kind, payload jsonb, read_at, created_at) for in-app alerts
- `apps/api/src/agent/intents/__tests__/monitorDepeg.test.ts` — NEW — Vitest: (1) noop when price stable + low probability, (2) escalate + rotate for non-frozen auto-rotate users, (3) skip frozen users, (4) partial rotation success (some positions revert, others succeed)

## Shell verification

```bash
cd apps/api

# Files exist
test -f src/agent/intents/monitorDepeg.ts
test -f src/agent/prompts/monitorDepeg.ts
test -f src/jobs/monitorDepegCron.ts
test -f src/db/schema/notifications.ts

# 60s cadence
grep -qE "\\*/1 \\* \\* \\* \\*|60[^0-9]" src/jobs/monitorDepegCron.ts

# Thresholds documented
grep -q "0.995\|0.998" src/agent/prompts/monitorDepeg.ts
grep -q "0.3\|probability" src/agent/prompts/monitorDepeg.ts

# auto_rotate column added
grep -q "auto_rotate_enabled" src/db/schema/users.ts

# Frozen users skipped
grep -q "frozen\|skippedUsers" src/agent/intents/monitorDepeg.ts

# Tests pass
pnpm vitest run src/agent/intents/__tests__/monitorDepeg.test.ts
test $? -eq 0

# Typecheck
pnpm typecheck
test $? -eq 0
```

## Notes

- Per design spec §6, MonitorDepeg is the agent's third "real decision": every 60s checks **Aave Oracle sUSDe reading** (per ADR-003 — Capped sUSDe/USDT/USD composite) + Allora depeg-probability + Aave health; if risk trips, autonomously rotates users per their policy. This is the agent's most autonomous action and the one that justifies the autonomy framing.
- Per security domain §1 (Oct 11 2025 USDe cascade): the cascade was partly caused by oracle staleness + internal AMM-derived prices. We use **Aave Oracle** (canonical on-chain source on Mantle — same one Aave uses for liquidations, so we cannot get liquidated on a price our monitor didn't see) as the primary trigger and Allora (probabilistic inference) as a secondary signal. NEVER rotate on Allora alone — confirm with an Aave Oracle price deviation.
- Per security domain §3.8: MonitorDepeg is the ONE intent that runs even when the user is "frozen" — but ONLY for read-only signal evaluation. The frozen check in story-43's `rotatePosition` tool is the gate that prevents actual rotation for frozen users.
- Per design spec §7 (Settings: caps + whitelist + auto-rotate policy): users opt-in to auto-rotation. Default is OFF; the dashboard (story-72) lets them enable it with a clear explanation.
- The notifications table is the bridge to the dashboard activity feed (story-70). When the agent escalates without auto-rotating (because user disabled it), the user gets a notification "Patron detected sUSDe depeg risk — would you like to manually rotate?"
- Cron cadence (60s) is from design spec §6. Use BullMQ's `repeat` with a `*/1 * * * *` pattern (every minute) — BullMQ does not support sub-minute crons natively; if 60s is too slow in practice, switch to a `setInterval`-based scheduler with leader-lock.
- Tests cover one happy + three failure paths per agent story rule: noop (stable), escalate-rotate, skip-frozen, partial-rotation-failure. Fixtures from story-53.
- File MUST stay under 400 LOC each.
