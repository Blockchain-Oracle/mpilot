# Story 12 — PatronVault Foundry unit tests (happy paths)

**Epic:** Epic 1 — Smart Contracts
**Estimated:** ~1.5h
**Depends on:** story-11-patron-vault-aave-integration

## BDD Acceptance Criteria

```
Given the PatronVault unit test suite exists
When `forge test --match-contract PatronVaultUnit -vvv` runs
Then exit code is 0
And `forge test --match-contract PatronVaultUnit --list` reports >= 12 tests
And every test passes (no skips, no xfail)

Given coverage is generated
When `forge coverage --match-contract PatronVaultUnit --report summary` runs
Then PatronVault.sol shows >= 80% line coverage
And the coverage summary is grep-able for "PatronVault.sol"

Given the unit tests run inside a single `forge test` invocation
When the suite completes
Then total runtime is < 30 seconds (no fork-mode dependency; mocks only)
```

## File modification map

- `packages/contracts/test/unit/PatronVaultUnit.t.sol` — NEW — happy-path unit tests using mocks (no Mantle fork required). Tests required (each one a separate `test_*` function):
  - `test_openLoan_happyPath_emitsEventAndStoresPosition`
  - `test_openLoan_assignsIncrementingPositionId`
  - `test_openLoan_pullsSusdeFromCallerAndApprovesAavePool`
  - `test_openLoan_transfersBorrowedUsdcToRecipient`
  - `test_repay_partial_decreasesDebt`
  - `test_repay_full_marksPositionClosed`
  - `test_repay_excess_returnsActualRepaid`
  - `test_pause_byPauserRole_succeeds`
  - `test_unpause_byPauserRole_succeeds`
  - `test_grantRole_byAdmin_succeeds`
  - `test_revokeRole_byAdmin_succeeds`
  - `test_setAaveAdapter_byAdmin_updatesStorage`
- `packages/contracts/test/mocks/MockAavePool.sol` — NEW — minimal implementation of `IPool.supply`, `IPool.borrow`, `IPool.repay` that simulates accounting (collateral balance + debt balance) so unit tests can assert state changes without forking
- `packages/contracts/test/mocks/MockERC20.sol` — NEW — OpenZeppelin `ERC20` extension with a `mint(address,uint256)` helper (or import OZ `ERC20Mock` if present in the installed version)
- `packages/contracts/test/helpers/PatronVaultFixture.sol` — NEW — abstract `Test` base contract that deploys MockERC20s, MockAggregatorV3, MockAavePool, and PatronVault with all roles wired; each unit test inherits to avoid setup duplication

## Shell verification

```bash
cd packages/contracts

# Suite runs and passes
forge test --match-contract PatronVaultUnit -vvv
test $? -eq 0

# Test count >= 12
forge test --match-contract PatronVaultUnit --list 2>/dev/null | grep -E '^\s+\[PASS\]|test_' | wc -l | xargs test 12 -le

# Coverage gate
forge coverage --match-contract PatronVaultUnit --report summary 2>/dev/null > /tmp/coverage.txt
grep "PatronVault.sol" /tmp/coverage.txt
# Extract line coverage % and assert >= 80
COVERAGE=$(grep "PatronVault.sol" /tmp/coverage.txt | awk '{print $4}' | tr -d '%')
awk -v c="$COVERAGE" 'BEGIN { exit (c < 80) }'

# Runtime budget (< 30s); use `time` for sanity check
time forge test --match-contract PatronVaultUnit
```

## Notes

- No fork. This story is pure mocks so it runs fast in CI (< 30s) and is deterministic. Fork-based happy-path tests already live in story-11's `PatronVaultAaveFork.t.sol`.
- Use Foundry's `vm.expectEmit(true, true, true, true)` before each event assertion so indexed topic checks are exact.
- For role checks, prefer `vm.expectRevert(abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, addr, role))` over string matching.
- `MockAavePool` should approximate Aave semantics enough to verify our integration is correct, but does NOT need to model interest accrual or health factor — fuzz / invariant tests in stories 13-14 cover those concerns.
- Coverage tool: Foundry's `forge coverage` ships with both `lcov` and `summary` reporters. The grep assertion above uses `summary` for portability; CI may also upload `lcov.info` to Codecov in a later story.
- All test files MUST stay under 400 LOC (Biome). If `PatronVaultUnit.t.sol` approaches the limit, split into `PatronVaultUnit_openLoan.t.sol` + `PatronVaultUnit_repay.t.sol` + `PatronVaultUnit_admin.t.sol`.
- forge-std version pinned in story-04 (`v1.9.0`); do not upgrade here.
