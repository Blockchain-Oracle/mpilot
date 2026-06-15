# Story — `@mpilot/mantle-dex` action provider (Merchant Moe + Agni + FusionX + WOOFi aggregation)

**ID:** story-32-mantle-dex-provider
**Epic:** Epic E3 — Action Providers
**Depends on:** story-22-sdk-skeleton, story-21-shared-abi-imports
**Estimate:** ~1.5h
**Status:** PENDING

---

## User story

**As a** mPilot agent runtime
**I want to** an `@mpilot/mantle-dex` package exposes `swap` + `quote` actions that aggregate routes across Merchant Moe (Trader Joe V2.2 LB), Agni V3, FusionX V3, WOOFi V2, and Li.Fi (intra-Mantle path) and pick best execution
**So that** every swap the agent executes goes through the best available price on Mantle without per-DEX branching in the runtime

---

## File modification map

- `packages/providers/mantle-dex/package.json` — NEW — peer deps on `viem`, `zod`, `ai`, `@mpilot/shared`, `@mpilot/sdk`
- `packages/providers/mantle-dex/src/index.ts` — NEW — barrel exports
- `packages/providers/mantle-dex/src/provider.ts` — NEW — `createMantleDexProvider(opts)` returns ProviderInterface. Actions: `swap`, `quote`.
- `packages/providers/mantle-dex/src/actions/quote.ts` — NEW — `quote({ tokenIn, tokenOut, amountIn, slippageBps })` queries all 5 venues in parallel via Promise.all, returns `{ bestRoute, allRoutes, bestAmountOut, executionPath }`. Pure compute / off-chain reads only.
- `packages/providers/mantle-dex/src/actions/swap.ts` — NEW — `swap({ tokenIn, tokenOut, amountIn, slippageBps, recipient })`. Re-quotes inside execute (race against stale quotes), confirms `amountOutMin` against fresh route, submits via the winning venue's router.
- `packages/providers/mantle-dex/src/venues/merchantMoe.ts` — NEW — LB Router quote + swap. Uses `LBRouter.getSwapOut` for quoting; `swapExactTokensForTokens` for execution. Address from `@mpilot/shared` (`0x45A62B090DF48243F12A21897e7ed91863E2c86b`).
- `packages/providers/mantle-dex/src/venues/agni.ts` — NEW — Uniswap V3-style quoter via QuoterV2 + SwapRouter. Tries 100/500/3000/10000 bps fee tiers; picks best.
- `packages/providers/mantle-dex/src/venues/fusionx.ts` — NEW — same V3 surface as Agni; different router address.
- `packages/providers/mantle-dex/src/venues/woofi.ts` — NEW — WOOFi V2 `WooPPV2.querySwap` for quote, `WooRouterV2.swap` for execution.
- `packages/providers/mantle-dex/src/venues/lifi.ts` — NEW — intra-Mantle Li.Fi quote (chain == chain → DEX aggregation through Li.Fi Diamond). Reuses the Li.Fi quote helper from story-40 (`@mpilot/lifi-bridge`).
- `packages/providers/mantle-dex/src/attestation.ts` — NEW — schema name `concierge.mantle-dex.<venue>.swap.v1`. Payload: tokenIn, tokenOut, amountIn, amountOut, venue, txHash.

---

## Acceptance criteria (BDD)

```
Given the package builds
When `pnpm --filter @mpilot/mantle-dex run build` runs
Then exit code is 0

Given the provider has 2 actions
When createMantleDexProvider({rpcUrl}) returns
Then Object.keys(provider.actions).sort() === ['quote','swap']

Given the quote action against all 5 venues
When called with USDC → sUSDe with 100e6 USDC
Then returns `{ allRoutes: { merchantMoe, agni, fusionx, woofi, lifi }, bestRoute: <venue>, bestAmountOut: <bigint> }` and `bestAmountOut === max(allRoutes.*.amountOut)`

Given a venue returns null (no liquidity for the pair)
When quote runs
Then the result includes that venue with `amountOut: null` and `reason: 'no_route'`, and bestRoute selection ignores it (NEVER picks a null venue silently)

Given slippage protection
When swap runs with `slippageBps: 50` (0.5%) and the post-execute amountOut < bestAmountOut * (1 - 0.005)
Then the venue's router reverts and the action throws `SwapSlippageBreach({ expected, actual, slippageBps })`

Given a re-quote inside execute shows stale data (best venue at quote time is no longer best at execute time)
When swap runs
Then it re-evaluates and submits to the FRESH best venue (NOT the stale one) — verified by checking the actual router address used vs the initial quote

Given the attestation payload
When built for a successful swap
Then schema is `concierge.mantle-dex.<venue>.swap.v1` (where <venue> is the actually-used venue), contains `venue`, `tokenIn`, `tokenOut`, `amountIn`, `amountOut`, `txHash`

Given the Agni venue tries multiple fee tiers
When quoting USDC → USDe (stable pair)
Then the 0.01% tier (100 bps) returns the best quote (asserted against known Mainnet pool reality)

Given the WOOFi venue
When the quote pair has no WOOFi listing
Then woofi venue returns `null` cleanly (NOT throws), and aggregation continues

Given file size budgets
When `pnpm scripts/check-file-loc.mjs` runs
Then every file is ≤ 400 LOC
```

