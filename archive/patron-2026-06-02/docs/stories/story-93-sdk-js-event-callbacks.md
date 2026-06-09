# Story 93 — @patron/sdk-js event callbacks (onIntent, onSuccess, onError, onCancel)

**Epic:** Epic 6 — Checkout SDKs
**Estimated:** ~1h
**Depends on:** story-92-sdk-js-modal-pattern

## BDD Acceptance Criteria

```
Given a merchant initialized the SDK with callbacks:
  Patron.init({
    merchantSlug: 'threads-by-mara',
    apiBaseUrl: '…',
    onIntent: (intent) => { /* … */ },
    onSuccess: (result) => { /* … */ },
    onError: (err) => { /* … */ },
    onCancel: () => { /* … */ },
  })
When the user clicks the button and the order intent is created
Then `onIntent({ orderId, merchantSlug, amountUsdc, externalReference, checkoutUrl, expiresAt })` fires before the modal opens

Given the iframe posts a `success` event with payload `{ orderId, txHash, receiptUrl }`
When the SDK message handler runs
Then `onSuccess({ orderId, txHash, receiptUrl })` fires
And the modal closes

Given the iframe posts an `error` event
When the SDK message handler runs
Then `onError({ code, message, orderId? })` fires
And the modal remains open (so the user can retry) UNLESS code === 'fatal'

Given the user cancels (escape, overlay click, or in-iframe cancel)
When the cancel confirms
Then `onCancel({ orderId? })` fires
And the modal closes

Given a callback throws
When the throw happens
Then the SDK logs the error (console.error in dev, swallows in prod with optional sentry hook)
And other callbacks for the same event still fire (each callback is wrapped in try/catch)

Given a merchant wants to subscribe AFTER init
When they call `Patron.on('success', handler)` and later `Patron.off('success', handler)`
Then the handler is wired/unwired
And multiple handlers per event are supported

Given Vitest runs packages/sdk-js/src/__tests__/callbacks.test.ts
When the spec executes
Then all 4 event types fire in the correct order, error swallowing works, on/off behaves as expected
```

## File modification map

- `packages/sdk-js/src/events/EventEmitter.ts` — NEW — typed event emitter; `on`, `off`, `emit`; each handler call wrapped in try/catch.
- `packages/sdk-js/src/events/types.ts` — NEW — strict types for each event payload:
  - `IntentEvent { orderId; merchantSlug; amountUsdc; externalReference; checkoutUrl; expiresAt }`
  - `SuccessEvent { orderId; txHash; receiptUrl }`
  - `ErrorEvent { code: 'fatal'|'transient'|'declined'; message; orderId? }`
  - `CancelEvent { orderId? }`
- `packages/sdk-js/src/client/PatronClient.ts` — UPDATE — accepts callbacks in `init`; wires them to the emitter; expose `on`/`off` on the public API.
- `packages/sdk-js/src/index.ts` — UPDATE — re-export emitter types; add `on`, `off` to public API.
- `packages/sdk-js/src/api/createOrderIntent.ts` — UPDATE — on success, emit `intent` event before returning.
- `packages/sdk-js/src/modal/PatronModal.ts` — UPDATE — emit `success`, `error`, `cancel` based on postMessage payloads.
- `packages/sdk-js/src/__tests__/callbacks.test.ts` — NEW — Vitest covering ordering, error swallowing, on/off.
- `packages/sdk-js/README.md` — UPDATE — add Callbacks section with example.

## Shell verification

```bash
pnpm --filter @patron/sdk-js build
test $? -eq 0

# Emitter + types
test -f packages/sdk-js/src/events/EventEmitter.ts
test -f packages/sdk-js/src/events/types.ts

# Public API exposes on/off
grep -q "export.*on\b" packages/sdk-js/src/index.ts
grep -q "export.*off\b" packages/sdk-js/src/index.ts

# Vitest
pnpm --filter @patron/sdk-js test --run callbacks
test $? -eq 0

# 400-LOC
for f in $(find packages/sdk-js/src/events -type f -name "*.ts"); do
  wc -l "$f" | awk '{ if ($1 > 400) exit 1 }'
done
```

## Notes

- Callbacks let merchants do server-side fulfillment (e.g., grant a digital good on `onSuccess`). Critical for the demo merchants in Epic 7 (Pixelink delivers license keys on success).
- All 4 events match the typical SaaS checkout SDK contract (Stripe.js, Klarna OnSiteMessaging) — merchants recognize the pattern.
- Error swallowing prevents one bad handler from breaking the rest. Log via `console.error` in dev; in prod (NODE_ENV=production), allow opt-in Sentry breadcrumb via `client.config.errorReporter`.
- `code` taxonomy on error is opinionated: `fatal` closes the modal, `transient` keeps it open (retry), `declined` keeps it open with a "request adjustment" affordance.
- `on`/`off` runtime subscription is needed for React/Vue wrappers (`@patron/react` story 96 hooks rely on it).
- File size < 400 LOC enforced.
- Last story in the vanilla SDK chain (90-93) — package is feature-complete for v1 after this.
