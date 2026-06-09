# Story 34 — Merchant onboarding endpoints (POST /merchants + GET /merchants/:slug)

**Epic:** Epic 2 — Backend Foundation
**Estimated:** ~2h
**Depends on:** story-32-db-schema-users-merchants-orders, story-21-sepolia-deployment

## BDD Acceptance Criteria

```
Given the api server is running
When `curl -X POST http://localhost:3001/merchants -H 'content-type: application/json' -d '{"slug":"threads-by-mara","name":"Threads by Mara","payoutAddress":"0x...","ownerAddress":"0x...","bondTxHash":"0x..."}'` runs
Then the request returns 201
And the body matches Zod schema MerchantResponse (id, slug, status, ...)
And the response contains `"status": "pending"` until the bond tx is verified on-chain
And a database row is created in the merchants table

Given a POST /merchants request with an invalid bondTxHash (not on-chain or wrong amount)
When the handler verifies the bond
Then it returns 400
And the body is `{"error":"bond_invalid","details":{...}}`
And no merchant row is created

Given a registered merchant
When `curl http://localhost:3001/merchants/threads-by-mara` runs
Then the response is 200
And the body matches Zod schema MerchantPublic (slug, name, description, category, status, reputationScore, websiteUrl, logoUrl)
And sensitive fields are NOT exposed (ownerAddress, bondTxHash are absent)

Given an unknown slug
When `curl http://localhost:3001/merchants/does-not-exist` runs
Then the response is 404
And the body is the standard error envelope `{"error":"merchant_not_found","path":"/merchants/does-not-exist"}`

Given valid input with a slug that already exists
When the POST request runs
Then the response is 409
And the body is `{"error":"slug_taken"}`
```

## File modification map

- `apps/api/src/routes/merchants.ts` — NEW — Hono router exporting two routes: `POST /merchants` + `GET /merchants/:slug`; mounted into `apps/api/src/app.ts` under `/merchants`
- `apps/api/src/schemas/merchants.ts` — NEW — Zod schemas:
  - `MerchantCreateRequest` (slug, name, description?, websiteUrl?, logoUrl?, category, payoutAddress, ownerAddress, bondTxHash)
  - `MerchantResponse` (id, slug, status, registeredAt, …) for the POST response
  - `MerchantPublic` (slug, name, description, category, status, reputationScore, websiteUrl, logoUrl) for the GET response (public surface; strips owner/bond fields)
- `apps/api/src/services/merchants.ts` — NEW — pure business logic:
  - `createMerchant(input): Promise<Merchant>` — validates input, computes slugHash via `keccak256(stringToBytes(slug))` (using `viem`), inserts row with status='pending', schedules `verifyMerchantBond` BullMQ job (story-39 already has BullMQ wired)
  - `verifyMerchantBond(merchantId): Promise<void>` — reads the bondTxHash via viem `publicClient.getTransactionReceipt`, parses the `MerchantRegistered` event from `MerchantRegistry` (using ABI from `@patron/shared/abi`), confirms (bondAmount >= minBondAmount AND slugHash matches AND tx status === 'success'); on success sets status='active'; on failure sets status='offboarded'
  - `getMerchantBySlug(slug): Promise<Merchant | null>`
- `apps/api/src/lib/viem.ts` — NEW — exports `publicClient` configured for the current chain (Sepolia default, Mainnet via env), with the chain config from `viem/chains`
- `apps/api/src/lib/env.ts` — UPDATE — add `MANTLE_RPC_URL: z.string().url()`, `MANTLE_CHAIN_ID: z.coerce.number().int().refine(v => v === 5000 || v === 5003)`
- `apps/api/src/__tests__/routes/merchants.test.ts` — NEW — Vitest integration tests using `app.request()` Hono helper; mocks viem reads via MSW (do NOT mock our own contracts per architecture.md banned patterns; mock only external RPC); covers happy path, duplicate slug, invalid bond, not-found GET
- `apps/api/src/__tests__/services/merchants.test.ts` — NEW — Vitest unit tests for the service layer (no HTTP)
- `apps/api/src/app.ts` — UPDATE — mount merchants router

## Shell verification

```bash
cd apps/api

# Tests pass
pnpm test --run routes/merchants services/merchants
test $? -eq 0

# Boot + happy path (against a local Anvil fork or live Sepolia)
pnpm dev &
DEV_PID=$!
sleep 3

# POST creates merchant (use a known-good bondTxHash from a prior MerchantRegistry.register call)
RESP=$(curl -s -X POST http://localhost:3001/merchants \
  -H 'content-type: application/json' \
  -d '{"slug":"test-slug","name":"Test","payoutAddress":"0x000000000000000000000000000000000000dEaD","ownerAddress":"0x000000000000000000000000000000000000bEEf","bondTxHash":"0xabc...","category":"fashion"}')
echo "$RESP" | jq -e '.slug == "test-slug"'

# GET returns public projection
curl -sf http://localhost:3001/merchants/test-slug | jq -e '.slug == "test-slug" and (.ownerAddress == null)'

# 404 path
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/merchants/does-not-exist | grep -q '^404$'

kill $DEV_PID
wait $DEV_PID 2>/dev/null || true
```

## Notes

- Per architecture.md "Banned patterns": no mocks in the hot path. Bond verification reads the LIVE on-chain receipt via viem (or against an Anvil fork for tests). MSW is allowed only to mock external RPC responses in unit tests.
- Bond verification logic:
  - Read receipt via `publicClient.getTransactionReceipt({ hash: bondTxHash })`
  - Parse logs with `parseEventLogs({ abi: merchantRegistryAbi, logs: receipt.logs, eventName: 'MerchantRegistered' })`
  - Assert: event present, `slugHash` arg matches our `keccak256` of input slug, `bondAmount >= minBondAmount` (read minBondAmount via `publicClient.readContract`)
  - Asserts the contract address matches `ADDRESSES[chain].MerchantRegistry` from `@patron/shared`
- Contract address per architecture.md "Mantle-specific details" → imported via `import { ADDRESSES } from '@patron/shared'`. NO hardcoded addresses (banned pattern).
- ABI per architecture.md: ABIs are generated from `packages/contracts/out/` and exported from `packages/shared/src/abi/` on every CI build. Use the generated ABI, never paste from chat.
- Per architecture.md "Context7 library research rule": coding agent MUST query Context7 for current `viem` `parseEventLogs` + `getTransactionReceipt` shapes before writing.
- The `verifyMerchantBond` job runs async via BullMQ — POST /merchants returns 201 with `status: 'pending'`, then the indexer/job flips status to `'active'` once verified. Backpressure handled by BullMQ.
- `slug_taken` (409) is caught at the DB layer via the unique constraint from story-32; surface a typed error from Drizzle's `unique_violation` PG error code (`23505`).
- File MUST stay under 400 LOC each.
- Auth on `POST /merchants` is INTENTIONALLY open in v1 — the on-chain bond is the spam deterrent. v2 will add EIP-4361 (Sign-In with Ethereum) gating.
