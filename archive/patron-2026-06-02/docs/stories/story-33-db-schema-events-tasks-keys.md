# Story 33 — Drizzle schema for events, agent_tasks, api_keys

**Epic:** Epic 2 — Backend Foundation
**Estimated:** ~1.5h
**Depends on:** story-31-postgres-and-drizzle-init

## BDD Acceptance Criteria

```
Given the schema files exist
When `pnpm --filter @patron/api drizzle:generate` runs
Then a new migration file is created (e.g., 0002_events_tasks_keys.sql)
And it includes `CREATE TABLE events`, `CREATE TABLE agent_tasks`, `CREATE TABLE api_keys`

Given the migration is applied
When `pnpm --filter @patron/api drizzle:migrate` runs
Then exit code is 0
And `psql $POSTGRES_URL -c "\dt"` lists events, agent_tasks, api_keys in addition to prior tables

Given the events table is populated by a Vitest test
When the same (tx_hash, log_index) is inserted twice
Then the second insert fails with a unique violation
And `pnpm --filter @patron/api test --run schemas/events-tasks-keys.test.ts` exits 0

Given an api_key with a hashed token is inserted
When the test calls a lookup helper `findApiKeyByToken(rawToken)`
Then the helper computes the hash and matches the stored row
And the raw token is NEVER stored in the database (assert column does not exist or is null)
```

## File modification map

- `apps/api/src/db/schema/events.ts` — NEW — Drizzle table `events`:
  - `id: uuid('id').primaryKey().defaultRandom()`
  - `chainId: integer('chain_id').notNull()` (5000 or 5003)
  - `contract: varchar('contract', { length: 42 }).notNull()` (contract address; matches packages/shared/addresses.ts)
  - `eventName: varchar('event_name', { length: 64 }).notNull()` (e.g., 'LoanOpened', 'MerchantRegistered', 'ActionLogged', 'AgentFrozen')
  - `txHash: varchar('tx_hash', { length: 66 }).notNull()`
  - `logIndex: integer('log_index').notNull()`
  - `blockNumber: bigint('block_number', { mode: 'bigint' }).notNull()`
  - `blockTimestamp: timestamp('block_timestamp', { withTimezone: true }).notNull()`
  - `args: jsonb('args').$type<Record<string, unknown>>().notNull()` (decoded event args)
  - `processedAt: timestamp('processed_at', { withTimezone: true })` (nullable until indexer processes side-effects)
  - `createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()`
  - unique: `(tx_hash, log_index)` composite
  - indexes: `idx_events_contract_event`, `idx_events_block_number`, `idx_events_processed_at` (partial index `WHERE processed_at IS NULL` for unprocessed-first queries)
