# Story — Session-key call policies (target + selector + spending-limit)

**ID:** story-52-session-key-policies
**Epic:** Epic E4 — Smart Account Layer
**Depends on:** story-50-zerodev-sdk-bootstrap
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** Concierge user
**I want to** session keys issued to my Concierge agent are restricted to specific contract addresses, specific function selectors, and a daily spending limit
**So that** if my session key leaks, the attacker can only do what the agent could do (NOT drain my wallet) — the policy enforces the agent's intended scope at the EVM level, not just the application level

---

## File modification map

- `packages/smart-account/src/policies/index.ts` — NEW — barrel exports
- `packages/smart-account/src/policies/callPolicy.ts` — NEW — `createCallPolicy({ targets, selectors })` returns a ZeroDev `CallPolicy` from `@zerodev/permissions/policies`. Validates inputs: targets must be valid addresses, selectors must be 4-byte hex strings.
- `packages/smart-account/src/policies/spendingLimitPolicy.ts` — NEW — `createSpendingLimitPolicy({ token, dailyLimit, perTxLimit? })` returns a ZeroDev `SpendingLimitPolicy`. Tracks spending against the token's contract. Reset window is 24 hours rolling (Pimlico's default).
- `packages/smart-account/src/policies/timeFramePolicy.ts` — NEW — `createTimeFramePolicy({ validUntil, validAfter? })` returns a `TimeFramePolicy` setting tx validity window (default: validUntil = now + 7 days, validAfter = now).
- `packages/smart-account/src/policies/concierge.ts` — NEW — `createConciergePolicy({ providers: [aaveProvider, dexProvider, ...], dailyLimitUSD, validUntil })` composes multiple policies into one PermissionValidator. Reads each provider's `sessionKey.callPolicy` (from story-32, story-40, etc.) and merges into a single allow-list. Adds the spending-limit policy + time-frame policy.
- `packages/smart-account/src/policies/__tests__/composition.test.ts` — NEW — unit tests: composing 3 providers produces a policy with all 3 targets, no extras; spending limit enforced; time-frame validates within window

---

## Acceptance criteria (BDD)

```
Given createCallPolicy with valid inputs
When called with `{ targets: [aavePool, lifiDiamond], selectors: ['0x617ba037', '0xa9059cbb'] }`
Then it returns a CallPolicy object that the ZeroDev SDK accepts as input to toPermissionValidator

Given createCallPolicy with an invalid address
When called with `{ targets: ['not-an-address'], selectors: [] }`
Then it throws `InvalidPolicy('targets[0] is not a valid address')`

Given createCallPolicy with an invalid selector
When called with `{ targets: [...], selectors: ['0xZZZZ'] }`
Then it throws `InvalidPolicy('selectors[0] is not a 4-byte hex string')`

Given createSpendingLimitPolicy
When called with `{ token: USDC_MAINNET, dailyLimit: 100_000_000n }` (100 USDC daily)
Then it returns a SpendingLimitPolicy where the limit is enforced against USDC contract calls

Given createTimeFramePolicy
When called without explicit validUntil
Then defaults to `now() + 7 * 24 * 60 * 60` (7 days) — validUntil is reasonable, not 0 or block.timestamp + 1

Given createConciergePolicy with 3 providers
When the composed policy is inspected
Then targets === union of each provider's sessionKey.callPolicy.targets (deduped) AND selectors === union of each provider's selectors (preserved with target binding)

Given an attempted call to a contract NOT in the policy
When the session key tries to submit a UserOp targeting a different address
Then the PermissionValidator rejects (UserOp does not execute)

Given a daily-limit-exceeded scenario
When the session key tries to spend 150 USDC in a 24h window with daily limit 100
Then the SpendingLimitPolicy rejects the second tx (UserOp does not execute)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd packages/smart-account
test -f src/policies/callPolicy.ts
test -f src/policies/spendingLimitPolicy.ts
test -f src/policies/timeFramePolicy.ts
test -f src/policies/concierge.ts

cd ../..

pnpm --filter @concierge-mantle/smart-account run build
test $? -eq 0

# Tests pass
pnpm --filter @concierge-mantle/smart-account run test --reporter=verbose 2>&1 | grep -q "composition.test"

# Bad inputs throw typed errors
bun -e "
  import { createCallPolicy } from './packages/smart-account/src/policies/callPolicy.ts';
  try { createCallPolicy({ targets: ['notanaddress'], selectors: [] }); process.exit(1); }
  catch (e) { if (!String(e).includes('InvalidPolicy')) process.exit(1); }
  try { createCallPolicy({ targets: ['0x0000000000000000000000000000000000000000'], selectors: ['0xZZZZ'] }); process.exit(1); }
  catch (e) { if (!String(e).includes('InvalidPolicy')) process.exit(1); }
"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Per-provider call policies live IN the providers**, not here. Story-32 (mantle-dex) exports `sessionKey.callPolicy` with router addresses + swap selectors; story-40 (lifi-bridge) exports its own. This package COMPOSES them. Single source of truth = the provider.
- **Policy validation is strict** — bad address or bad selector input throws `InvalidPolicy` at composition time, NOT silently produces a permissive policy. CLAUDE.md no-silent-failures rule.
- **`createConciergePolicy` is the public face.** Clients (the web app + the agent runtime) call this with their selected providers; they get a single PermissionValidator to plug into the kernel. They don't manually combine policies.
- **SpendingLimitPolicy operates per-token.** A user can have $100/day USDC limit AND $50/day USDe limit — those are separate policy instances. Composer takes an array.
- **TimeFramePolicy default is 7 days.** Forces users to re-authorize weekly. Short enough to limit attack window; long enough that demo flows don't hit re-auth in the middle.
- **The policy mechanism is ZeroDev's permission validator**, not a custom contract. We don't deploy new policy contracts; we just configure existing ones with the right parameters.
- **Selectors come from the provider's ABI imports** (story-21). Don't hardcode 4-byte function selectors in the policy file — derive them from the ABI to stay in sync.
- Cross-ref: `research/concierge/05-zerodev-erc4337.md` § Session-key permission validator API, ADR-010.
