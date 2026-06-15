# Story — `MockAavePool` for Mantle Sepolia playground

**ID:** story-14-mock-aave-pool
**Epic:** Epic E1 — Smart Contracts
**Depends on:** story-03-foundry-init-and-remappings
**Estimate:** ~1.5h
**Status:** PENDING

---

## User story

**As a** mPilot agent runtime running on Mantle Sepolia (where real Aave V3 is NOT deployed)
**I want to** a mock contract implements the Aave V3 `IPool` surface — supply / borrow / repay / withdraw / setUserEMode / getUserAccountData / getReserveData / getEModeCategoryData — with simplified-but-faithful math
**So that** judges can interact with the full mPilot tick loop end-to-end on Sepolia with zero capital, and our agent code does not branch between real-Aave and mock-Aave (same `IPool` interface on both)

---

## File modification map

- `contracts/src/mocks/MockAavePool.sol` — NEW — implements `aave-v3-origin/contracts/interfaces/IPool.sol` enough for mPilot's action surface. Storage: `mapping(address asset => ReserveDataLite) reserves`, `mapping(address user => mapping(address asset => uint256)) supplies`, `mapping(address user => mapping(address asset => uint256)) debts`, `mapping(address user => uint8) userEModeCategory`, `mapping(uint8 catId => EModeCategory) emodeCategories`. Critical: applies E-Mode 1 LTV/LT correctly so the silent-fail-trap (sUSDe LTV=0 in general mode) IS reproduced on Sepolia.
- `contracts/src/mocks/MockAavePoolLib.sol` — NEW — internal math helpers (ray math, health factor computation, available borrow calculation) — split out to keep `MockAavePool.sol` under 400 LOC.
- `contracts/src/mocks/types/MockReserveTypes.sol` — NEW — `ReserveDataLite { address aToken; address debtToken; uint128 borrowRateBps; uint128 supplyRateBps; uint16 ltvBps; uint16 liquidationThresholdBps; bool active; bool borrowingEnabled; }`. `EModeCategory { uint16 ltvBps; uint16 ltBps; uint16 bonusBps; string label; }`.

---

## Acceptance criteria (BDD)

```
Given MockAavePool is deployed via the Sepolia deploy script
When `forge build` runs
Then exit code is 0 and `MockAavePool` bytecode is under EIP-170 (split via library if needed)

Given a fresh deployment with sUSDe + USDC + USDe + USDY + mETH reserves initialized
When `pool.getReservesList()` is called
Then it returns 5 token addresses in deterministic order

Given E-Mode 1 is configured with (9000, 9200, 10400, "sUSDe Stablecoins")
When `pool.getEModeCategoryData(1)` is called
Then it returns those exact values (faithful to Mainnet E-Mode 1 from research/concierge/03-providers/aave-v3-mantle.md)

Given a user has supplied sUSDe but has NOT called setUserEMode(1)
When the agent calls `pool.borrow(USDC, 100e6, 2, 0, user)`
Then it reverts with `InsufficientCollateralLTV()` because sUSDe's LTV-in-general-mode is 0 (this REPRODUCES the silent-fail trap from real Aave Mantle — by design)

Given the user calls `pool.setUserEMode(1)` first, then supplies sUSDe and borrows USDC
When the borrow runs
Then it succeeds because E-Mode 1 sets sUSDe LTV to 90% (matches Mainnet semantics)

Given a supplied user has totalCollateralBase = $200 (8-decimal base), totalDebt = $100, LT = 92%
When `pool.getUserAccountData(user)` is called
Then `healthFactor = (200 * 0.92) / 100 = 1.84e18` (asserted to 1e15 precision)

Given a user with healthFactor = 1.84 tries to withdraw enough collateral to drop HF below 1.0
When withdraw runs
Then it reverts with `WouldBreakHealthFactor()`

Given a faucet flow is needed for judge testing
When admin calls `mockSetReserveData(asset, supplyRateBps, borrowRateBps)`
Then the rates update (admin can simulate yield drift for demo purposes)

Given the IPool interface compatibility
When the agent runtime compiled against real Aave V3 IPool ABI is pointed at MockAavePool
Then every function the agent calls resolves successfully (verified via TS integration test in story-31)
```

---

## Shell verification

```bash
cd contracts
forge build
test $? -eq 0

# Mock implements all functions the agent runtime uses
for fn in supply borrow repay withdraw setUserEMode getUserAccountData getReserveData getEModeCategoryData getReservesList getReserveConfigurationData; do
  forge inspect MockAavePool methods | grep -q "$fn" || { echo "missing $fn"; exit 1; }
done

# Bytecode under EIP-170 (library-split should keep it under)
size=$(forge inspect MockAavePool bytecode | wc -c)
test "$size" -lt 24576

# Unit tests on the mock pass
forge test --match-contract MockAavePoolTest 2>&1 | grep -E "\[PASS\]" | wc -l | awk '$1 >= 15 {exit 0} {exit 1}'

# E-Mode 1 silent-fail trap is reproduced (test the right revert)
forge test --match-test test_borrow_RevertsWhenSusdeWithoutEMode --match-contract MockAavePoolTest -vvv 2>&1 | grep -q "PASS"
```

---

## Notes for coding agent

- **The whole point of this mock is to reproduce the real-Aave silent-fail trap on Sepolia.** sUSDe in general mode has LTV=0; trying to borrow against it returns 0 silently on real Aave. The mock should `revert` with a typed error instead (silent failures violate the no-silent-failures principle in our codebase) — but the test harness asserts that without `setUserEMode(1)`, borrow against sUSDe DOES fail. This catches the bug in the agent runtime on Sepolia, not Mainnet.
- **Faithful E-Mode mechanics** are critical. Reference: `research/concierge/03-providers/aave-v3-mantle.md` § E-Mode categories — `(9000, 9200, 10400, "sUSDe Stablecoins")` exactly. Hard-code these in the deploy script (story-18).
- **Simplified interest accrual** — don't reimplement Aave's full IRM. Use linear interpolation per block: `borrowAccrued = principal * borrowRateBps * blocksSinceUpdate / blocksPerYear / 10000`. Faithful enough that the agent's plan/simulate phases give consistent results.
- **NO Chainlink, NO real oracle integration.** Mock prices come from `MockAaveOracle` (story-16). MockAavePool reads via `IAaveOracle(oracle).getAssetPrice(asset)` like the real contract.
- **No reentrancy guards needed** — this is a Sepolia mock, not production. Documented as such in the contract NatSpec.
- **Use Solidity 0.8.26 + OZ v5.1** like the rest of the codebase.
- **Library split (`MockAavePoolLib.sol`) is mandatory** — without it the contract blows past the EIP-170 24KB bytecode limit. Pure functions (HF computation, ray math) go in the library.
- Reference: `archive/patron-2026-06-02/docs/stories/story-14-mock-aave-pool.md` for the Patron-pattern mock with similar shape (Patron's MockAavePool was simpler — only supply/borrow/repay; mPilot needs the full E-Mode + getUserAccountData surface).
- Cross-ref: ADR-012 (Sepolia mock-deploy pattern), `research/concierge/03-providers/aave-v3-mantle.md` (all addresses + functions to mimic).
- File MUST stay under 400 LOC. If `MockAavePool.sol` approaches the limit, extract more logic into `MockAavePoolLib.sol`.