- `apps/api/src/db/schema/agentTasks.ts` — NEW — Drizzle table `agent_tasks`:
  - `id: uuid('id').primaryKey().defaultRandom()`
  - `userId: uuid('user_id').notNull().references(() => users.id)`
  - `intent: varchar('intent', { length: 32 }).notNull()` (open|repay|audit|verify|monitor|rotate|dispute — matches design spec line 253)
  - `status: varchar('status', { length: 16 }).notNull().default('queued')` (queued|running|succeeded|failed|cancelled)
  - `input: jsonb('input').$type<Record<string, unknown>>().notNull()` (the intent's input payload; e.g., {merchantId, amount, orderId})
  - `output: jsonb('output').$type<Record<string, unknown>>()` (the agent's structured output)
  - `errorMessage: text('error_message')`
  - `receiptUri: varchar('receipt_uri', { length: 256 })` (IPFS or HTTP pointer to the full reasoning log for /audit/:txHash)
  - `txHash: varchar('tx_hash', { length: 66 })` (the on-chain tx if the task wrote one)
  - `startedAt: timestamp('started_at', { withTimezone: true })`
  - `completedAt: timestamp('completed_at', { withTimezone: true })`
  - `createdAt`, `updatedAt`
  - indexes: `idx_agent_tasks_user_id_created_at`, `idx_agent_tasks_status`, `idx_agent_tasks_intent`
- `apps/api/src/db/schema/apiKeys.ts` — NEW — Drizzle table `api_keys`:
  - `id: uuid('id').primaryKey().defaultRandom()`
  - `userId: uuid('user_id').notNull().references(() => users.id)`
  - `tokenHash: varchar('token_hash', { length: 64 }).unique().notNull()` (SHA-256 hex of the raw token; raw token shown to user once at creation and never stored)
  - `label: varchar('label', { length: 64 }).notNull()` (e.g., 'my-shop-integration')
  - `scopeJson: jsonb('scope_json').$type<{targets: string[]; selectors: string[]; spendCapPerDay: string; expiry: number}>().notNull()`
  - `lastUsedAt: timestamp('last_used_at', { withTimezone: true })`
  - `revokedAt: timestamp('revoked_at', { withTimezone: true })`
  - `expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()`
  - `createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()`
  - indexes: `idx_api_keys_user_id`, `idx_api_keys_token_hash`, `idx_api_keys_revoked_at`
- `apps/api/src/db/schema/index.ts` — UPDATE — re-export events, agentTasks, apiKeys
- `apps/api/src/db/migrations/0002_events_tasks_keys.sql` — NEW (generated)
- `apps/api/src/lib/apiKeys.ts` — NEW — pure helpers `generateApiKey() returns {raw, hash}` (cryptographically random, 32-byte base64url + sha256 hash); `hashApiKey(raw) returns string`; `findApiKeyByToken(db, raw)` uses the hash to look up
- `apps/api/src/__tests__/schemas/events-tasks-keys.test.ts` — NEW — Vitest tests: unique violation on duplicate (tx_hash, log_index); api_keys raw-token never stored; FK from agent_tasks to users
- `apps/api/src/db/types.ts` — UPDATE — re-export inferred row types for the three new tables

## Shell verification

```bash
cd apps/api

# Generate + migrate
pnpm drizzle:generate
ls src/db/migrations/0002_*.sql | xargs test -f
pnpm drizzle:migrate
test $? -eq 0

# Tables exist
psql "$POSTGRES_URL" -c "\dt" | grep -E '(^|\s)(events|agent_tasks|api_keys)\s' | wc -l | xargs test 3 -le

# Schema round-trip + uniqueness test
pnpm test --run schemas/events-tasks-keys.test.ts
test $? -eq 0

# api_keys table has no `raw_token` column (security check)
psql "$POSTGRES_URL" -c "\d api_keys" | grep -v "raw_token"

# Typecheck
pnpm typecheck
test $? -eq 0
```

## Notes

- `events` unique on `(tx_hash, log_index)` is the indexer's idempotency primitive (story-38). If the indexer re-polls a block, duplicate events are dropped by the unique constraint, not by application logic.
- `events.args` is JSONB so the indexer can store decoded event args without a fixed shape per event type. Downstream consumers (e.g., dashboard activity feed in story-70) Zod-narrow on read.
- `agent_tasks.intent` enum values match the intent list in the design spec (line 253) and the handlers in Epic 3 (`OpenPosition`, `RepayPosition`, `MonitorDepeg`, `VerifyMerchant`, `PersonalizeLimits`, `HandleDispute`). Keep these strings in a typed const exported from `@patron/shared`.
- `api_keys.tokenHash` is SHA-256 (NOT bcrypt) — these are high-entropy tokens (32 random bytes), so a fast hash is fine and lookups must be O(1). bcrypt is for human-chosen passwords.
- The raw token is shown to the user ONCE in the API response when they create the key (per story-78); after that it's recoverable only by reissuing.
- `scopeJson` shape mirrors the on-chain `Scope` struct from `AgentAuthorizer.sol` (story-19) so the backend can convert API-key scope → session-key scope when issuing on-chain.
- `expiresAt` is REQUIRED — every API key has a max lifetime. Default suggested in the issuer endpoint (story-78) is 90 days; never `null`.
- Per architecture.md "Banned patterns": no silent error swallowing. The api_key lookup helper returns `null` for not-found, NOT an empty object.
- File MUST stay under 400 LOC each.
