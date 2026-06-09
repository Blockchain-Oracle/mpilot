# Story 13 — PatronVault Foundry fuzz tests

**Epic:** Epic 1 — Smart Contracts
**Estimated:** ~1.5h
**Depends on:** story-12-patron-vault-tests-unit

## BDD Acceptance Criteria

```
Given the fuzz test suite exists
When `forge test --match-contract PatronVaultFuzz -vvv` runs with the foundry.toml fuzz config
Then exit code is 0
And every fuzz test runs at least 256 iterations (matches foundry.toml `[fuzz] runs = 256`)
And no test counterexamples are emitted

Given a fuzz input of (amount, price, ltv) within plausible bounds
When openLoan is called
Then either the call succeeds with debt <= collateralValue * maxLtv
Or it reverts with one of the documented errors (DepegBelowFloor, ZeroAmount, AaveBorrowFailed, ExceedsCollateralValue)
And no other revert reason occurs

Given a fuzz input for repay with amount > debt
When repay is invoked
Then the function caps the repay at the outstanding debt
And remainingDebt returned is 0
And no funds are over-pulled from the caller (assert via balance delta)
```

## File modification map

- `packages/contracts/test/fuzz/PatronVaultFuzz.t.sol` — NEW — fuzz test suite inheriting `PatronVaultFixture`. Required fuzz functions:
  - `testFuzz_openLoan_amount(uint256 amount)` — bounds `amount` via `bound(amount, 1, 1_000_000e6)`; asserts success-or-known-revert
  - `testFuzz_openLoan_price(int256 price)` — bounds `price` via `bound(price, 0.5e8, 1.2e8)`; asserts depeg revert below floor, success otherwise
  - `testFuzz_openLoan_ltv(uint256 collateral, uint256 borrowAmount)` — asserts debt never exceeds collateralValue × maxLtv
  - `testFuzz_repay_excess(uint256 repayAmount, uint256 outstandingDebt)` — asserts overpayment is capped
  - `testFuzz_repay_partial_invariant(uint256 partial)` — asserts `remainingDebt + partial == initialDebt`
  - `testFuzz_openLoan_multipleUsers(uint8 numUsers)` — opens N positions; asserts each is independent (state isolation)
- `packages/contracts/foundry.toml` — UPDATE — confirm `[fuzz] runs = 256, max_test_rejects = 65536, seed = "0x..."` (deterministic seed for CI reproducibility); confirm `[profile.ci.fuzz] runs = 1024` for nightly deeper runs
- `packages/contracts/test/helpers/Bounds.sol` — NEW — library of `bound*` helpers (e.g. `boundAmount`, `boundPrice`, `boundLtv`) with named constants so fuzz tests stay readable

## Shell verification

```bash
cd packages/contracts

# Fuzz suite runs
forge test --match-contract PatronVaultFuzz -vvv
test $? -eq 0

# Confirm fuzz iteration count from foundry.toml
grep -E 'runs\s*=' foundry.toml | head -1

# Re-run with explicit seed for reproducibility
FOUNDRY_FUZZ_SEED=0x1234 forge test --match-contract PatronVaultFuzz
test $? -eq 0

# No counterexamples surfaced
forge test --match-contract PatronVaultFuzz 2>&1 | grep -v -E "Counterexample|Failure"
test $? -eq 0
```

## Notes

- Per architecture.md test infra section, Foundry fuzz is the default for input-range coverage. Use `bound(input, min, max)` from forge-std to avoid wasted runs on out-of-range inputs.
- Fuzz seed: set in `foundry.toml` so CI runs are reproducible. Different seeds for local exploration; CI uses pinned seed.
- Fuzz runs:
  - Local dev / PR CI: 256 (default, matches foundry.toml from story-04)
  - Nightly profile: 1024+ (catches edge cases without slowing PR feedback)
- Bounds rationale:
  - `amount` upper bound `1_000_000e6` (1M USDC) — well above realistic v1 per-user cap of $200/24h but exercises overflow paths
  - `price` range `[0.5e8, 1.2e8]` — straddles the depeg floor (0.97e8) so both branches are explored
  - `ltv` derived from price + collateral so the assertion `debt <= collateralValue * maxLtv` is meaningful
- Document each fuzz function's invariant in a `/// @notice` comment so PR reviewers can audit assertion correctness.
- All test files MUST stay under 400 LOC. If the fuzz file grows large, split per assertion group.
- Per ADR-003, fuzz testing the oracle path with adversarial prices is the primary defence against re-running the Oct 11 2025 USDe depeg scenario.
