# Story 83 — Mini App first-time onboarding flow (/onboarding)

**Epic:** Epic 5 — Telegram Mini App
**Estimated:** ~1.5h
**Depends on:** story-82-privy-embedded-wallet

## BDD Acceptance Criteria

```
Given a first-time TG user opens the Mini App
When apps/mini/app/onboarding/page.tsx renders
Then a 3-step onboarding visual appears:
  1. "Welcome to Patron" intro + 1-line value prop (verbatim PRD tagline)
  2. "Log in with Telegram or email" — Privy login trigger
  3. "Your agent is ready" — success state with continue CTA

Given the user is on step 2
When they tap the Telegram login button
Then Privy's `login()` is called with the Telegram provider
And on success they advance to step 3
And the embedded EVM wallet address is shown (truncated 0x1234…5678) with a copy-to-clipboard icon

Given the user is on step 3
When they tap the TG MainButton "Open Dashboard"
Then router pushes to `/` (mini dashboard, story-84)
And `WebApp.HapticFeedback.notificationOccurred('success')` fires

Given an already-authenticated user visits /onboarding
When the page hydrates
Then they are redirected to `/` (skip onboarding)
Unless `?force=1` is in the query (manual re-onboarding for tests)

Given a user logs in for the first time
When the embedded wallet is created
Then a POST /users (Epic 2 story-35) request fires with their EVM address + Privy DID
And on success the user object is cached in TanStack Query

Given a user has the OS-level reduced-motion preference enabled
When the onboarding step transitions render
Then transitions are instant (no slide/fade animation)

Given Playwright runs apps/mini/e2e/onboarding.spec.ts
When the spec executes with a stubbed Privy login
Then the 3 steps render in order and final state navigates to /
```

## File modification map

- `apps/mini/app/onboarding/page.tsx` — NEW — `"use client"`; orchestrates the 3-step flow; uses `useMainButton` (story-81) to drive the bottom CTA per step.
- `apps/mini/components/onboarding/StepIntro.tsx` — NEW — step 1: Fraunces display headline + sans body + Patron logo.
- `apps/mini/components/onboarding/StepLogin.tsx` — NEW — step 2: large "Continue with Telegram" button + small "Continue with email" link; calls Privy `login()`.
- `apps/mini/components/onboarding/StepReady.tsx` — NEW — step 3: success checkmark + wallet address pill + "your agent is ready" copy + next-action hint.
- `apps/mini/components/onboarding/StepIndicator.tsx` — NEW — 3-dot progress indicator at top of viewport.
- `apps/mini/lib/hooks/useCreateUser.ts` — NEW — TanStack Query mutation; calls `POST /users` with `{ address, privyDid }`; deduplicates with Privy DID as key.
- `apps/mini/lib/hooks/useIsFirstTimeUser.ts` — NEW — derived selector: `authenticated && !userRecord` from TanStack cache.
- `apps/mini/e2e/onboarding.spec.ts` — NEW — Playwright spec with mocked Privy + TG WebApp.

## Shell verification

```bash
pnpm --filter mini build
test $? -eq 0

# Route exists
test -f apps/mini/app/onboarding/page.tsx

# Step components present
test -f apps/mini/components/onboarding/StepIntro.tsx
test -f apps/mini/components/onboarding/StepLogin.tsx
test -f apps/mini/components/onboarding/StepReady.tsx

# MainButton used
grep -q "useMainButton" apps/mini/app/onboarding/page.tsx

# Calls POST /users
grep -q "useCreateUser" apps/mini/app/onboarding/page.tsx || grep -q "useCreateUser" apps/mini/components/onboarding/StepLogin.tsx

# Playwright
pnpm playwright test apps/mini/e2e/onboarding.spec.ts
test $? -eq 0

# 400-LOC
for f in $(find apps/mini/components/onboarding apps/mini/app/onboarding -type f \( -name "*.ts" -o -name "*.tsx" \)); do
  wc -l "$f" | awk '{ if ($1 > 400) exit 1 }'
done
```

## Notes

- **Anchor: Openfort + Privy onboarding screens** — minimal, one-decision-per-step, instant feedback. Don't overload the screen.
- The 3-step flow keeps cognitive load low for non-crypto users (the TG audience). Each step has one decision.
- Use TG `MainButton` for the primary CTA per step — TG users tap the bottom button instinctively (per ux-spec § Telegram Mini App specifics).
- Verbatim PRD tagline in step 1 (one of the three options in PRD § Tagline candidates). Lock in your choice in a brief follow-up if Abu has a preference.
- Step 2 button order: Telegram first (one-tap social), email second (fallback). Privy handles both.
- POST /users is idempotent in Epic 2 (story-35) — safe to call on every login.
- Reduced-motion handling is part of ux-spec accessibility minimums.
- The "your agent is ready" copy in step 3 frames the product as "your agent" (ownership) — matches PRD framing.
- File size < 400 LOC enforced.
- Critical first impression for the Best UI/UX prize — polish here pays off in judging.
