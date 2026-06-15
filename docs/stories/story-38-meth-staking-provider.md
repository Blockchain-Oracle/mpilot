# Story — `@mpilot/meth-staking` action provider

**ID:** story-38-meth-staking-provider
**Epic:** Epic E3 — Action Providers
**Depends on:** story-22-sdk-skeleton, story-21-shared-abi-imports
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** mPilot agent runtime
**I want to** an `@mpilot/meth-staking` package exposes `getBalance`, `getExchangeRate`, `getYieldRate`, `unwrapToWETH` (DEX-routed) actions for the Mantle-bridged mETH token
**So that** the agent can monitor user-held mETH positions, derive staking yield, and unwrap mETH → WETH via DEX swap (Mantle has NO native unstaking — the L1 stake pool is Ethereum-only)

---

## File modification map

- `packages/providers/meth-staking/package.json` — NEW — peer deps + workspace deps + dependency on `@mpilot/mantle-dex` (for the unwrap-via-swap action)
- `packages/providers/meth-staking/src/index.ts` — NEW — barrel exports
- `packages/providers/meth-staking/src/provider.ts` — NEW — `createMethStakingProvider(opts, { dexProvider })` returns ProviderInterface. Requires dexProvider injection (fail-fast at construction if missing — same pattern as Ethena's Aave dependency).
- `packages/providers/meth-staking/src/actions/getBalance.ts` — NEW — `getBalance({ user })` returns `{ raw: bigint; ethValue: bigint }` (rawMETH * exchangeRate / 1e18)
- `packages/providers/meth-staking/src/actions/getExchangeRate.ts` — NEW — `getExchangeRate()` returns the current mETH↔ETH rate from the Mantle-side oracle (Redstone or Chainlink feed; reference: research/concierge/03-providers/meth-staking.md). NO L1 calls (L1 staking pool is `0xe3cBd06D7dadB3F4e6557bAb7EdD924CD1489E8f` Ethereum-only — Mantle reads via cross-chain price feed).
- `packages/providers/meth-staking/src/actions/getYieldRate.ts` — NEW — annualized APY from exchange rate rate-of-change over 7-day rolling window. mETH yield comes from L1 ETH validator rewards relayed via the bridge oracle.
- `packages/providers/meth-staking/src/actions/unwrapToWETH.ts` — NEW — `unwrap({ amountMeth, slippageBps })` does NOT call any native unstake (impossible on L2). Instead routes via `dexProvider.swap({ tokenIn: METH, tokenOut: WETH, amountIn: amountMeth, slippageBps })`. Returns the dex provider's tx receipt + a wrapping attestation that records both the dex action and the conceptual unstake intent.
- `packages/providers/meth-staking/src/selectors.ts` — NEW — `getBalance`, `getExchangeRate`, `getAnnualizedYieldBps`
- `packages/providers/meth-staking/src/attestation.ts` — NEW — schemas: `concierge.meth.unwrap-via-dex.v1`, `concierge.meth.read.v1`

---

## Acceptance criteria (BDD)

```
Given the package builds
When `pnpm --filter @mpilot/meth-staking run build` runs
Then exit code is 0

Given the provider has 4 actions
When createMethStakingProvider({rpcUrl}, {dexProvider}) returns
Then Object.keys(provider.actions).sort() === ['getBalance','getExchangeRate','getUnwrapToWETH','getYieldRate']
(Note: 'getUnwrapToWETH' is intentionally a getter-prefixed action name because it's actually a quote+execute combination; the explicit prefix prevents the LLM from assuming it triggers native unstake)

Given the provider is constructed without dexProvider
When createMethStakingProvider({rpcUrl}) runs without the dex provider injection
Then it throws `MissingDependency('@mpilot/mantle-dex')` at construction

Given mETH address resolution
When provider runs on Mantle Mainnet
Then mETH address === '0xcDA86A272531e8640cD7F1a92c01839911B90bb0' (verified 2026-06-04)

Given getExchangeRate
When called against Mantle Mainnet fork
Then returns rate >= 1e18 (mETH > ETH; staking accrues against base) AND rate <= 2e18 (sanity bound)

Given getBalance for a known holder
When called
Then returns { raw, ethValue: raw * rate / 1e18 }

Given getYieldRate with 7-day delta
When called against historical rate data
Then returns approximately 300-500 bps (3-5% APY matching real ETH staking yield)

Given unwrapToWETH action
When called with 1e18 mETH (1 mETH)
Then it calls `dexProvider.swap({ tokenIn: mETH, tokenOut: WETH, amountIn: 1e18, slippageBps })`, returns the dex tx hash + attestation with schema `concierge.meth.unwrap-via-dex.v1`, and the attestation payload includes both `dexTxHash` and `expectedEthOut`

Given the agent attempts to call a non-existent `stake` or `nativeUnstake` action
When the agent tries
Then no such action exists in `Object.keys(provider.actions)` — the LLM cannot generate a stake tool call because the tool is not registered

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd packages/providers/meth-staking
test -f package.json
test -f src/provider.ts
for action in getBalance getExchangeRate getYieldRate unwrapToWETH; do
  test -f src/actions/$action.ts
done

cd ../../..

pnpm --filter @mpilot/meth-staking run build
test $? -eq 0
pnpm run typecheck

# Mainnet address resolution
grep -q "0xcDA86A272531e8640cD7F1a92c01839911B90bb0" packages/providers/meth-staking/src/provider.ts

# DexProvider dependency is required (fail-fast)
bun -e "
  import { createMethStakingProvider } from './packages/providers/meth-staking/src/index.ts';
  try {
    const p = createMethStakingProvider({ rpcUrl: 'https://rpc.mantle.xyz' });
    console.error('Should have thrown MissingDependency');
    process.exit(1);
  } catch (e) {
    if (!String(e).includes('MissingDependency')) process.exit(1);
  }
"

# No 'stake' or 'nativeUnstake' actions exposed (L1-only operations)
bun -e "
  import { createMethStakingProvider } from './packages/providers/meth-staking/src/index.ts';
  import { createMantleDexProvider } from './packages/providers/mantle-dex/src/index.ts';
  const dex = createMantleDexProvider({ rpcUrl: 'https://rpc.mantle.xyz' });
  const meth = createMethStakingProvider({ rpcUrl: 'https://rpc.mantle.xyz' }, { dexProvider: dex });
  const a = Object.keys(meth.actions);
  if (a.includes('stake') || a.includes('nativeUnstake') || a.includes('unstake')) {
    console.error('L1-only actions exposed (forbidden)');
    process.exit(1);
  }
"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Mantle mETH is a bridge image of the L1 mETH token.** Native staking happens on Ethereum L1 at `0xe3cBd06D7dadB3F4e6557bAb7EdD924CD1489E8f` (per `research/concierge/03-providers/meth-staking.md`). On Mantle, mETH is just an ERC-20 with no `stake()` or `unstake()` functions. **DO NOT add stake actions to this provider.** Users who want to acquire mETH bridge it from L1 or buy it on Mantle DEXes.
- **The unwrap-via-DEX pattern** is the correct semantic for "I want to convert my mETH back to WETH on Mantle." It's not really unstaking — it's a DEX swap. The action name `unwrapToWETH` and the attestation schema `concierge.meth.unwrap-via-dex.v1` make this explicit. NO action named `nativeUnstake` should exist.
- **`MissingDependency` fail-fast** at construction time (same pattern as Ethena's Aave dependency in story-34). If the dex provider is missing, the unwrap action would silently break. Fail loudly at boot, not at first tick.
- **Exchange rate source on Mantle** is a cross-chain feed (Redstone or Chainlink) per `research/concierge/03-providers/meth-staking.md` § Verified facts. NO L1 RPC calls — Mantle agent runs ONLY on Mantle.
- **Yield derivation** mirrors the Ondo USDY approach: rate-of-change over 7-day rolling window. APY math same.
- **Attestation includes both `dexTxHash` AND `expectedEthOut`** so future auditors can verify the unwrap was actually a DEX swap routed at a reasonable price, not a custom contract that drained the user's mETH.
- **WETH on Mantle** is the wrapped MNT token (`WMNT`) per the architecture: address from `@mpilot/shared`. mETH → WETH on Mantle routes via the dex provider; user can then bridge WETH back to L1 via `@mpilot/lifi-bridge` if they want to land in actual ETH on Ethereum.
- Cross-ref: `research/concierge/03-providers/meth-staking.md` § Mantle is L2-only / no native unstake.
