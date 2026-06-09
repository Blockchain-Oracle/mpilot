# Story — `@concierge/ondo-usdy` action provider (read-only v1)

**ID:** story-36-ondo-usdy-provider
**Epic:** Epic E3 — Action Providers
**Depends on:** story-22-sdk-skeleton, story-21-shared-abi-imports
**Estimate:** ~45min
**Status:** PENDING

---

## User story

**As a** Concierge agent runtime
**I want to** an `@concierge/ondo-usdy` package exposes read-only actions (`getBalance`, `getRateAccrual`, `getYieldRate`) against the Ondo USDY token on Mantle, plus a `getEligibilityStatus` selector for the KYC-gating mechanic
**So that** the agent can monitor user-held USDY positions + accrued yield without trying to mint/redeem (which requires KYC + happens off-chain via Ondo's portal, NOT on-chain)

---

## File modification map

- `packages/providers/ondo-usdy/package.json` — NEW — peer deps + workspace deps
- `packages/providers/ondo-usdy/src/index.ts` — NEW — barrel exports
- `packages/providers/ondo-usdy/src/provider.ts` — NEW — `createOndoUsdyProvider(opts)` returns ProviderInterface with read-only actions. NO `mint` or `redeem` actions (those require off-chain KYC + cannot be agent-driven on-chain).
- `packages/providers/ondo-usdy/src/actions/getBalance.ts` — NEW — `getBalance({ user })` returns `{ raw: bigint; usdValue: bigint; yieldAccrued: bigint }` reading from USDY token contract.
- `packages/providers/ondo-usdy/src/actions/getRateAccrual.ts` — NEW — `getRateAccrual({ user })` returns `{ rateMantissa: bigint; multiplier: bigint; lastUpdateBlock: bigint }` from USDY's rebase oracle. USDY's value-per-token grows via a multiplier; the contract exposes `getCurrentMultiplier()`.
- `packages/providers/ondo-usdy/src/actions/getYieldRate.ts` — NEW — `getYieldRate()` returns annualized APY in bps. Derived from `getCurrentMultiplier()` rate-of-change over last N blocks (rolling 7-day window for stability).
- `packages/providers/ondo-usdy/src/selectors.ts` — NEW — `isUserEligible(user)`: returns `boolean` — calls USDY's `isAllowed(user)` (KYC allowlist check). Used by the agent to surface clear "to add USDY, complete Ondo KYC at https://app.ondo.finance/onboarding" message to the user.
- `packages/providers/ondo-usdy/src/attestation.ts` — NEW — schemas: `concierge.ondo.read.v1` (single schema for read-only attestations; the agent attests "checked USDY position" actions even though they don't mutate state, for completeness of the on-chain trail).

---

## Acceptance criteria (BDD)

```
Given the package builds
When `pnpm --filter @concierge/ondo-usdy run build` runs
Then exit code is 0

Given the provider has read-only actions only (per v1 scope)
When createOndoUsdyProvider returns
Then Object.keys(provider.actions).sort() === ['getBalance','getRateAccrual','getYieldRate']
AND provider.actions DOES NOT include 'mint' or 'redeem' (KYC-gated; cannot be agent-driven)

Given the USDY contract addresses
When provider resolves on Mantle Mainnet
Then USDY === '0x5bE26527e817998A7206475496fDE1E68957c5A6' (per CLAUDE.md verified 2026-06-04)

Given getBalance for a known holder
When called against Mantle Mainnet
Then returns `{ raw: nonZeroBigint, usdValue: raw * multiplier / 1e18, yieldAccrued: usdValue - raw }`

Given getRateAccrual
When called
Then returns multiplier > 1e18 (USDY accrues; multiplier grows monotonically over time)

Given getYieldRate
When called with sufficient on-chain history (>= 7 day rolling window)
Then returns ~500 bps (5% APY, matching real Ondo USDY's tokenized-Treasury yield as of 2026)

Given isUserEligible for a non-KYC'd address
When called
Then returns false

Given the provider attempts to mint via the agent
When the agent tries to call any mutation action
Then `Object.keys(provider.actions)` does NOT include any mutation; the SDK's tool registry only registers read-only tools for this provider; LLM cannot be prompted to "mint USDY" because no such tool exists

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd packages/providers/ondo-usdy
test -f package.json
test -f src/provider.ts
for action in getBalance getRateAccrual getYieldRate; do
  test -f src/actions/$action.ts
done
test -f src/selectors.ts

cd ../../..

pnpm --filter @concierge/ondo-usdy run build
test $? -eq 0
pnpm run typecheck

# NO mint or redeem actions exposed
bun -e "
  import { createOndoUsdyProvider } from './packages/providers/ondo-usdy/src/index.ts';
  const p = createOndoUsdyProvider({ rpcUrl: 'https://rpc.mantle.xyz' });
  const a = Object.keys(p.actions);
  if (a.includes('mint') || a.includes('redeem')) {
    console.error('Mutation actions exposed (forbidden for v1 — KYC-gated)');
    process.exit(1);
  }
  if (a.length !== 3) process.exit(1);
"

# Mainnet address present
grep -q "0x5bE26527e817998A7206475496fDE1E68957c5A6" packages/providers/ondo-usdy/src/provider.ts

# LOC budget
bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Read-only v1 is by design**, not a TODO. Per `research/concierge/03-providers/ondo-usdy.md`: mint/redeem on USDY requires (a) KYC allowlist (`isAllowed(user)`), (b) USD bank-rail integration (not on-chain), (c) Ondo portal flow (https://app.ondo.finance/onboarding). None of these can be agent-driven. The agent OBSERVES held positions; users acquire USDY via the Ondo portal directly.
- **The KYC mechanic is a USER ONBOARDING ISSUE, not an agent issue.** When the agent's plan() phase detects "user wants exposure to T-bill yield" and USDY is the target, it should surface to the user (via the proposal card UI from story-108): "USDY requires KYC at https://app.ondo.finance. Once you have USDY, the agent will manage your position." Document this flow in the action descriptions so the LLM produces the right message.
- **`getCurrentMultiplier()` is USDY's rebase mechanic.** USDY doesn't elastic-rebase balances; it stores a `multiplier` (RAY math, 1e18 base) that grows over time. Effective balance = `rawBalance * multiplier / 1e18`. APY derivation: `(multiplier_now / multiplier_7d_ago) ^ (52/1) - 1` for weekly compounding to annual.
- **`isAllowed` is the on-chain allowlist** — Ondo's KYC service maintains it. Read-only check; agent CANNOT modify.
- **Selectors are exposed via `provider.selectors`** (per the SDK ProviderInterface from story-22), NOT as Vercel AI SDK tools. The agent calls selectors during plan/simulate; tools are for execute-phase mutations only. `isUserEligible` is a selector, not a tool.
- **Attestation for read-only**: even though no state changes, the agent attests "I observed user X's USDY position at block Y" so the on-chain audit trail is complete. Schema: `concierge.ondo.read.v1`. Payload: { user, balance, multiplier, blockNumber }. Lightweight, low gas.
- **NO L1 mint/redeem RFQ integration.** Per `research/concierge/03-providers/ondo-usdy.md`: Ondo's RFQ API is for institutional flows; retail KYC happens via portal. Concierge never calls Ondo's APIs.
- **v1.1 path forward:** if Ondo ships an on-chain permissionless mint flow (unlikely; USDY is regulated), this provider gets `mint` + `redeem` actions. For now, document as v1.1 in `research/concierge/03-providers/ondo-usdy.md` § Open questions.
- Cross-ref: `research/concierge/03-providers/ondo-usdy.md` (every claim + KYC mechanic + multiplier math).
