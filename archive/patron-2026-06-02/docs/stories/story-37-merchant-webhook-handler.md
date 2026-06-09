# Story 37 — Merchant webhook handler (POST /webhooks/merchant)

**Epic:** Epic 2 — Backend Foundation
**Estimated:** ~2h
**Depends on:** story-36-order-intent-endpoint

## BDD Acceptance Criteria

```
Given a merchant POSTs a valid signed settle event
When `curl -X POST http://localhost:3001/webhooks/merchant -H 'content-type: application/json' -H 'x-patron-signature: <hmac>' -d '{"type":"settle","orderId":"<uuid>","externalReference":"ord-123","amountUsdc":"75000000","merchantTxId":"merchant-tx-1"}'` runs
Then the response is 202 (accepted; processing async)
And the body is `{"ok":true,"eventId":"<uuid>"}`
And an entry is enqueued onto a BullMQ queue `merchant_webhooks` for downstream processing

Given the same webhook (same merchantTxId) is delivered twice
When the second delivery is processed
Then the response is still 202 (idempotent at the DB layer via unique constraint on (merchant_id, merchant_tx_id))
And the queue is NOT enqueued a second time
And `pnpm --filter @patron/api test --run routes/webhooks-merchant.test.ts` exits 0

Given a webhook with an invalid HMAC signature
When the handler runs
Then the response is 401
And the body is `{"error":"signature_invalid"}`
And no row is persisted and no job is enqueued

Given a refund event for an order with status='paid'
When the worker processes the job
Then the order's status flips to 'refunded'
And a new `events` row is written
And the original repay flow is triggered (via agent task with intent='repay'; see story-39 + Epic 3)
```

## File modification map

- `apps/api/src/routes/webhooks.ts` — NEW — Hono router `POST /webhooks/merchant`; mounted at `/webhooks` in `apps/api/src/app.ts`
- `apps/api/src/schemas/webhooks.ts` — NEW — Zod schemas:
  - `MerchantWebhookEvent` discriminated union on `type: 'settle' | 'refund' | 'cancel'`
  - `SettlePayload`, `RefundPayload`, `CancelPayload` (each with orderId, externalReference, amountUsdc, merchantTxId, optional reason)
- `apps/api/src/middleware/webhookSignature.ts` — NEW — verifies `x-patron-signature` header: HMAC-SHA256 over the raw request body using a per-merchant `webhook_secret` (looked up by merchant id derived from a `x-patron-merchant` header)
- `apps/api/src/db/schema/merchantWebhookEvents.ts` — NEW — Drizzle table `merchant_webhook_events`:
  - `id: uuid('id').primaryKey().defaultRandom()`
  - `merchantId: uuid('merchant_id').notNull().references(() => merchants.id)`
  - `orderId: uuid('order_id').references(() => orders.id)`
  - `merchantTxId: varchar('merchant_tx_id', { length: 128 }).notNull()`
  - `type: varchar('type', { length: 16 }).notNull()`
  - `payload: jsonb('payload').$type<Record<string, unknown>>().notNull()`
  - `processedAt: timestamp('processed_at', { withTimezone: true })`
  - `createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()`
  - unique: `(merchant_id, merchant_tx_id)`
  - indexes: `idx_mwe_order_id`, `idx_mwe_processed_at` (partial WHERE processed_at IS NULL)
- `apps/api/src/db/schema/merchants.ts` — UPDATE — add `webhookSecret: varchar('webhook_secret', { length: 64 })` (nullable; null = webhooks disabled); add `webhookUrl: text('webhook_url')` (for outbound webhooks we send to the merchant; out of scope for v1)
- `apps/api/src/db/schema/index.ts` — UPDATE — re-export `merchantWebhookEvents`
- `apps/api/src/db/migrations/0003_webhooks.sql` — NEW (generated) — adds merchant_webhook_events + webhook columns on merchants
- `apps/api/src/services/webhooks.ts` — NEW — business logic:
  - `recordWebhook(merchantId, payload)`: inserts merchant_webhook_events row (idempotent via unique constraint), returns `{eventId, isNew}`
  - `enqueueWebhookProcessing(eventId)`: pushes job to BullMQ `merchant_webhooks` queue
- `apps/api/src/workers/merchantWebhookWorker.ts` — NEW — BullMQ worker (uses scheduler infra from story-39); processes each event by type: 'settle' → update order.status='paid', schedule agent repay job; 'refund' → update order.status='refunded', schedule agent repay job; 'cancel' → update order.status='cancelled'
- `apps/api/src/lib/env.ts` — UPDATE — add `WEBHOOK_DEFAULT_SECRET_LENGTH: z.coerce.number().default(48)` (used by merchant onboarding to generate per-merchant webhook secrets)
- `apps/api/src/__tests__/routes/webhooks-merchant.test.ts` — NEW — Vitest tests: valid signature → 202 + enqueue; invalid signature → 401; replayed merchantTxId → 202 + no duplicate enqueue; unknown event type → 400; refund flow updates order

## Shell verification

```bash
cd apps/api

# Migrations
pnpm drizzle:generate
ls src/db/migrations/0003_*.sql | xargs test -f
pnpm drizzle:migrate

# Tests pass
pnpm test --run routes/webhooks-merchant services/webhooks
test $? -eq 0

# Boot + smoke
pnpm dev &
DEV_PID=$!
sleep 3

# Build a signed payload (helper one-liner using openssl)
SECRET="test-secret"
BODY='{"type":"settle","orderId":"00000000-0000-0000-0000-000000000000","externalReference":"x","amountUsdc":"75000000","merchantTxId":"tx-1"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)

# Invalid signature → 401
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3001/webhooks/merchant \
  -H 'content-type: application/json' \
  -H 'x-patron-signature: invalid' \
  -H 'x-patron-merchant: 00000000-0000-0000-0000-000000000000' \
  -d "$BODY" | grep -q '^401$'

kill $DEV_PID
wait $DEV_PID 2>/dev/null || true
```

## Notes

- HMAC-SHA256 over the **raw** request body — not the JSON-parsed object — to avoid serialization differences. The middleware reads the raw body via Hono's `c.req.raw.clone().arrayBuffer()` before parsing.
- Per-merchant secrets: generated at merchant onboarding (story-34 should be updated in a follow-up to surface the secret to the merchant ONCE; the merchant stores it server-side). For now, document the gap in the merchant signup response.
- Idempotency at THREE layers:
  1. DB unique constraint on `(merchant_id, merchant_tx_id)` — re-inserts fail cleanly
  2. The route handler catches the unique-violation and returns 202 with the existing eventId
  3. The BullMQ worker is idempotent — processing the same event twice yields the same state
- Webhooks are **inbound from merchants to us**, not outbound. Merchants notify us when their off-chain payment / settlement state changes (e.g., goods shipped, order cancelled, refund issued). We update our order state + may trigger agent tasks (e.g., refund → agent repays the loan early).
- 202 (Accepted, not Processed) is the right status for async pipelines — the work is queued, not completed. Caller should not retry on 202.
- BullMQ queue + worker infra lands in story-39; this story references it but the worker file can be a stub that throws "scheduler not initialised" until story-39 ships. The route + DB write must work standalone.
- Per architecture.md "Banned patterns": no silent error swallowing; signature failures log structured warning before returning 401.
- File MUST stay under 400 LOC each.
