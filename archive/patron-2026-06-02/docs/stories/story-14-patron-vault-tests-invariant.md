# Story 14 — PatronVault Foundry invariant test (collateral × LTV ≥ debt)

**Epic:** Epic 1 — Smart Contracts
**Estimated:** ~2h
**Depends on:** story-12-patron-vault-tests-unit

## BDD Acceptance Criteria

```
Given the invariant test suite exists
When `forge test --match-contract PatronVaultInvariant -vvv` runs
Then exit code is 0
And the foundry.toml `[invariant] runs = 256, depth = 50` config is honoured
And no invariant violation is reported

Given the system invariant: for every open Position, collateralValue × maxLtv >= debtValue
When the invariant handler randomly sequences openLoan / repay / price-change calls
Then the invariant `invariant_collateralCoversDebt()` holds across every call sequence
And `forge test --match-test invariant_collateralCoversDebt` exits 0

Given the system invariant: protocol USDC balance + outstanding debt == total borrowed (conservation of value)
When the invariant handler executes a random sequence
Then `invariant_conservationOfDebt()` holds
And exit code is 0

Given the invariant runs in CI
When `forge test --match-contract PatronVaultInvariant --gas-report` runs
Then a gas report is emitted to stdout
And total invariant runtime is < 90 seconds at the default `runs = 256, depth = 50`
```

## File modification map

- `packages/contracts/test/invariant/PatronVaultInvariant.t.sol` — NEW — `is StdInvariant, Test`; sets up handler in `setUp`; targets the handler via `targetContract(address(handler))`; defines the invariant assertion functions
- `packages/contracts/test/invariant/handlers/PatronVaultHandler.sol` — NEW — Foundry invariant handler exposing bounded operations:
  - `openLoan(uint256 userSeed, uint256 amountSeed, uint256 collateralSeed)`
  - `repay(uint256 positionSeed, uint256 amountSeed)`
  - `movePrice(int256 priceSeed)` — perturbs the MockAggregatorV3 within `[0.7e8, 1.1e8]`
  - `warpTime(uint256 secs)` — `vm.warp` to simulate yield accrual
  - tracks ghost variables: `ghost_totalBorrowed`, `ghost_totalRepaid`, `ghost_openPositionIds`
- `packages/contracts/test/invariant/invariants/CollateralInvariants.sol` — NEW — pure library of invariant predicate functions, e.g. `function checkCollateralCoversDebt(...) internal view returns (bool)` — used by both invariant test and ad-hoc assertions in unit tests
- `packages/contracts/foundry.toml` — UPDATE — confirm `[invariant] runs = 256, depth = 50, fail_on_revert = false, call_override = false` (we tolerate handler reverts since prices may push positions into unhealthy states; the invariant must still hold on remaining state)

## Shell verification

```bash
cd packages/contracts

# Invariant suite runs and passes
forge test --match-contract PatronVaultInvariant -vvv
test $? -eq 0

# Both invariants present and run
forge test --match-test invariant_collateralCoversDebt
test $? -eq 0
forge test --match-test invariant_conservationOfDebt
test $? -eq 0

# Runtime gate
START=$(date +%s)
forge test --match-contract PatronVaultInvariant
END=$(date +%s)
DURATION=$((END - START))
test $DURATION -lt 90

# 400 LOC enforcement
wc -l test/invariant/PatronVaultInvariant.t.sol test/invariant/handlers/PatronVaultHandler.sol | awk 'NR<=2 { if ($1 > 400) exit 1 }'
```

## Notes

- Per architecture.md, this is the **critical** invariant the on-chain system MUST never violate. If this test ever fails, the vault is unsafe to deploy.
- `fail_on_revert = false` is intentional — the handler may legitimately try operations that revert (e.g., opening a loan when price is depegged); the invariant must hold on the *resulting* state regardless.
- Use Foundry **ghost variables** (`uint256 public ghost_totalBorrowed`) on the handler so invariants can compare expected vs. actual state without re-reading contracts (avoids tautology).
- Per `Banned patterns` in architecture.md: no `console.log` survives into committed code. Use `console2.log` from forge-std for debug; remove before commit.
- `targetSelector` (Foundry feature) can narrow which handler functions are called per run — useful if certain sequences blow up the search space. Start without, narrow if depth is shallow.
- Per ADR-003 reasoning, the invariant test is the strongest signal that the Aave Oracle integration (`IAaveOracle.getAssetPrice` against the Capped sUSDe/USDT/USD composite — not Chainlink) does not let the system enter an undercollateralised state even under adversarial price movement.
- This story closes out the PatronVault test pyramid (unit → fuzz → invariant). Subsequent contracts (MerchantRegistry, ReputationProxy, AgentAuthorizer) get their own test stories but do not need invariant tests — they are simpler state machines without continuous-value math.
