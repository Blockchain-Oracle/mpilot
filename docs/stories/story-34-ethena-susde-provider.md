# Story — `@mpilot/ethena-susde` action provider

**ID:** story-34-ethena-susde-provider
**Epic:** Epic E3 — Action Providers
**Depends on:** story-22-sdk-skeleton, story-21-shared-abi-imports
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** Concierge agent runtime
**I want to** an `@mpilot/ethena-susde` package exposes `getYieldRate`, `getCarryVsAave`, `wrapToSusde`, `unwrapToUSDe` actions (no on-chain native staking — that's Ethereum L1) plus reads for the Mantle-side bridged sUSDe
**So that** the agent can monitor the sUSDe basis trade carry vs Aave's USDC borrow rate (the wedge's spread-floor mechanic) and bridge USDe ↔ sUSDe on Mantle when policy allows

---

## File modification map

- `packages/providers/ethena-susde/package.json` — NEW — peer deps + workspace deps
- `packages/providers/ethena-susde/src/index.ts` — NEW — barrel exports
- `packages/providers/ethena-susde/src/provider.ts` — NEW — `createEthenaSusdeProvider(opts)` returns ProviderInterface with 4 actions
- `packages/providers/ethena-susde/src/actions/wrapToSusde.ts` — NEW — `wrap({ amountUSDe })` calls the Mantle-side wrapper (`USDe.approve(sUSDe, amount)` → `sUSDe.deposit(amount, recipient)`). This is the LayerZero V2 OFT image's `deposit` function, NOT the L1 ERC-4626 vault. Returns receipt + attestation payload.
- `packages/providers/ethena-susde/src/actions/unwrapToUSDe.ts` — NEW — `unwrap({ amountSusde })`. Calls `sUSDe.redeem(shares, receiver, owner)`. On Mantle there is NO cooldown (cooldown is L1-only); document this prominently.
- `packages/providers/ethena-susde/src/actions/getYieldRate.ts` — NEW — pure read: queries the sUSDe → USDe oracle rate via the Mantle-side LayerZero OFT (which exposes a `convertToAssets(shares)` view), derives instantaneous yield by comparing `convertToAssets(1e18)` against a stored baseline + block timestamp.
- `packages/providers/ethena-susde/src/actions/getCarryVsAave.ts` — NEW — composes `getYieldRate` from this provider with `quoteBorrowAPR(USDC)` from `@mpilot/aave-v3-mantle` (story-30 selectors). Returns `{ susdeYieldBps, usdcBorrowBps, carryBps, spreadFloorPassing }`. **Used by the agent's `plan()` phase** to refuse new borrow positions when carry inverts (per `research/concierge/03-providers/ethena-susde.md` § Funding-rate inversion).
- `packages/providers/ethena-susde/src/selectors.ts` — NEW — `getRate()`, `getBalanceUSDe(user)`, `getBalanceSusde(user)`, `convertToShares(amount)`, `convertToAssets(shares)`.
- `packages/providers/ethena-susde/src/attestation.ts` — NEW — schemas: `concierge.ethena.wrap.v1`, `concierge.ethena.unwrap.v1`.

---

## Acceptance criteria (BDD)

```
Given the package builds
When `pnpm --filter @mpilot/ethena-susde run build` runs
Then exit code is 0

Given the provider has 4 actions
When createEthenaSusdeProvider returns
Then Object.keys(provider.actions).sort() === ['getCarryVsAave','getYieldRate','unwrapToUSDe','wrapToSusde']

Given wrap action on Sepolia mocks
When called with 100e18 USDe
Then USDe balance decreases by 100e18, sUSDe balance increases by `convertToShares(100e18)`, attestation schema is `concierge.ethena.wrap.v1`, txHash valid

Given unwrap action on Sepolia mocks
When called with 50e18 sUSDe shares
Then sUSDe balance decreases by 50e18, USDe balance increases by `convertToAssets(50e18)`, attestation schema is `concierge.ethena.unwrap.v1`, no cooldown enforced (Mantle is the OFT image, NOT the L1 ERC-4626 vault)

Given getYieldRate
When called after the Sepolia oracle is seeded with sUSDe price of $1.232 (matching Mainnet snapshot)
Then it returns the annualized yield rate (basis points). Implementation derives from `convertToAssets(1e18)` baseline (initial deploy) and current value; on Sepolia mocks this is just whatever the MockAaveOracle's sUSDe price says.

Given getCarryVsAave
When sUSDe yield = 380 bps + USDC borrow APR = 351 bps
Then returns `{ susdeYieldBps: 380, usdcBorrowBps: 351, carryBps: 29, spreadFloorPassing: true }` (with default spreadFloor=0 bps)

Given getCarryVsAave when carry inverts (yield < borrow)
When sUSDe = 200 bps + USDC borrow = 400 bps
Then returns `{ carryBps: -200, spreadFloorPassing: false }`. Agent runtime treats `spreadFloorPassing: false` as "refuse new borrow position".

Given a user attempts unwrap on Mainnet
When the action runs on actual Mantle Mainnet (not the L1 vault)
Then it succeeds without cooldown (the cooldown is L1-only; Mantle OFT bridges back via instant redemption against the bridged supply)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file is ≤ 400 LOC
```

