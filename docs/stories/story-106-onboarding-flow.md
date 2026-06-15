# Story — Onboarding flow (connect → policy → goal → activate)

**ID:** story-106-onboarding-flow
**Epic:** Epic E7 — Web App
**Depends on:** story-100-next-app-scaffold, story-53-session-key-issuance-flow
**Estimate:** ~1.5h
**Status:** PENDING

---

## User story

**As a** new Concierge user
**I want to** a 4-step onboarding flow at /app/onboarding (connect wallet → set initial policy → state your goal in plain English → activate the agent)
**So that** I can get from "landed on concierge.xyz" to "my agent is ticking" in under 5 minutes with explicit consent at every step (no dark patterns)

---

## File modification map

- `apps/web/app/app/onboarding/page.tsx` — NEW — stepper layout that switches between 4 sub-routes
- `apps/web/app/app/onboarding/connect/page.tsx` — NEW — step 1: Privy connect wallet UI; on success → step 2
- `apps/web/app/app/onboarding/policy/page.tsx` — NEW — step 2: policy form (autoApprovalThresholdUSD, hfFloor, chain selector); pre-filled with safe defaults; explicit "I understand" checkbox
- `apps/web/app/app/onboarding/goal/page.tsx` — NEW — step 3: free-form text input for goal ("max stablecoin yield while keeping HF > 1.5"); LLM-assisted refinement (call /api/chat with phase: 'goal-refinement'); shows structured preview
- `apps/web/app/app/onboarding/activate/page.tsx` — NEW — step 4: review summary + sign session-key policy (calls story-53's issueSessionKey via API) + confirm activation
- `apps/web/app/api/onboarding/activate/route.ts` — NEW — POST endpoint: persists agent record, schedules cron in BullMQ, returns agentId
- `apps/web/components/onboarding/Stepper.tsx` — NEW — visual stepper showing progress
- `apps/web/components/onboarding/PolicyForm.tsx` — NEW — form component
- `apps/web/components/onboarding/GoalInput.tsx` — NEW — textarea with LLM-refinement
- `apps/web/components/onboarding/__tests__/Stepper.test.tsx` — NEW — RTL test
- `apps/web/components/onboarding/__tests__/PolicyForm.test.tsx` — NEW — RTL test with form validation

---

## Acceptance criteria (BDD)

```
Given a new user lands on /app/onboarding
When the page loads
Then they see the Stepper at step 1 (connect) AND the Privy connect UI

Given Privy connection succeeds
When the user has a valid session
Then they are redirected to /app/onboarding/policy (step 2)

Given the policy form
When the user submits valid inputs
Then the policy is held in client state (NOT yet persisted — that happens at activation)

Given the policy form
When the user tries to skip the "I understand" checkbox
Then the submit button is disabled (explicit consent required)

Given the goal input
When the user types "max stablecoin yield"
Then a structured preview appears showing the LLM's interpretation (e.g., "Goal: maximize sUSDe yield while HF > 1.5; auto-approve actions < $50")

Given the activation step
When the user signs the session-key policy (Privy embedded wallet signature)
Then the API route persists agent + session key (via story-53), schedules cron (via story-68), and redirects to /app dashboard

Given the activation API
When the request lacks valid Privy session
Then it returns 401 (NOT 200 with empty result)

Given the activation API succeeds
When the response is returned
Then it includes the new agentId AND triggers the first tick within 60s

Given the onboarding flow is interrupted (user closes tab at step 2)
When they return to /app/onboarding
Then the stepper resumes at the step they left (state persisted in localStorage)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd apps/web
test -f app/app/onboarding/page.tsx
test -f app/app/onboarding/connect/page.tsx
test -f app/app/onboarding/policy/page.tsx
test -f app/app/onboarding/goal/page.tsx
test -f app/app/onboarding/activate/page.tsx
test -f app/api/onboarding/activate/route.ts
test -f components/onboarding/Stepper.tsx
test -f components/onboarding/PolicyForm.tsx
test -f components/onboarding/GoalInput.tsx

cd ../..

pnpm --filter @mpilot/web run build
test $? -eq 0
pnpm run typecheck

# Auth gate on activate API
grep -qE "(return.*401|Response.*401)" apps/web/app/api/onboarding/activate/route.ts

# Explicit consent checkbox
grep -qE "(I understand|consent)" apps/web/components/onboarding/PolicyForm.tsx

# Tests pass
pnpm --filter @mpilot/web run test 2>&1 | grep -E "(Stepper|PolicyForm)" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Explicit consent at every step.** No dark patterns. The "I understand" checkbox is mandatory at the policy step; no defaults that auto-approve large actions.
- **Pre-filled with SAFE defaults.** `autoApprovalThresholdUSD: 50` (low; conservative), `hfFloor: 1.5` (well above liquidation), `chain: 'mantle-sepolia'` (default to testnet for new users). Users explicitly opt into riskier settings.
- **LLM-assisted goal refinement** uses /api/chat (story-61) with a `phase: 'goal-refinement'` parameter. The LLM parses the user's natural-language goal into the structured policy fields (or proposes adjustments). This is the friendliest UX — no form anxiety.
- **localStorage state persistence** lets users tab away + return. Use a `onboarding-progress` key with `{ step: number, policy: PartialPolicy, goal: string }`. Clear on completion.
- **Privy embedded wallet signing** for the session-key policy. The user signs the EIP-712 policy hash; the signature is sent to the API route. Reference: story-53 issueSessionKey + Privy SDK.
- **The activation API is the ONE place** that does the side effects (persist agent, schedule cron, issue session key). All other steps are pure client-state. Failure mode is clean (no half-activated agents).
- **First tick within 60s** of activation. The user shouldn't have to wait — they should see the agent start working immediately.
- Cross-ref: `research/concierge/08-ux-component-intent.md` § onboarding flow, story-53, story-68 (cron scheduling).
