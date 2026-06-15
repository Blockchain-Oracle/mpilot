# Story — Policy editor (`/app/settings`)

**ID:** story-111-policy-editor
**Epic:** Epic E7 — Web App
**Depends on:** story-107-app-dashboard-shell, story-54-session-key-revocation-flow
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** Concierge user
**I want to** the `/app/settings` route lets me edit my policy (autoApprovalThresholdUSD, hfFloor, allowed providers, agent cadence) with explicit "changing this revokes session key and requires re-signing" warning for material changes
**So that** I can tune my agent's autonomy + risk profile without redoing onboarding, but ALSO can't accidentally widen permissions without re-signing the session-key policy

---

## File modification map

- `apps/web/app/app/settings/page.tsx` — NEW — settings page with PolicyEditor + DangerZone (pause / revoke-all-session-keys / delete-agent)
- `apps/web/components/dashboard/PolicyEditor.tsx` — NEW — form bound to current policy state
- `apps/web/components/dashboard/MaterialChangeWarning.tsx` — NEW — banner that appears when a change would widen permissions
- `apps/web/components/dashboard/DangerZone.tsx` — NEW — pause + revoke + delete actions; each requires confirmation
- `apps/web/app/api/policy/route.ts` — NEW — PATCH handler. Classifies the change as material or non-material; material → also revokes the current session key and prompts user to re-sign a new one with the broader scope
- `apps/web/lib/policy/diff.ts` — NEW — `classifyPolicyChange(old, new): { isMaterial: boolean; reason: string }` — material if: autoApprovalThresholdUSD increases, hfFloor decreases, new provider added, cadence shortens
- `apps/web/components/dashboard/__tests__/PolicyEditor.test.tsx` — NEW — RTL test
- `apps/web/lib/policy/__tests__/diff.test.ts` — NEW — unit test for material classification

---

## Acceptance criteria (BDD)

```
Given the current policy { autoApprovalThresholdUSD: 50, hfFloor: 1.5, providers: ['aave'] }
When the user changes autoApprovalThresholdUSD from 50 → 30 (narrows; safer)
Then classifyPolicyChange returns { isMaterial: false } AND PATCH succeeds without re-signing

Given the same change but autoApprovalThresholdUSD 50 → 100 (widens; more autonomy)
When the user submits
Then classifyPolicyChange returns { isMaterial: true } AND the MaterialChangeWarning appears AND the PATCH endpoint revokes the current session key AND prompts re-signing

Given the user wants to add a new provider (e.g., 'mantle-dex')
When the form is submitted
Then it's classified material; session key revoked; new policy includes mantle-dex; re-sign prompt appears

Given the user lowers cadence from 60s → 15s (more frequent agent runs)
When submitted
Then classified material (more autonomy → more frequent action surface)

Given the user clicks "Pause agent"
When confirmed via the confirmation modal
Then PATCH /api/policy { paused: true } is called; the agent's BullMQ schedule is removed (story-68); tick stream shows "paused" badge

Given the user clicks "Revoke all session keys"
When confirmed
Then for each active session key in the DB, on-chain revoke tx is submitted (story-54); the DB rows are marked revoked; the UI reflects "no active session keys; agent paused"

Given a policy field violates safety bounds (e.g., hfFloor < 1.0)
When the form is submitted
Then validation fails client-side with "hfFloor must be ≥ 1.0" AND the API would also reject (defense in depth)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC

Given the PATCH succeeds
When the response returns
Then the policy in DB matches the submitted policy AND if material, the session key is revoked
```

---

## Shell verification

```bash
cd apps/web
test -f app/app/settings/page.tsx
test -f components/dashboard/PolicyEditor.tsx
test -f components/dashboard/MaterialChangeWarning.tsx
test -f components/dashboard/DangerZone.tsx
test -f app/api/policy/route.ts
test -f lib/policy/diff.ts

cd ../..

pnpm --filter @mpilot/web run build
test $? -eq 0

# Material change classification logic present
grep -qE "(isMaterial|material.*change)" apps/web/lib/policy/diff.ts

# Tests pass
pnpm --filter @mpilot/web run test 2>&1 | grep -E "(PolicyEditor|diff)" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Material change classification is THE security primitive here.** Per `research/concierge/04-agent-runtime.md` § 6 risks: narrowing permissions = safe (no re-sign); widening = requires re-sign (a stolen session key can't be quietly upgraded to broader scope). The wedge's trust story falls apart if widening doesn't trigger re-sign.
- **Pause agent doesn't revoke session keys** — it just removes the BullMQ schedule. Resume re-adds the schedule with the existing keys. This is the lightweight pause/play primitive.
- **Revoke all session keys IS the nuclear option.** Agent stops working until user re-onboards (sign a new session key). Use this if you suspect your session key was compromised.
- **Safety bounds enforced both client AND server.** Defense in depth. Client validation provides instant feedback; server validation prevents API manipulation.
- **The "material change" decision is a JUDGMENT CALL** for some fields (e.g., changing chain from sepolia → mainnet is debatable — is it widening or just a switch?). Document the decision in the code comments per `research/concierge/04-agent-runtime.md` § 6 mitigations. Conservative default: classify as material.
- **DangerZone has its own visual treatment** — typically red borders, "this is irreversible" warnings. Per shadcn/ui patterns.
- Cross-ref: `research/concierge/04-agent-runtime.md` § 6, story-54 (revocation flow callsite).
