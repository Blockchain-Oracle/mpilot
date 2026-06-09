# Story 92 — @patron/sdk-js hosted-modal pattern (iframe + postMessage)

**Epic:** Epic 6 — Checkout SDKs
**Estimated:** ~2h
**Depends on:** story-91-sdk-js-button-component, story-76-checkout-flow-page

## BDD Acceptance Criteria

```
Given a Patron button has been clicked and an order intent was created (story-91)
When `Patron.openCheckout(orderId)` is called
Then a modal is rendered in the merchant's page consisting of:
  - A full-viewport overlay (rgba(0,0,0,0.6), pointer-events guard)
  - A centered iframe pointing to `${WEB_APP_URL}/checkout/${orderId}?embed=1`
  - A close button (×) at the iframe's top-right (rendered in the parent, not the iframe)
And the iframe is `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"`

Given the iframe loads our hosted /checkout page
When the page is in `?embed=1` mode
Then it strips chrome (no top nav, no footer) to render as a self-contained modal
And it knows it must postMessage events back to the parent

Given the user interacts with the iframe (confirms, cancels, completes, errors)
When the iframe posts `{ type: 'patron:event', event: 'success'|'cancel'|'error'|'intent', payload }` to the parent
Then `window.addEventListener('message')` in the SDK validates the origin (must match configured `webAppUrl` origin)
And dispatches the event to the registered callbacks (story-93)
And on `success` or `cancel` closes the modal

Given the user clicks the overlay outside the iframe
When the click fires
Then a "cancel" confirmation prompts: "Are you sure you want to cancel checkout?"
And on confirm the modal closes + the cancel callback fires

Given the user presses Escape
When the keydown fires while the modal is open
Then the same cancel-confirm flow runs

Given the modal is open and the user is on mobile (< 640px)
When the modal renders
Then it expands to full-viewport (no overlay padding) for usability

Given Vitest runs packages/sdk-js/src/__tests__/modal.test.ts
When the spec runs with jsdom + postMessage simulation
Then open, close, message origin validation, escape key, overlay click all pass

Given the modal is opened
When the inert background is in place
Then keyboard tab navigation traps within the modal (focus trap)
```

## File modification map

- `packages/sdk-js/src/modal/PatronModal.ts` — NEW — class with `open(orderId)`, `close()`; renders overlay + iframe + close button; manages focus trap; listens for postMessage events.
- `packages/sdk-js/src/modal/postMessageBus.ts` — NEW — typed event bus; validates origin against configured webAppUrl; dispatches to subscribers.
- `packages/sdk-js/src/modal/focusTrap.ts` — NEW — minimal focus trap utility (no external dep).
- `packages/sdk-js/src/modal/styles.ts` — NEW — modal-specific stylesheet (overlay, iframe wrapper, close button, mobile breakpoint). Injected via the shared `styles.ts` mechanism from story-91.
- `packages/sdk-js/src/index.ts` — UPDATE — add `openCheckout` to public API; button click in story-91 now calls `openCheckout(orderId)` after intent creation.
- `packages/sdk-js/src/client/PatronClient.ts` — UPDATE — config now includes `webAppUrl` (default `https://app.patron.xyz` for prod, configurable for dev).
- `packages/sdk-js/src/__tests__/modal.test.ts` — NEW — Vitest with jsdom + simulated postMessage.
- `packages/sdk-js/src/__tests__/postMessageBus.test.ts` — NEW — Vitest covering origin validation + dispatch.
- `apps/web/app/checkout/[orderId]/page.tsx` — UPDATE — when `?embed=1` query param present, render in embed mode (strip nav/footer); post events to `window.parent` on confirm/cancel/success/error.
- `apps/web/lib/embed/postEvents.ts` — NEW — helper to post `{ type: 'patron:event', event, payload }` to parent; safe when no parent (logs warning).
- `packages/sdk-js/README.md` — UPDATE — add Modal section explaining the iframe pattern + security model.

## Shell verification

```bash
pnpm --filter @patron/sdk-js build
pnpm --filter web build
test $? -eq 0

# Modal class + bus + focus trap
test -f packages/sdk-js/src/modal/PatronModal.ts
test -f packages/sdk-js/src/modal/postMessageBus.ts
test -f packages/sdk-js/src/modal/focusTrap.ts

# openCheckout exported
grep -q "openCheckout" packages/sdk-js/src/index.ts

# Embed mode in checkout page
grep -q "embed" "apps/web/app/checkout/[orderId]/page.tsx"
grep -q "postMessage" apps/web/lib/embed/postEvents.ts

# Vitest
pnpm --filter @patron/sdk-js test --run modal
test $? -eq 0

# 400-LOC
for f in $(find packages/sdk-js/src/modal -type f -name "*.ts"); do
  wc -l "$f" | awk '{ if ($1 > 400) exit 1 }'
done
```

## Notes

- **Hosted-modal-via-iframe** is the pattern used by Stripe Checkout, Plaid Link, Onfido. Avoids merchants having to implement wallet plumbing in their pages.
- **Origin validation is non-negotiable**: the message listener must verify `event.origin === new URL(client.webAppUrl).origin`. Without this, any page on the internet could fake events.
- The iframe sandbox attribute is permissive enough to run our Next.js page + wallet flows but still isolates from the merchant's page.
- The close button is in the PARENT (not the iframe) so it always works even if the iframe's content is in a broken state.
- Focus trap: implement a minimal one (cycle Tab/Shift+Tab through focusable elements within the modal); don't pull in `focus-trap` dep (bundle budget).
- Embed mode in `apps/web/app/checkout/[orderId]/page.tsx`: detect `?embed=1` and render the same `<CheckoutModal>` component without site chrome. Post events at lifecycle transitions.
- Mobile fullscreen: critical for UX in narrow viewports.
- Escape + overlay-click cancel: both confirm first (prevent accidental cancellations mid-flow).
- Bundle budget still applies — modal code should be under ~6kb gz on top of story-91.
- File size < 400 LOC per file enforced.
- This story completes the user-facing SDK loop. Callbacks (story-93) make it observable to the merchant.
