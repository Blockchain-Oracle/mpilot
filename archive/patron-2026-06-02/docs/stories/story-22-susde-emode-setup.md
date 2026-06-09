# Story 22 — sUSDe E-Mode activation in PatronVault

**Epic:** Epic 1 — Smart Contracts
**Estimated:** ~1h
**Depends on:** story-10-patron-vault-base, story-11-patron-vault-aave-integration

> **Why this story exists** (added 2026-06-03 via AUDIT-1): sUSDe LTV in Aave Mantle general mode = 0. The only borrow path is Aave **stablecoin E-Mode (category 1, LTV 90 / LT 92 / Bonus 4)**. `PatronVault` MUST call `pool.setUserEMode(1)` after the first sUSDe deposit per user OR borrowing power silently returns zero. Without this story, `story-11`'s `openLoan` would deposit sUSDe and then fail to borrow, with no clear error — silent failure.

## BDD Acceptance Criteria

```
Given the PatronVault is freshly deployed on a Mantle Sepolia fork
When the first user position is opened via openLoan() and sUSDe is supplied to Aave
Then before borrow is called, PatronVault calls `IPool.setUserEMode(1)` on the vault's own account
And `IPool.getUserEMode(vaultAddress)` returns 1
And `forge test --match-test test_openLoan_setsEModeOnFirstDeposit --fork-url $MANTLE_SEPOLIA_RPC_URL` exits 0

Given the vault has already opened ≥1 position (E-Mode already 1)
When a subsequent openLoan() is called
Then setUserEMode is NOT re-called (gas-saving idempotency check)
And the position opens successfully without redundant tx
And `forge test --match-test test_openLoan_skipsRedundantEModeCall` exits 0

Given the vault's E-Mode is somehow externally changed to 0 (admin error / chain fork glitch)
When openLoan runs and detects E-Mode != 1
Then it re-asserts setUserEMode(1) defensively before borrow
And emits event EModeReasserted(uint8 previousMode)
And `forge test --match-test test_openLoan_reassertsEModeIfDrifted` exits 0

Given the borrow would fail because sUSDe LTV under general mode is 0
When openLoan opens a fresh position WITHOUT having called setUserEMode(1)
Then the borrow reverts with Aave's collateral-balance-zero error
And the fork test PROVES this by deploying a buggy vault variant that skips setUserEMode and confirming revert
And `forge test --match-test test_openLoan_failsWithoutEMode_baseline` exits 0
```

## File modification map

- `packages/contracts/src/PatronVault.sol` — UPDATE — add `_ensureEMode()` internal helper called as the first step of `openLoan` after collateral supply, before borrow. Reads `pool.getUserEMode(address(this))`; calls `pool.setUserEMode(1)` if mode != 1; emits `EModeReasserted` if mode was non-zero non-one. Add storage `bool private _emodeInitialized` for fast-path on subsequent calls.
- `packages/contracts/src/errors/PatronErrors.sol` — UPDATE — add `EModeMismatch(uint8 actual, uint8 expected)` (used in `_ensureEMode` if Aave returns a value setUserEMode doesn't change)
- `packages/contracts/test/unit/PatronVaultEMode.t.sol` — NEW — fork tests against Mantle Sepolia: (1) first openLoan sets E-Mode to 1, (2) subsequent openLoan skips redundant setUserEMode, (3) externally-drifted E-Mode is re-asserted, (4) baseline: openLoan without E-Mode setup fails as expected (proves the fix is necessary)
- `packages/contracts/script/HelperConfig.s.sol` — UPDATE — add `uint8 public constant STABLECOIN_EMODE_CATEGORY = 1;` for shared constant

## Shell verification

```bash
cd packages/contracts
forge build
test $? -eq 0

# All 4 E-Mode tests pass
forge test --match-contract PatronVaultEMode --fork-url $MANTLE_SEPOLIA_RPC_URL -vvv
test $? -eq 0

# Specifically verify the baseline (failure-without-fix) test passes — proves story-22 is load-bearing
forge test --match-test test_openLoan_failsWithoutEMode_baseline --fork-url $MANTLE_SEPOLIA_RPC_URL -vvv
test $? -eq 0

# Coverage: _ensureEMode should be hit on every openLoan path
forge coverage --match-contract PatronVault | grep -E "_ensureEMode.*100"
```

## Notes

- Per ADR-002 (REVISED 2026-06-03): sUSDe LTV in general mode = 0 on Aave Mantle. E-Mode category **1** (stablecoin E-Mode) is the only path with LTV > 0 (90 / 92 / 4).
- E-Mode category constant `1` is hardcoded — Aave's `getEModeCategoryData(1)` returns the stablecoin category at the time of writing. If the category mapping changes, update `HelperConfig.s.sol`.
- Per Aave V3 docs: `setUserEMode(0)` exits E-Mode entirely; `setUserEMode(category)` enters. You cannot be in two E-Modes simultaneously. Once in E-Mode 1, the vault can only supply/borrow assets that are part of category 1 (sUSDe, USDC, USDT, USDS — verify list via `pool.getEModeCategoryCollateralBitmap(1)` in test setup).
- `_ensureEMode()` runs once per user-deposit (fast-path via `_emodeInitialized` storage flag). Storage write costs ~22k gas on first openLoan; subsequent openLoan is a SLOAD (~100 gas). Defensive re-assert path checks `pool.getUserEMode` on EVERY openLoan as cheap insurance against drift.
- This story logically lives between story-11 (Aave integration) and story-21 (Sepolia deployment). Its tests must run BEFORE story-21 deploys to Sepolia.
- File MUST stay under 400 LOC each.
