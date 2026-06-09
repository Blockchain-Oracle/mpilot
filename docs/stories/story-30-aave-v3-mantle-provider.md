# Story — `@concierge/aave-v3-mantle` action provider

**ID:** story-30-aave-v3-mantle-provider
**Epic:** Epic E3 — Action Providers
**Depends on:** story-21-shared-abi-imports, story-22-sdk-skeleton, story-17-helper-config
**Estimate:** ~1.5h
**Status:** PENDING

---

## User story

**As a** Concierge agent runtime
**I want to** an `@concierge/aave-v3-mantle` package exposes `supply`, `borrow`, `repay`, `withdraw`, `setUserEMode`, `claimRewards` as Vercel AI SDK `tool()` definitions with Zod input schemas, viem-based execution, and ERC-8004 attestation hooks
**So that** the `plan → simulate → propose → execute → record` tick loop can act on Aave V3 Mantle without hand-rolling ABIs or addresses

---

## File modification map

- `packages/providers/aave-v3-mantle/package.json` — NEW — `name: "@concierge/aave-v3-mantle"`, exports map, peer deps on `viem`, `zod`, `ai`, `@concierge/shared`, `@concierge/sdk`
- `packages/providers/aave-v3-mantle/src/index.ts` — NEW — barrel exports
- `packages/providers/aave-v3-mantle/src/provider.ts` — NEW — `createAaveV3MantleProvider(opts)` returns a `ProviderInterface` (per story-22) with the 6 actions registered. Wraps `IPool` calls via viem `writeContract`. Emits structured `TickAction` events the runtime consumes.
- `packages/providers/aave-v3-mantle/src/actions/supply.ts` — NEW — `supply({ asset, amount, onBehalfOf })` Vercel AI SDK `tool()` def. Zod schema validates asset = sUSDe|USDC|USDe|USDY|mETH (enum constrained to addresses from `@concierge/shared`), amount > 0, onBehalfOf is valid address. Execute: `walletClient.writeContract({ address: pool, abi: ipoolAbi, functionName: 'supply', args: [asset, amount, onBehalfOf, 0] })` (referralCode=0 always per ADR-008 notes).
- `packages/providers/aave-v3-mantle/src/actions/borrow.ts` — NEW — `borrow({ asset, amount, onBehalfOf })`. Schema constrains asset to borrowable set (USDC, USDe, USDT0 per E-Mode 1). Execute calls `IPool.borrow(asset, amount, 2, 0, onBehalfOf)` (variable rate; ADR-008). **PRE-CHECK:** reads `userEModeCategory` via `getUserAccountData`; if `0` (not in E-Mode) AND user has sUSDe supplied, throws `AaveBorrowRequiresEMode1()` typed error from `@concierge/sdk` BEFORE submitting tx (catches the silent-fail trap from `research/concierge/03-providers/aave-v3-mantle.md`).
- `packages/providers/aave-v3-mantle/src/actions/repay.ts` — NEW — `repay({ asset, amount, onBehalfOf })`. Supports `amount === 'max'` → uses `type(uint256).max`.
- `packages/providers/aave-v3-mantle/src/actions/withdraw.ts` — NEW — `withdraw({ asset, amount, to })`. Pre-flight checks `getUserAccountData` to ensure HF post-withdraw ≥ user policy floor; refuses if it would breach.
- `packages/providers/aave-v3-mantle/src/actions/setUserEMode.ts` — NEW — `setUserEMode({ categoryId })`. Schema enforces `categoryId ∈ {0, 1, 2}`.
- `packages/providers/aave-v3-mantle/src/actions/claimRewards.ts` — NEW — calls `IRewardsController.claimAllRewards(assets, to)` against the Mantle Default Incentives Controller (`0x682482a584eE20fefc01f4575c45C5d84de6F619`).
- `packages/providers/aave-v3-mantle/src/selectors.ts` — NEW — pure read helpers: `getUserAccountData(user)`, `getHealthFactor(user)`, `getReserveData(asset)`, `maxSafeBorrow({ user, asset, targetHF })` (pure compute).
- `packages/providers/aave-v3-mantle/src/attestation.ts` — NEW — `buildAttestationPayload(action, txReceipt, preState, postState)` → returns the JSON payload per `research/concierge/03-providers/aave-v3-mantle.md` § ERC-8004 attestation hook schema (`concierge.aave.v3.<action>.v1` schema name, preHF/postHF, asset, amount, txHash, eMode).
- `packages/providers/aave-v3-mantle/README.md` — NEW — 5-line quickstart + action list.

---

## Acceptance criteria (BDD)

