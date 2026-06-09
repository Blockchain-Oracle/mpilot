# Story 38 — On-chain indexer skeleton (viem event polling for PatronVault + MerchantRegistry)

**Epic:** Epic 2 — Backend Foundation
**Estimated:** ~2h
**Depends on:** story-33-db-schema-events-tasks-keys, story-21-sepolia-deployment

## BDD Acceptance Criteria

```
Given the indexer is started against Mantle Sepolia
When `pnpm --filter @patron/api indexer:start` runs
Then a Pino log line appears: {"level":"info","msg":"indexer started","chainId":5003,"fromBlock":<n>}
And the process polls every POLL_INTERVAL_MS (default 5000)
And it does not exit (long-running)

Given a LoanOpened event is emitted on PatronVault (via a test tx or fork)
When the next poll cycle runs
Then a row is inserted into `events` with eventName='LoanOpened', the decoded args in JSONB, and chainId=5003
And the same event polled twice does NOT produce a duplicate (unique constraint from story-33 enforces)
And `pnpm --filter @patron/api test --run indexer/indexer.test.ts` exits 0

Given a MerchantRegistered event arrives
When the indexer processes it
Then the merchants table row matching the event's slugHash is updated: status='active', registeredAt=block.timestamp
And `pnpm --filter @patron/api test --run indexer/merchantRegistered.test.ts` exits 0

Given an AgentFrozen event arrives
When the indexer processes it
Then the users table row matching the event's agentId is updated: frozen=true

Given the indexer has processed up to block N
When the indexer shuts down and restarts
Then it resumes from block N+1 (cursor persisted in DB)
And it does NOT re-process blocks 1..N
```

## File modification map

- `apps/api/src/indexer/index.ts` — NEW — entrypoint; reads env, instantiates `Indexer`, starts polling loop with graceful shutdown (SIGTERM/SIGINT)
- `apps/api/src/indexer/Indexer.ts` — NEW — class encapsulating: poll loop, cursor management, per-contract event polling via viem `getLogs`, decoding via `parseEventLogs`, inserting into `events`, dispatching to handlers
- `apps/api/src/indexer/handlers/loanOpened.ts` — NEW — handler for `PatronVault.LoanOpened`: stamps `orders.positionId` + `orders.paymentTxHash` for the matching order (lookup by `externalReference` if a merchant payload mapping is needed)
- `apps/api/src/indexer/handlers/loanRepaid.ts` — NEW — handler for `PatronVault.LoanRepaid`: updates `orders.status='paid'` (or `'partially_repaid'`) + `orders.repayTxHash`
- `apps/api/src/indexer/handlers/merchantRegistered.ts` — NEW — handler for `MerchantRegistry.MerchantRegistered`: lookup merchants row by slugHash, set status='active' + registeredAt
- `apps/api/src/indexer/handlers/merchantSuspended.ts` — NEW — handler: set status='suspended'
- `apps/api/src/indexer/handlers/agentFrozen.ts` — NEW — handler for `AgentAuthorizer.AgentFrozen`: set `users.frozen=true`
- `apps/api/src/indexer/handlers/agentUnfrozen.ts` — NEW — handler for `AgentAuthorizer.AgentUnfrozen`: set `users.frozen=false`
- `apps/api/src/indexer/handlers/actionLogged.ts` — NEW — handler for `ReputationProxy.ActionLogged`: no-op for v1 (event already persisted in `events` table; dashboard reads from there)
- `apps/api/src/indexer/cursor.ts` — NEW — Drizzle table `indexer_cursors` (chainId pk, lastProcessedBlock bigint, updatedAt timestamptz); migration generated
- `apps/api/src/db/schema/indexerCursors.ts` — NEW — Drizzle table definition
- `apps/api/src/db/migrations/0004_indexer_cursors.sql` — NEW (generated)
- `apps/api/src/db/schema/index.ts` — UPDATE — re-export indexerCursors
- `apps/api/src/lib/env.ts` — UPDATE — add `POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000)`, `INDEXER_START_BLOCK: z.coerce.bigint().default(0n)` (used only on first run when no cursor exists), `INDEXER_BATCH_SIZE: z.coerce.number().int().positive().default(2000)` (max blocks per `getLogs` call to avoid RPC limits)
- `apps/api/package.json` — UPDATE — add script `indexer:start` (`tsx src/indexer/index.ts`); add `start:all` script that boots both api + indexer (for Railway single-service deploy)
- `apps/api/src/__tests__/indexer/indexer.test.ts` — NEW — Vitest test using an Anvil fork (or mocked viem `getLogs` via MSW): seed a LoanOpened log, run one poll cycle, assert events row + duplicate-poll dedupe
- `apps/api/src/__tests__/indexer/merchantRegistered.test.ts` — NEW — Vitest test: seed merchant row in pending state, seed MerchantRegistered event, run handler, assert status='active'

## Shell verification

```bash
cd apps/api

# Migrations
pnpm drizzle:generate
ls src/db/migrations/0004_*.sql | xargs test -f
pnpm drizzle:migrate

# Tests pass
pnpm test --run indexer/
test $? -eq 0

# Indexer boots and stays up
pnpm indexer:start &
IDX_PID=$!
sleep 6

# Process is alive
ps -p $IDX_PID > /dev/null
test $? -eq 0

# Cursor was written
psql "$POSTGRES_URL" -c "SELECT chain_id, last_processed_block FROM indexer_cursors;" | grep -E '5003|5000'

kill $IDX_PID
wait $IDX_PID 2>/dev/null || true
```

## Notes

- Polling not subscriptions: viem WebSocket subscriptions are flaky against public RPCs. Polling at 5s with `getLogs(fromBlock, toBlock)` is reliable and simpler. Use a websocket later if we self-host a Mantle node.
- `getLogs` has provider-side limits (typically max 10k blocks per call). The `INDEXER_BATCH_SIZE` env caps this at 2000 to be safe across providers. The poll loop walks `cursor → min(cursor + batch, latestBlock)` per iteration.
- Cursor table is the single source of truth for "what have we processed". MUST be updated AFTER successful event inserts in the same transaction; otherwise crash + restart will skip blocks.
- Use `viem`'s `parseEventLogs({abi, logs, eventName, strict: true})` for typed decoding. Pull ABIs from `@patron/shared/abi` (generated from packages/contracts/out).
- Contract addresses + ABIs imported from `@patron/shared` per architecture.md banned-patterns rule (no hardcoded addresses).
- Reorg handling is OUT OF SCOPE for v1. Mantle has fast finality; we accept the small risk of reorgs and add deeper reorg handling in v2. Document in a code comment.
- Per architecture.md "Banned patterns": no mocks in the hot path. Tests for the indexer use Anvil forks or MSW-mocked RPCs; runtime uses real RPC.
- The indexer runs as a separate process from the api. On Railway, deploy with a `Procfile` (or Railway service config) that spawns both `api` and `indexer` as distinct workers. Keep them in the same package so they share the DB layer.
- File MUST stay under 400 LOC each — split handlers into per-event files (already in the file map).