---

## Shell verification

```bash
cd packages/providers/ethena-susde
test -f package.json
test -f src/provider.ts
for action in wrapToSusde unwrapToUSDe getYieldRate getCarryVsAave; do
  test -f src/actions/$action.ts
done
test -f src/selectors.ts
test -f src/attestation.ts

cd ../../..

pnpm --filter @mpilot/ethena-susde run build
test $? -eq 0
pnpm run typecheck
test $? -eq 0

bun -e "
  import { createEthenaSusdeProvider } from './packages/providers/ethena-susde/src/index.ts';
  const p = createEthenaSusdeProvider({ rpcUrl: 'https://rpc.mantle.xyz' });
  const a = Object.keys(p.actions).sort();
  const want = ['getCarryVsAave','getYieldRate','unwrapToUSDe','wrapToSusde'];
  if (JSON.stringify(a) !== JSON.stringify(want)) process.exit(1);
"

# Attestation schemas
grep -q "concierge.ethena.wrap.v1" packages/providers/ethena-susde/src/attestation.ts
grep -q "concierge.ethena.unwrap.v1" packages/providers/ethena-susde/src/attestation.ts

# No-cooldown documented prominently
grep -qE "(NO cooldown|no cooldown|cooldown is L1-only)" packages/providers/ethena-susde/src/actions/unwrapToUSDe.ts

# LOC budget
bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Mantle sUSDe is a LayerZero V2 OFT image, NOT the L1 ERC-4626 vault.** Per `research/concierge/03-providers/ethena-susde.md` (re-verified 2026-06-04). Concrete consequence: `cooldown()` does NOT exist on the Mantle contract; `redeem()` is instant against bridged supply. Document this in `unwrapToUSDe.ts` NatSpec — the most common bug agents will introduce is "wait, doesn't sUSDe have a cooldown?"
- **`getCarryVsAave` is the spread-floor primitive.** The agent's `plan()` phase calls it every tick. If `spreadFloorPassing: false`, refuse new borrow positions (existing positions mature naturally). Reference: `research/concierge/02-architecture.md` ADR-002 + 03-providers/ethena-susde.md § Funding-rate inversion.
- **Yield rate derivation on Mantle:** the OFT exposes `convertToAssets(shares)` which encodes the current sUSDe:USDe rate. Compare to a baseline snapshot (stored at provider init) to derive annualized yield: `((current / baseline) ^ (year_seconds / elapsed_seconds) - 1) * 10000`. For demo simplicity v1 uses MockAaveOracle's sUSDe price drift on Sepolia; v2 derives from real L1-relayed `convertToAssets` data.
- **`spreadFloor` is configurable per agent policy** (default 0 bps). User can set to 50 bps (refuse if carry < 0.5%) for more conservative behavior. Read from policy in `getCarryVsAave`.
- **Wrap action approves THEN deposits** — two txs in succession (separate UserOps when batched via ZeroDev). For non-EIP-2612 USDe paths, this is the canonical pattern. If USDe supports `permit()` (ERC-20 Permit), the action SHOULD use it to collapse approve+deposit into a single tx via permit-then-deposit pattern. Detect support by trying `IERC20Permit(USDe).DOMAIN_SEPARATOR()` — reverts → not supported, fall back to two txs.
- **Composes with Aave provider** for `getCarryVsAave` — imports `quoteBorrowAPR` from `@mpilot/aave-v3-mantle`. Listed as a peer dep in `package.json`.
- **No direct Ethena API integration.** The L1 mint/redeem RFQ flow (`https://public.api.ethena.fi/rfq`) is L1-only; Mantle agents never call it. Documented in `research/concierge/03-providers/ethena-susde.md` § API (off-chain).
- Cross-ref: `research/concierge/03-providers/ethena-susde.md` § Verified facts (Mantle sUSDe at `0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2`, USDe at `0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34`).
