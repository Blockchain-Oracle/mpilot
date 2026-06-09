# Story 79 — "Open in Telegram" deep-link CTA (web → Mini App)

**Epic:** Epic 4 — Web App
**Estimated:** ~1h
**Depends on:** story-66-landing-cta-and-footer, story-68-dashboard-shell

## BDD Acceptance Criteria

```
Given a visitor sees the landing CTA section (story-66)
When they click "Open in Telegram"
Then a new tab opens https://t.me/PatronBot/app?startapp=landing
And the link has rel="noopener noreferrer"

Given a user is mid-checkout at /checkout/:orderId
When they see the "Continue in Telegram" alternative CTA (small link beneath confirm)
Then clicking it opens https://t.me/PatronBot/app?startapp=order_<orderId>
And the Mini App boot handler (Epic 5 story-88) parses startapp param and routes to /checkout/:orderId in the mini surface

Given a user has connected wallet on web but wants to continue in TG
When they click the "Open in Telegram" CTA in the dashboard footer
Then https://t.me/PatronBot/app?startapp=auth_<short_session_token> opens
And the token is a short-lived (5 min) one-time-use code stored in Redis (Epic 2)
And the Mini App can exchange the token for the user's session

Given a developer inspects the deep-link helper
When they call `buildTelegramDeepLink({ kind: 'order', orderId: 'abc' })`
Then it returns `https://t.me/PatronBot/app?startapp=order_abc`
And the helper handles all 3 kinds: 'landing', 'order_<id>', 'auth_<token>'

Given Playwright runs apps/web/e2e/open-in-telegram.spec.ts
When the spec runs
Then all 3 CTA placements (landing footer, checkout, dashboard footer) produce the correct URLs
```

## File modification map

- `packages/shared/src/telegram.ts` — NEW — `buildTelegramDeepLink({ kind, ...params }): string`; const `TELEGRAM_BOT_NAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME ?? 'PatronBot'`. Pure function, tested.
- `packages/shared/src/telegram.test.ts` — NEW — Vitest covering all 3 kinds.
- `apps/web/components/shared/OpenInTelegramButton.tsx` — NEW — reusable button using `buildTelegramDeepLink`; ariaLabel + rel + target=_blank baked in.
- `apps/web/components/landing/LandingCTA.tsx` — UPDATE — replace ad-hoc link from story-66 with `<OpenInTelegramButton kind="landing" />`.
- `apps/web/components/checkout/CheckoutModal.tsx` — UPDATE — add small "Continue in Telegram" alternative link using `<OpenInTelegramButton kind="order" orderId={...} variant="text" />`.
- `apps/web/components/dashboard/DashboardFooter.tsx` — NEW (if not present) — minimal dashboard footer with "Open in Telegram" using `kind="auth"` + fetched short-lived token.
- `apps/web/lib/hooks/useTelegramAuthToken.ts` — NEW — TanStack Query hook hitting POST /users/me/telegram-auth-token (Epic 2 endpoint; if not ready, stub with TODO).
- `apps/web/e2e/open-in-telegram.spec.ts` — NEW — Playwright spec asserting all 3 placements.

## Shell verification

```bash
pnpm --filter @patron/shared test
pnpm --filter web build
test $? -eq 0

# Helper exists
test -f packages/shared/src/telegram.ts

# Deep link format canonical
grep -q "t.me/.*?/app?startapp=" packages/shared/src/telegram.ts

# Button used in all 3 places
grep -q "OpenInTelegramButton" apps/web/components/landing/LandingCTA.tsx
grep -q "OpenInTelegramButton" apps/web/components/checkout/CheckoutModal.tsx
grep -q "OpenInTelegramButton" apps/web/components/dashboard/DashboardFooter.tsx

# Playwright
pnpm playwright test apps/web/e2e/open-in-telegram.spec.ts
test $? -eq 0
```

## Notes

- **Canonical deep-link format**: `https://t.me/PatronBot/app?startapp=<param>`. The `<param>` is what the Mini App parses on boot.
- 3 supported `startapp` payloads in v1:
  - `landing` — no user state; opens mini onboarding (story-83)
  - `order_<orderId>` — opens mini checkout flow (Epic 5 story-87/88) with this order intent
  - `auth_<shortToken>` — exchanges token for session (Epic 2 backend issues; Mini App story-88 redeems)
- Per architecture banned-patterns: NO hardcoded URLs scattered around. Centralize in `packages/shared/src/telegram.ts` and reuse via the component.
- `TELEGRAM_BOT_NAME` env var documented in story-06; defaults to `PatronBot` for hackathon.
- The "Continue in Telegram" link in checkout is a small text link (NOT a primary CTA) — the primary checkout flow stays on web. This is a "users who prefer TG can continue there" hand-off.
- Short-lived auth token: backend (Epic 2) issues a one-time-use 5-min token; Mini App exchanges it for a Privy session. If Epic 2 isn't ready, ship the landing + order links and note auth handoff as TODO.
- File size < 400 LOC enforced.
- Bridges Epic 4 (web) and Epic 5 (mini) — closes the cross-surface story.
- Indirectly serves all demo stages by giving the judge an additional surface to discover the product.
