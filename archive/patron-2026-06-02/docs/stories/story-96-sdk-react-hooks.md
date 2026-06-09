# Story 96 — @patron/react usePatronCheckout() + companion hooks (headless API)

**Epic:** Epic 6 — Checkout SDKs
**Estimated:** ~1.5h
**Depends on:** story-95-sdk-react-patron-button

## BDD Acceptance Criteria

```
Given a React consumer inside <PatronProvider>
When they call `const { startCheckout, isOpen, lastResult, error } = usePatronCheckout()`
Then the hook returns a stable API for headless checkout control
And `startCheckout({ amount, currency, externalReference, metadata? })` opens the modal

Given the consumer subscribes via `usePatronEvent('success', handler)`
When the success event fires
Then the handler is invoked with the typed payload
And the subscription is automatically removed on unmount (no memory leak)

Given `usePatronStatus()` is consumed
When the SDK is initialized
Then the hook returns `{ ready: true, version: string }`
And before init it returns `{ ready: false, version: string }`

Given a consumer wants to control the modal imperatively
When they call `const { open, close } = usePatronModal()`
Then `open(orderId)` opens the modal and `close()` closes it
And state (isOpen) is reactive

Given the consumer's component unmounts mid-checkout
When unmount fires
Then any pending listeners are cleaned up
And the modal, if open, remains visible (it's a global, not bound to the unmounted component)
And re-mounting another component can still observe `lastResult`

Given Vitest runs packages/sdk-react/src/__tests__/hooks.test.tsx
When the spec executes
Then usePatronCheckout, usePatronEvent (per event), usePatronStatus, usePatronModal all work end-to-end with mocked sdk-js
```

## File modification map

- `packages/sdk-react/src/hooks/usePatronCheckout.ts` — NEW — `"use client"`; combined hook: state machine (idle | opening | open | success | error | cancel) + `startCheckout`; subscribes to sdk-js events internally.
- `packages/sdk-react/src/hooks/usePatronEvent.ts` — NEW — generic typed hook `usePatronEvent<E extends EventName>(name: E, handler: (payload: EventMap[E]) => void)`; cleans up on unmount or handler change.
- `packages/sdk-react/src/hooks/usePatronStatus.ts` — NEW — returns SDK readiness + version.
- `packages/sdk-react/src/hooks/usePatronModal.ts` — NEW — imperative modal control: `{ isOpen, open, close }`.
- `packages/sdk-react/src/hooks/__tests__/usePatronCheckout.test.tsx` — NEW — Vitest + RTL.
- `packages/sdk-react/src/hooks/__tests__/usePatronEvent.test.tsx` — NEW — Vitest covering cleanup + handler swapping.
- `packages/sdk-react/src/index.ts` — UPDATE — export all hooks.
- `packages/sdk-react/README.md` — UPDATE — add Hooks section with TypeScript examples.

## Shell verification

```bash
pnpm --filter @patron/react build
test $? -eq 0

# All 4 hooks present + exported
test -f packages/sdk-react/src/hooks/usePatronCheckout.ts
test -f packages/sdk-react/src/hooks/usePatronEvent.ts
test -f packages/sdk-react/src/hooks/usePatronStatus.ts
test -f packages/sdk-react/src/hooks/usePatronModal.ts

grep -q "usePatronCheckout" packages/sdk-react/src/index.ts
grep -q "usePatronEvent" packages/sdk-react/src/index.ts
grep -q "usePatronStatus" packages/sdk-react/src/index.ts
grep -q "usePatronModal" packages/sdk-react/src/index.ts

# Vitest
pnpm --filter @patron/react test --run hooks
test $? -eq 0

# 400-LOC
for f in $(find packages/sdk-react/src/hooks -type f \( -name "*.ts" -o -name "*.tsx" \)); do
  wc -l "$f" | awk '{ if ($1 > 400) exit 1 }'
done
```

## Notes

- These hooks are the **ergonomic React API**. They let merchants build custom checkout UIs (not just our button) while still using the hosted modal + event stream.
- `usePatronCheckout` is the "do everything" hook for the 80% case; `usePatronEvent` is the escape hatch for granular control.
- Hook cleanup is critical — without it, listeners leak across re-renders + cause double-fire bugs.
- `usePatronEvent` MUST be typed with an event map so TypeScript narrows the handler payload correctly. Re-export the event types from sdk-js so consumers don't have to install sdk-js directly.
- The modal is a GLOBAL singleton — multiple components can observe state but only one modal exists at a time. Document this in the README.
- `lastResult` persists in memory across unmounts so merchants can do post-checkout work in a different component (e.g., redirect to a thank-you page).
- File size < 400 LOC enforced.
- Completes the React SDK feature set. Documentation in story-97 will showcase these hooks.
