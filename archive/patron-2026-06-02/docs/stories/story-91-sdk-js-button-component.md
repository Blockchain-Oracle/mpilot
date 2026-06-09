# Story 91 — @patron/sdk-js button component (script-tag drop-in)

**Epic:** Epic 6 — Checkout SDKs
**Estimated:** ~2h
**Depends on:** story-90-sdk-js-scaffold

## BDD Acceptance Criteria

```
Given a merchant has the SDK loaded via <script src="…/index.global.js">
When their HTML contains `<div data-patron-button data-amount="75.00" data-currency="USDC" data-external-reference="ord-123"></div>`
And the merchant calls `Patron.init({ merchantSlug: 'threads-by-mara', apiBaseUrl: 'https://api.patron.xyz' })`
Then `Patron.mountAll()` is called automatically (on init)
And each `[data-patron-button]` element is replaced with a Patron checkout button
And the button has text "Pay with Patron", logo, brand color (#1E40AF), accessible label

Given the merchant prefers programmatic mounting
When they call `Patron.mount(selector, { amount, currency, externalReference, metadata? })`
Then the matching element is replaced with the button
And subsequent calls to unmount(selector) cleanly remove the element + handlers

Given a user clicks a mounted Patron button
When the click fires
Then a POST request to `${apiBaseUrl}/orders/intent` is sent with `{ merchantSlug, externalReference, amountUsdc, metadata }`
And `amountUsdc` is converted from `data-amount` (decimal) to base-unit string (6-decimal USDC, no float precision loss)
And on success the modal is opened (story-92 owns the modal; this story owns the trigger)
And on failure an error callback fires (story-93)

Given a merchant uses inline attribute config without calling init
When the button is rendered
Then no API call fires (init is required)
And a console warning explains: "@patron/sdk-js: call Patron.init() before mounting buttons"

Given the button is keyboard-focused
When the user presses Enter or Space
Then the click handler fires
And focus styling matches the Patron design tokens (focus-visible ring)

Given Vitest runs packages/sdk-js/src/__tests__/button.test.ts
When the spec executes against jsdom
Then mount/unmount, click → fetch, attribute parsing, keyboard handling all pass
```

## File modification map

- `packages/sdk-js/src/button/PatronButton.ts` — NEW — class with `mount(el, opts)`, `unmount(el)`, `render(el, opts)`. Pure DOM (no framework dependency). Inserts a `<button>` with Patron branding, `aria-label`, focus ring CSS, brand color background.
- `packages/sdk-js/src/button/parseAttributes.ts` — NEW — pure function: reads `data-amount`, `data-currency`, `data-external-reference`, `data-metadata` from an element; validates + converts decimal to base-unit bigint string.
- `packages/sdk-js/src/button/styles.ts` — NEW — injected stylesheet (single `<style>` tag added once); namespaced classes (`.patron-button`); avoids polluting host page styles.
- `packages/sdk-js/src/api/createOrderIntent.ts` — NEW — `createOrderIntent(client, opts): Promise<{orderId, checkoutUrl}>`; fetch-based; structured error type.
- `packages/sdk-js/src/index.ts` — UPDATE — add `mount`, `mountAll`, `unmount` to the public API. `init` now auto-runs `mountAll` after config is set.
- `packages/sdk-js/src/__tests__/button.test.ts` — NEW — Vitest with jsdom env; covers mount, unmount, attribute parsing, click → fetch (mocked), keyboard nav.
- `packages/sdk-js/src/__tests__/parseAttributes.test.ts` — NEW — Vitest covering edge cases (decimal precision, missing attrs, invalid values).
- `packages/sdk-js/README.md` — UPDATE — add Button usage section with HTML examples.

## Shell verification

```bash
pnpm --filter @patron/sdk-js build
test $? -eq 0

# Button class + helpers present
test -f packages/sdk-js/src/button/PatronButton.ts
test -f packages/sdk-js/src/button/parseAttributes.ts
test -f packages/sdk-js/src/api/createOrderIntent.ts

# Vitest with jsdom
pnpm --filter @patron/sdk-js test --run button
test $? -eq 0

# Smoke: button class is exported from IIFE bundle
node -e "const w={addEventListener:()=>{}}; global.window=w; global.document={querySelectorAll:()=>[],createElement:()=>({style:{},appendChild:()=>{},setAttribute:()=>{}}),head:{appendChild:()=>{}}}; require('./packages/sdk-js/dist/index.global.js'); if (typeof window.Patron.mount !== 'function') process.exit(1)"

# Bundle size budget (< 15kb gz for button + scaffold)
gzip -c packages/sdk-js/dist/index.global.js | wc -c | awk '{ if ($1 > 15360) { print "BUNDLE TOO BIG"; exit 1 } }'

# 400-LOC
for f in $(find packages/sdk-js/src -type f -name "*.ts"); do
  wc -l "$f" | awk '{ if ($1 > 400) exit 1 }'
done
```

## Notes

- **No framework dep**: this is the vanilla SDK. Don't reach for React/Vue/Lit — pure DOM only.
- Auto-mount on init + manual `Patron.mount` both work; the data-attribute pattern matches Stripe.js / Klarna's API which merchants already know.
- Amount conversion: a merchant writes `data-amount="75.00"` (USD-style decimal); the SDK must convert to 6-dec USDC base units (75000000n) without `parseFloat` precision loss. Use string math (split on `.`, pad/truncate fractional, parse as bigint).
- Styles are injected once (idempotent `<style id="patron-sdk-styles">`) to avoid collisions across multiple buttons on the same page.
- Brand color `#1E40AF` (deep indigo, ux-spec `--accent`).
- Click handler creates the intent THEN opens the modal — modal-open code is story-92.
- Keyboard support is critical for accessibility minimums (ux-spec).
- Bundle size budget: keep aggregate IIFE under 15kb gz (current + button + modal in stories 91-92 should still fit). If we blow the budget, code-split modal to lazy-load.
- File size < 400 LOC per file enforced.
- This is the **1-line merchant integration** the PRD promises — `<script src>` + `<div data-patron-button>` is the win.
