# Story 95 — @patron/react <PatronButton /> component

**Epic:** Epic 6 — Checkout SDKs
**Estimated:** ~1h
**Depends on:** story-94-sdk-react-scaffold, story-93-sdk-js-event-callbacks

## BDD Acceptance Criteria

```
Given a React consumer wraps their app with <PatronProvider config={...}>
When they render <PatronButton amount="75.00" currency="USDC" externalReference="ord-123" />
Then a Patron-branded button is rendered
And clicking it creates an order intent + opens the hosted checkout modal (delegates to sdk-js)

Given the consumer passes onSuccess / onError / onCancel as props
When the corresponding event fires
Then the prop callback is invoked
And the underlying sdk-js callback continues to fire too (no override of the provider-level handlers)

Given the consumer passes className or style props
When the component renders
Then user styles merge with default styles
And the button retains its accessible label and focus ring

Given the consumer renders the button before the provider mounts (or outside it)
When the button is rendered
Then a clear dev-time error is thrown: "<PatronButton /> must be rendered inside <PatronProvider>"

Given the consumer passes `disabled={true}`
When the button renders
Then it is visually disabled, click handler is a no-op, aria-disabled is set

Given the consumer passes `children` (custom button content)
When the button renders
Then the custom content replaces the default "Pay with Patron" + logo
But all event/click behavior remains

Given Vitest runs packages/sdk-react/src/__tests__/PatronButton.test.tsx
When the spec executes
Then default render, click triggers sdk-js openCheckout, callback props fire, disabled blocks click
```

## File modification map

- `packages/sdk-react/src/components/PatronButton.tsx` — NEW — `"use client"`; functional component; uses `usePatron()`; renders a `<button>` styled per Patron tokens (or accepts children); onClick calls `client.openCheckout` indirectly via `client.createIntent + openModal` (uses sdk-js public API).
- `packages/sdk-react/src/components/usePatronButtonClick.ts` — NEW — internal hook encapsulating intent creation + modal open + per-button callback wiring/unwiring.
- `packages/sdk-react/src/components/styles.ts` — NEW — tiny CSS-in-JS object or className constants; matches sdk-js styling for consistency.
- `packages/sdk-react/src/index.ts` — UPDATE — re-export `PatronButton`.
- `packages/sdk-react/src/__tests__/PatronButton.test.tsx` — NEW — Vitest + @testing-library/react.
- `packages/sdk-react/README.md` — UPDATE — add Button section + examples with TS types.

## Shell verification

```bash
pnpm --filter @patron/react build
test $? -eq 0

# Component exists + exported
test -f packages/sdk-react/src/components/PatronButton.tsx
grep -q "PatronButton" packages/sdk-react/src/index.ts

# Uses usePatron from context
grep -q "usePatron" packages/sdk-react/src/components/PatronButton.tsx

# Vitest
pnpm --filter @patron/react test --run PatronButton
test $? -eq 0

# 400-LOC
for f in $(find packages/sdk-react/src/components -type f \( -name "*.ts" -o -name "*.tsx" \)); do
  wc -l "$f" | awk '{ if ($1 > 400) exit 1 }'
done
```

## Notes

- **Thin wrapper**: this component should NOT re-implement the button — it delegates clicks to the sdk-js client.
- Per-button callbacks (`onSuccess` prop) are ADDITIVE — they fire alongside the provider-level callbacks via on/off subscription scoped to this button's intent.
- Custom `children` support is critical for merchants who want to keep their brand button look but get Patron's behavior.
- `disabled` matters because merchants may need to gate the button on cart validity, terms agreement, etc.
- The dev-time error for missing provider should be friendly + suggest the fix.
- Tailwind/CSS Modules support: the component should be styling-agnostic (use inline styles + accept className override) so it works in any merchant app.
- File size < 400 LOC enforced.
- Demo merchants (Epic 7) will use this component, not the vanilla sdk-js — React is the merchant default in 2026.