---

## Shell verification

```bash
cd packages/providers/mantle-dex
test -f package.json
test -f src/provider.ts
test -f src/actions/quote.ts
test -f src/actions/swap.ts
for venue in merchantMoe agni fusionx woofi lifi; do
  test -f src/venues/$venue.ts
done
test -f src/attestation.ts

cd ../../..

# Package builds + typechecks
pnpm --filter @mpilot/mantle-dex run build
test $? -eq 0
pnpm run typecheck
test $? -eq 0

# Exposes exactly 2 actions
bun -e "
  import { createMantleDexProvider } from './packages/providers/mantle-dex/src/index.ts';
  const p = createMantleDexProvider({ rpcUrl: 'https://rpc.mantle.xyz' });
  const a = Object.keys(p.actions).sort();
  if (JSON.stringify(a) !== JSON.stringify(['quote','swap'])) process.exit(1);
"

# Attestation schema patterns present for each venue
for venue in merchantMoe agni fusionx woofi lifi; do
  grep -q "concierge.mantle-dex.$venue.swap.v1" packages/providers/mantle-dex/src/attestation.ts
done

# LOC budget
bun scripts/check-file-loc.mjs
test $? -eq 0
```

---

## Notes for coding agent

- **Best-quote-wins aggregation** per `research/concierge/03-providers/mantle-dex.md` § Mechanics. Default behavior; alternative (round-robin or pinned-venue) lives in user policy. v1 always picks best.
- **Re-quote inside execute** is non-negotiable — stale quotes from `Promise.all(venues.quote(...))` can be 200ms old, enough for MEV bots to front-run. The execute phase re-quotes inside the same block before signing. If the best venue changed, submit to the new one. Reference: `research/concierge/03-providers/mantle-dex.md` § Risks (MEV / stale quotes).
- **All 5 venue files implement the same interface** — `quote({ tokenIn, tokenOut, amountIn, slippageBps })` returns `{ venue, amountOut, txData, gasEstimate } | null`. `null` means no route (NOT throw — aggregation needs to keep going). The venue-agnostic provider code can treat them uniformly.
- **Agni fee tier picker:** for stable-stable pairs (USDC/USDe, USDC/sUSDe — where sUSDe ≈ $1.23 close-enough-to-stable), try 100 bps first (cheaper); for volatile pairs, 3000 bps. Don't expose this as a user knob — automatic.
- **Slippage default 50 bps** (0.5%) — sufficient for most stable trades on Mantle. User policy can override per-trade or per-asset class. Per `research/concierge/03-providers/mantle-dex.md` § Open questions.
- **WOOFi RFQ option** — WOOFi exposes off-chain quotes via their API in addition to on-chain `WooPPV2.querySwap`. v1 uses on-chain only (avoids the API-key dependency); RFQ comes in v1.1. Reference: `research/concierge/03-providers/mantle-dex.md` § Open questions.
- **LB v2 Router quoting via `getSwapOut`** — Merchant Moe's Liquidity Book uses bin discretization. The `Path` struct with `pairBinSteps[]` + `tokenPath[]` is the canonical way to specify routes. For simple A→B swaps, single-element arrays work.
- **viem multicall** all 5 venue quotes in parallel — Mantle's RPC handles batches well; saves 4 × 200ms ≈ 800ms per quote round-trip.
- **NO Chainlink, NO direct oracle reads in this provider.** Price discovery is via DEX quotes only. Per ADR-008.
- Cross-ref: `research/concierge/03-providers/mantle-dex.md` (every venue + ABI + integration pattern).
