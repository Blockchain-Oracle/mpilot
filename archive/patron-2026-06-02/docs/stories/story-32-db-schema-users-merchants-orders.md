# Story 32 — Drizzle schema for users, merchants, orders

**Epic:** Epic 2 — Backend Foundation
**Estimated:** ~1.5h
**Depends on:** story-31-postgres-and-drizzle-init

## BDD Acceptance Criteria

```
Given the schema files exist
When `pnpm --filter @patron/api drizzle:generate` runs
Then a new migration file is created (e.g., 0001_users_merchants_orders.sql)
And it includes `CREATE TABLE users`, `CREATE TABLE merchants`, `CREATE TABLE orders`
And exit code is 0

Given the migration is applied
When `pnpm --filter @patron/api drizzle:migrate` runs
Then exit code is 0
And `psql $POSTGRES_URL -c "\dt"` lists at least the tables: meta, users, merchants, orders

Given the schema is loaded into Drizzle
When a Vitest test inserts a row into users, then merchants, then orders (with foreign keys)
Then the inserts succeed
And `select` returns the rows
And foreign key constraints are enforced (deleting a user with orders fails with FK violation)
And `pnpm --filter @patron/api test --run schemas/users-merchants-orders.test.ts` exits 0

Given the schema is imported by another file
When `import { users, merchants, orders } from '@patron/api/db/schema'` is used
Then all three tables export typed Drizzle table objects
And TypeScript infers row types correctly (no `any`)
```

## File modification map

- `apps/api/src/db/schema/users.ts` — NEW — Drizzle table `users`:
  - `id: uuid('id').primaryKey().defaultRandom()`
  - `walletAddress: varchar('wallet_address', { length: 42 }).unique().notNull()` (ETH address, lowercase enforced via check constraint)
  - `agentId: bigint('agent_id', { mode: 'bigint' }).unique()` (the ERC-8004 Identity NFT tokenId; nullable until first agent mint)
  - `email: varchar('email', { length: 320 })` (nullable; only present for Privy social-login users)
  - `frozen: boolean('frozen').notNull().default(false)` (mirrors AgentAuthorizer state; updated by indexer story-38)
  - `spendCapPerDay: bigint('spend_cap_per_day', { mode: 'bigint' })` (USDC 6-dec wei; nullable until first session key issued)
  - `createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()`
  - `updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()`
  - indexes: `idx_users_wallet_address`, `idx_users_agent_id`
- `apps/api/src/db/schema/merchants.ts` — NEW — Drizzle table `merchants`:
  - `id: uuid('id').primaryKey().defaultRandom()`
  - `slug: varchar('slug', { length: 64 }).unique().notNull()` (matches MerchantRegistry slug)
  - `slugHash: varchar('slug_hash', { length: 66 }).unique().notNull()` (`0x` + keccak256 hex; matches contracts/lib/SlugLib.sol)
  - `ownerAddress: varchar('owner_address', { length: 42 }).notNull()`
  - `payoutAddress: varchar('payout_address', { length: 42 }).notNull()`
  - `name: varchar('name', { length: 128 }).notNull()`
  - `description: text('description')`
  - `logoUrl: text('logo_url')`
  - `websiteUrl: text('website_url')`
  - `category: varchar('category', { length: 32 })` (e.g., 'fashion', 'digital', 'services')
  - `bondAmount: bigint('bond_amount', { mode: 'bigint' }).notNull()` (USDC wei)
  - `bondTxHash: varchar('bond_tx_hash', { length: 66 }).notNull()` (proof of on-chain bond)
  - `status: varchar('status', { length: 16 }).notNull().default('pending')` (pending|active|suspended|offboarded — mirrors contract enum)
  - `reputationScore: numeric('reputation_score', { precision: 18, scale: 6 }).notNull().default('0')`
  - `registeredAt: timestamp('registered_at', { withTimezone: true })` (nullable until on-chain confirmation)
  - `createdAt`, `updatedAt`
  - indexes: `idx_merchants_slug`, `idx_merchants_owner_address`, `idx_merchants_status`
