# Story 36 — Order intent endpoint (POST /orders/intent)

**Epic:** Epic 2 — Backend Foundation
**Estimated:** ~2h
**Depends on:** story-32-db-schema-users-merchants-orders, story-34-merchant-onboarding-endpoints

## BDD Acceptance Criteria

```
Given a merchant has registered and is active
When `curl -X POST http://localhost:3001/orders/intent -H 'content-type: application/json' -d '{"merchantSlug":"threads-by-mara","externalReference":"ord-123","amountUsdc":"75000000","metadata":{"product":"Mint Sweater"}}'` runs
Then the response is 201
And the body matches Zod schema OrderIntentResponse: `{orderId, merchantSlug, amountUsdc, status:"intent", checkoutUrl, expiresAt}`
And an `orders` row is created with status='intent', userId=null
And `pnpm --filter @patron/api test --run routes/orders-intent.test.ts` exits 0

Given the same (merchantSlug, externalReference) is POSTed twice
When the second request runs
Then the response is 200 (not 201)
And the body matches the same OrderIntentResponse with the original orderId (idempotent)

Given a request references a non-existent merchant
When the handler runs
Then the response is 404
And the body is `{"error":"merchant_not_found"}`

Given a request references a merchant with status='suspended'
When the handler runs
Then the response is 403
And the body is `{"error":"merchant_suspended"}`

Given a request with amountUsdc <= 0 or > max (configurable, default 10_000e6 = 10000 USDC)
When the handler runs
Then the response is 400
And the body is `{"error":"amount_invalid"}`
```

## File modification map

- `apps/api/src/routes/orders.ts` — NEW — Hono router; `POST /orders/intent`; mounted at `/orders` in `apps/api/src/app.ts`
- `apps/api/src/schemas/orders.ts` — NEW — Zod schemas:
  - `OrderIntentRequest` (merchantSlug, externalReference, amountUsdc as string of bigint, currency optional default 'USDC', metadata)
  - `OrderIntentResponse` (orderId, merchantSlug, amountUsdc, status, checkoutUrl, expiresAt)
- `apps/api/src/services/orders.ts` — NEW — business logic:
  - `createOrderIntent(input): Promise<{order, created: boolean}>` — looks up merchant by slug, validates merchant active, validates amount bounds, upserts order keyed on `(merchantId, externalReference)`, returns existing if duplicate
  - `buildCheckoutUrl(orderId, baseUrl)`: constructs `${baseUrl}/checkout/${orderId}` (web app URL from env)
- `apps/api/src/lib/env.ts` — UPDATE — add `APP_BASE_URL: z.string().url()` (web app URL), `MAX_ORDER_AMOUNT_USDC: z.coerce.bigint().default(10_000_000_000n)` (10k USDC in 6-dec wei), `ORDER_INTENT_TTL_SECONDS: z.coerce.number().default(900)` (15 min)
- `apps/api/src/middleware/sdkAuth.ts` — NEW — middleware that authenticates SDK callers via merchant-scoped API key (in `Authorization: Bearer <merchant_api_key>` header); for v1 the SDK may be UNAUTHENTICATED on `POST /orders/intent` (the bond on the merchant is the spam deterrent + we rely on the externalReference being merchant-side opaque) — choose unauthenticated v1 path and document the tradeoff
- `apps/api/src/__tests__/routes/orders-intent.test.ts` — NEW — Vitest tests:
  - happy path → 201 + correct shape
  - idempotent re-POST → 200 + same orderId
  - missing merchant → 404
  - suspended merchant → 403
  - amount too low / too high → 400
  - merchant slug with valid format but not registered → 404
- `apps/api/src/__tests__/services/orders.test.ts` — NEW — service-layer unit tests
- `apps/api/src/app.ts` — UPDATE — mount orders router

## Shell verification

```bash
cd apps/api

# Tests pass
pnpm test --run routes/orders-intent services/orders
test $? -eq 0

# Boot + e2e probe
pnpm dev &
DEV_PID=$!
sleep 3

# Seed a merchant (or rely on a test-setup script that seeds 'threads-by-mara')
# Then exercise the intent endpoint:
RESP=$(curl -sf -X POST http://localhost:3001/orders/intent \
  -H 'content-type: application/json' \
  -d '{"merchantSlug":"threads-by-mara","externalReference":"ord-smoke-1","amountUsdc":"75000000","metadata":{"product":"Sweater"}}')
echo "$RESP" | jq -e '.status == "intent"'
echo "$RESP" | jq -e '.checkoutUrl | startswith("http")'

# Idempotency
RESP2=$(curl -sf -X POST http://localhost:3001/orders/intent \
  -H 'content-type: application/json' \
  -d '{"merchantSlug":"threads-by-mara","externalReference":"ord-smoke-1","amountUsdc":"75000000"}')
test "$(echo $RESP | jq -r .orderId)" = "$(echo $RESP2 | jq -r .orderId)"

# Missing merchant → 404
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3001/orders/intent \
  -H 'content-type: application/json' \
  -d '{"merchantSlug":"does-not-exist","externalReference":"x","amountUsdc":"1000000"}' | grep -q '^404$'

kill $DEV_PID
wait $DEV_PID 2>/dev/null || true
```

## Notes

- This endpoint is the **SDK entrypoint**. When a user clicks "Pay with Patron" on a merchant storefront, the merchant's server (via the SDK in Epic 6) calls `POST /orders/intent` to create the order, then redirects/opens the modal to the `checkoutUrl`.
- `amountUsdc` is sent as a STRING (not number) over JSON to preserve bigint precision. Server parses to bigint via Zod transform: `z.string().regex(/^\d+$/).transform(s => BigInt(s))`.
- `externalReference` is merchant-side opaque; the `(merchantId, externalReference)` composite unique from story-32 gives us idempotency at the DB layer.
- `userId` is intentionally null at intent creation — the user has not yet clicked through the modal and authenticated. When they sign in on `/checkout/:orderId` (story-76), the user is attached to the order.
- `checkoutUrl` returned from this endpoint is what the SDK redirects/iframes to. URL pattern matches the web app route in story-76.
- `expiresAt` = now + `ORDER_INTENT_TTL_SECONDS` (default 15 min). Stale intents are not processed; a scheduled cleanup job (later story) sweeps them.
- v1 keeps this endpoint **unauthenticated** because the merchant bond posted on-chain (story-15) is the spam/abuse deterrent. A malicious caller would burn a merchant's bond for nothing. v2 may add merchant API keys (`api_keys` table from story-33 supports this).
- Per architecture.md "Banned patterns": no `any`, no `console.log`, no silent error swallowing.
- File MUST stay under 400 LOC each.
- This endpoint is gating for Epic 6 (SDKs) and Epic 7 (demo merchants) — both consume it.
