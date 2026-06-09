# Story 88 — Mini App deep-link / startapp parameter handling

**Epic:** Epic 5 — Telegram Mini App
**Estimated:** ~1.5h
**Depends on:** story-79-open-in-telegram-cta, story-87-mini-checkout-flow

## BDD Acceptance Criteria

```
Given a user opens https://t.me/PatronBot/app?startapp=landing
When the Mini App boots
Then `WebApp.initDataUnsafe.start_param` returns "landing"
And the start-param handler routes:
  - first-time user → /onboarding
  - returning user → /

Given a user opens https://t.me/PatronBot/app?startapp=order_<orderId>
When the Mini App boots
Then the handler parses `order_<orderId>`
And routes to /checkout/:orderId
And the order intent fetch begins immediately

Given a user opens https://t.me/PatronBot/app?startapp=auth_<shortToken>
When the Mini App boots
Then the handler parses `auth_<shortToken>`
And calls POST /users/me/telegram-auth/redeem with the token
And on success the Privy session is hydrated (or the user is offered Privy login pre-filled with the same email)
And on success the user is routed to /

Given a user opens the Mini App with an unknown startapp value
When the handler encounters a payload it cannot parse
Then it logs a structured warning
And falls back to the default route (/ or /onboarding based on auth state)

Given the start_param has already been consumed in a session
When the user navigates internally afterward
Then the handler does NOT re-route (only fires once on boot)

Given Vitest runs apps/mini/lib/startparam/__tests__/parseStartParam.test.ts
When the spec executes
Then all 4 payload shapes (landing, order_*, auth_*, unknown) parse correctly
And error cases return a typed result

Given Playwright runs apps/mini/e2e/deep-link.spec.ts
When the spec injects each startapp value into a mock WebApp
Then routing to the correct destination is asserted
```

## File modification map

- `apps/mini/lib/startparam/parseStartParam.ts` — NEW — pure function: `parseStartParam(raw: string | undefined): { kind: 'landing' } | { kind: 'order'; orderId: string } | { kind: 'auth'; token: string } | { kind: 'unknown' }`. Mirrors `buildTelegramDeepLink` shapes from `packages/shared/src/telegram.ts` (story-79).
- `apps/mini/lib/startparam/useStartParamRouter.ts` — NEW — `"use client"` hook; runs once on mount inside `<TgProvider>`; reads `WebApp.initDataUnsafe.start_param`; dispatches navigation; uses a session-scoped flag to prevent re-firing.
- `apps/mini/lib/startparam/redeemAuthToken.ts` — NEW — helper that POSTs to `/users/me/telegram-auth/redeem` and handles the response (success → set Privy session hint; failure → onboarding fallback).
- `apps/mini/lib/startparam/__tests__/parseStartParam.test.ts` — NEW — Vitest covering all payload shapes.
- `apps/mini/app/layout.tsx` — UPDATE — mount `useStartParamRouter()` inside `<TgProvider>` so it fires once on app boot.
- `apps/mini/e2e/deep-link.spec.ts` — NEW — Playwright spec with mocked `window.Telegram.WebApp.initDataUnsafe.start_param`.
- `packages/shared/src/telegram.ts` — UPDATE — if not already exporting, add `parseStartParam` symmetric helper so web + mini share the parsing logic.
- `packages/shared/src/telegram.test.ts` — UPDATE — add tests for the shared parser.

## Shell verification

```bash
pnpm --filter mini build
test $? -eq 0

# Parser + hook present
test -f apps/mini/lib/startparam/parseStartParam.ts
test -f apps/mini/lib/startparam/useStartParamRouter.ts

# Router wired into layout
grep -q "useStartParamRouter" apps/mini/app/layout.tsx

# Vitest (mini)
pnpm --filter mini test --run lib/startparam
test $? -eq 0

# Vitest (shared)
pnpm --filter @patron/shared test
test $? -eq 0

# Playwright
pnpm playwright test apps/mini/e2e/deep-link.spec.ts
test $? -eq 0

# 400-LOC
for f in $(find apps/mini/lib/startparam -type f \( -name "*.ts" -o -name "*.tsx" \)); do
  wc -l "$f" | awk '{ if ($1 > 400) exit 1 }'
done
```

## Notes

- **Canonical deep-link contract**: shapes are owned by `packages/shared/src/telegram.ts` (story-79). This story consumes that contract symmetrically — `parseStartParam` is the inverse of `buildTelegramDeepLink`. Keep them in lockstep.
- `start_param` is delivered via `WebApp.initDataUnsafe.start_param` — read only on boot, not on subsequent navigations.
- `auth_<shortToken>` redemption: Epic 2 backend issues a 5-min one-time-use token (story-79 backend endpoint TODO). If backend isn't ready, log structured warning + fall back to standard Privy onboarding.
- `order_<orderId>` is the most-common case in the demo flow: judge clicks "Open in Telegram" on the web checkout, lands here, sees the same yield math + confirm flow on mobile.
- Unknown payloads MUST NOT crash — log + fall back. Robustness matters because TG occasionally mangles URL params.
- The "consumed flag" prevents the router from re-firing if the user navigates internally and then back to root.
- This story is what makes the web → mini hand-off actually work — closes the loop with story-79.
- File size < 400 LOC enforced.
- Last story in Epic 5; ship after 80-87 are green.