- `apps/api/src/db/schema/orders.ts` — NEW — Drizzle table `orders`:
  - `id: uuid('id').primaryKey().defaultRandom()`
  - `merchantId: uuid('merchant_id').notNull().references(() => merchants.id)`
  - `userId: uuid('user_id').references(() => users.id)` (nullable: order intent created before wallet connect)
  - `externalReference: varchar('external_reference', { length: 128 }).notNull()` (merchant-side order ID)
  - `amountUsdc: bigint('amount_usdc', { mode: 'bigint' }).notNull()` (6-dec)
  - `currency: varchar('currency', { length: 8 }).notNull().default('USDC')`
  - `status: varchar('status', { length: 16 }).notNull().default('intent')` (intent|authorized|paid|refunded|cancelled|failed)
  - `positionId: bigint('position_id', { mode: 'bigint' })` (PatronVault positionId; nullable until openLoan succeeds)
  - `paymentTxHash: varchar('payment_tx_hash', { length: 66 })`
  - `repayTxHash: varchar('repay_tx_hash', { length: 66 })`
  - `metadata: jsonb('metadata').$type<Record<string, unknown>>()` (merchant-provided structured metadata)
  - `createdAt`, `updatedAt`
  - unique: `(merchant_id, external_reference)` composite (idempotent intents)
  - indexes: `idx_orders_user_id`, `idx_orders_merchant_id`, `idx_orders_status`, `idx_orders_position_id`
- `apps/api/src/db/schema/index.ts` — UPDATE — re-export users, merchants, orders
- `apps/api/src/db/schema/meta.ts` — UPDATE — bump version constant to 1 (post this migration)
- `apps/api/src/db/migrations/0001_users_merchants_orders.sql` — NEW (generated) — DDL for the three tables + indexes + FKs
- `apps/api/src/__tests__/schemas/users-merchants-orders.test.ts` — NEW — Vitest round-trips: insert user → insert merchant → insert order; assert FK enforcement; assert composite unique
- `apps/api/src/db/types.ts` — NEW — re-export inferred row types: `export type User = typeof users.$inferSelect; export type NewUser = typeof users.$inferInsert;` (and same for merchants + orders)

## Shell verification

```bash
cd apps/api

# Generate + migrate
pnpm drizzle:generate
ls src/db/migrations/0001_*.sql | xargs test -f
pnpm drizzle:migrate
test $? -eq 0

# Tables exist
psql "$POSTGRES_URL" -c "\dt" | grep -E '(^|\s)(users|merchants|orders)\s'

# Schema round-trip test
pnpm test --run schemas/users-merchants-orders.test.ts
test $? -eq 0

# Inferred types compile
pnpm typecheck
test $? -eq 0

# 400 LOC budget (each schema file)
wc -l src/db/schema/users.ts src/db/schema/merchants.ts src/db/schema/orders.ts | awk 'NR<=3 { if ($1 > 400) exit 1 }'
```

## Notes

- Field shapes derived directly from the design spec lines ~210-240 (the `users`/`merchants`/`orders` table sketch in `docs/superpowers/specs/2026-06-02-patron-design.md`).
- `slugHash` is stored alongside `slug` so the indexer (story-38) can look up merchants by the hash emitted in `MerchantRegistered` events without recomputing keccak in SQL.
- `agentId` is `bigint` (not numeric) because ERC-8004 token IDs are `uint256` but in practice fit in 64 bits for any plausible Patron user count. If we ever overflow, migrate to `numeric(78, 0)`.
- `amountUsdc` and `bondAmount` use `bigint` with `mode: 'bigint'` so TypeScript types are `bigint` not `string` — matches the EVM uint256 / 6-decimal USDC math we'll do on the agent side (Epic 3).
- Wallet addresses stored lowercase via a CHECK constraint (`CHECK (wallet_address = lower(wallet_address))`); enforce at insert via Drizzle's `$default` or a transformation in the repository layer.
- Per architecture.md, NO `any` types — `metadata: jsonb` uses `.$type<Record<string, unknown>>()` so callers narrow via Zod schemas.
- Per the design spec, the `users` table is **one row per wallet**; the agent identity is a separate concept (the ERC-8004 NFT tokenId stored in `agentId`). Some users may have a wallet row before the NFT is minted (during onboarding gap).
- File MUST stay under 400 LOC each.
- Story-33 covers `events`, `agent_tasks`, `api_keys` — those are separate to keep each schema file small.