```
Given the package builds
When `pnpm --filter @concierge/aave-v3-mantle run build` runs
Then exit code is 0

Given the provider is created with a valid wallet client + Sepolia chain
When `createAaveV3MantleProvider({ walletClient, chain: 'mantle-sepolia' })` runs
Then it returns a ProviderInterface with exactly 6 actions: supply, borrow, repay, withdraw, setUserEMode, claimRewards

Given the supply action's Zod schema
When parsed with `{ asset: USDC_ADDRESS, amount: 100_000_000n, onBehalfOf: VALID_ADDR }`
Then it parses successfully

Given the borrow action with user NOT in E-Mode + has sUSDe supplied
When the agent attempts borrow without setUserEMode(1) first
Then the action throws `AaveBorrowRequiresEMode1()` BEFORE submitting the tx (silent-fail trap caught client-side)

Given borrow with valid E-Mode 1 active
When the action executes against a Sepolia fork
Then it submits the tx, returns `{ txHash, attestationPayload }` with the payload conforming to the `concierge.aave.v3.borrow.v1` schema (preHF, postHF, asset, amount, eMode === 1, txHash)

Given selectors.getHealthFactor reads on-chain state
When called for a known test user with $100 collateral / $50 debt / LT=92%
Then it returns 1.84e18 (asserted to 1e15 precision)

Given maxSafeBorrow({ user, asset: USDC, targetHF: 1.5 })
When called with the same test position
Then it returns the borrow amount that would result in HF = 1.5 (pure compute, no chain reads beyond the initial getUserAccountData)

Given the attestation payload builder
When called with a successful supply action
Then the returned JSON has `schema: "concierge.aave.v3.supply.v1"`, `chain: <chainId>`, `pool: <poolAddress>`, `asset`, `amountBase`, `txHash`, `preHF`, `postHF`, `eMode`, `ts` (all populated)

Given a withdrawal that would drop HF below the policy floor
When the action runs
Then it throws `WithdrawWouldBreakHealthFactor({ currentHF, projectedHF, floor })` BEFORE submitting

Given file size budgets
When `pnpm scripts/check-file-loc.mjs` runs against the package
Then every file is ≤ 400 LOC
```

---

## Shell verification

```bash
cd packages/providers/aave-v3-mantle
test -f package.json
test -f src/provider.ts
test -f src/actions/supply.ts
test -f src/actions/borrow.ts
test -f src/actions/repay.ts
test -f src/actions/withdraw.ts
test -f src/actions/setUserEMode.ts
test -f src/actions/claimRewards.ts
test -f src/selectors.ts
test -f src/attestation.ts
test -f README.md

# Package builds
cd ../../..
pnpm --filter @concierge/aave-v3-mantle run build
test $? -eq 0

# Typecheck passes
pnpm run typecheck
test $? -eq 0

# No file exceeds 400 LOC
bun scripts/check-file-loc.mjs
test $? -eq 0

# Provider exposes exactly 6 actions
bun -e "
  import { createAaveV3MantleProvider } from './packages/providers/aave-v3-mantle/src/index.ts';
  const p = createAaveV3MantleProvider({ rpcUrl: 'https://rpc.sepolia.mantle.xyz' });
  const actions = Object.keys(p.actions);
  if (actions.length !== 6) process.exit(1);
  for (const a of ['supply','borrow','repay','withdraw','setUserEMode','claimRewards']) {
    if (!actions.includes(a)) process.exit(1);
  }
"

# Attestation schema name is correct
grep -q "concierge.aave.v3.supply.v1" packages/providers/aave-v3-mantle/src/attestation.ts
grep -q "concierge.aave.v3.borrow.v1" packages/providers/aave-v3-mantle/src/attestation.ts
```

---

## Notes for coding agent

- **The E-Mode pre-check is the most load-bearing piece of this story.** Per `research/concierge/03-providers/aave-v3-mantle.md` § Gotchas + AUDIT-2026-06-04.md: sUSDe LTV in general mode = 0; real Aave Mainnet `Pool.borrow()` returns 0 silently if E-Mode 1 isn't enabled. We catch this client-side via `readContract(getUserAccountData)` → if `userEModeCategory == 0` AND user has any sUSDe supplied → throw typed error instead of submitting a no-op tx. CLAUDE.md load-bearing gotcha #1.
- **`referralCode = 0` always** per `research/concierge/03-providers/aave-v3-mantle.md` § Gotchas. Some Aave forks revert on non-whitelisted refs; passing 0 is universally safe.
- **`interestRateMode = 2`** (variable) — only mode supported on Aave V3. Stable rate is being phased out.
- **`amount === 'max'`** convention for `repay` + `withdraw`: SDK accepts `'max'` (string literal) and converts to `type(uint256).max`. Reduces "did I get the decimals right" bugs on max actions.
- **Schemas constrain asset to known addresses** — `asset: z.enum([SUSDE_ADDR, USDC_ADDR, USDE_ADDR, USDY_ADDR, METH_ADDR])` — so the LLM can't hallucinate addresses. Addresses come from `@concierge/shared/addresses.ts` resolved per chain id.
- **Use OZ-style typed errors throughout.** All thrown errors come from `@concierge/sdk` error hierarchy (story-23). Reference: `AaveBorrowRequiresEMode1`, `AaveSupplyFailed`, `WithdrawWouldBreakHealthFactor`, `OraclePriceUnavailable`.
- **`maxSafeBorrow` is pure compute** — single chain read for `getUserAccountData`, then arithmetic. Lets the `plan()` phase iterate without burning RPC calls.
- **Attestation payload schema** per `research/concierge/03-providers/aave-v3-mantle.md` § ERC-8004 attestation hook — includes preHF / postHF / eMode / amountBase / txHash. Hash via EIP-712 typed-data in the `record()` phase (story-67), not here.
- **viem chain selection** — provider takes either `chain: 'mantle-mainnet' | 'mantle-sepolia'` OR an explicit chain object. Defaults to whichever the runtime's wallet client is connected to (auto-detected via `walletClient.chain.id`).
- **NO Chainlink.** All price reads route through `MockAaveOracle` on Sepolia or real `IAaveOracle` on Mainnet (`getAssetPrice(asset)`). Per ADR-008.
- Cross-ref: `research/concierge/03-providers/aave-v3-mantle.md` (every field + revert reason + integration pattern), ADR-008 (oracle source), ADR-010 (smart account layer ties into this).
