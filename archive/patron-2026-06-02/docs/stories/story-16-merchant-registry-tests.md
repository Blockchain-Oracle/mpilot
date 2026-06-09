# Story 16 — MerchantRegistry Foundry tests + bond fuzz

**Epic:** Epic 1 — Smart Contracts
**Estimated:** ~1.5h
**Depends on:** story-15-merchant-registry

## BDD Acceptance Criteria

```
Given the MerchantRegistry test suites exist
When `forge test --match-contract 'MerchantRegistry(Unit|Fuzz)' -vvv` runs
Then exit code is 0
And `forge test --match-contract MerchantRegistryUnit --list` reports >= 10 tests
And `forge test --match-contract MerchantRegistryFuzz --list` reports >= 4 fuzz tests
And every test passes

Given coverage is collected
When `forge coverage --match-path 'src/MerchantRegistry.sol' --report summary` runs
Then MerchantRegistry.sol line coverage is >= 85%

Given a fuzz input bondAmount in [0, 10_000e6]
When register is called
Then bondAmount < minBondAmount reverts with BondTooLow
And bondAmount >= minBondAmount succeeds and merchant is Active
And no other revert reason occurs

Given a fuzz input slug (bytes)
When two distinct merchants register with the same slug
Then the second call always reverts with SlugAlreadyTaken
```

## File modification map

- `packages/contracts/test/unit/MerchantRegistryUnit.t.sol` — NEW — unit tests inheriting `MerchantRegistryFixture`:
  - `test_register_happyPath_emitsEvent`
  - `test_register_revertsOnInsufficientBond`
  - `test_register_revertsOnSlugCollision`
  - `test_register_revertsWhenPaused`
  - `test_suspend_byAdmin_changesStatus`
  - `test_suspend_byNonAdmin_reverts`
  - `test_reinstate_clearsSuspension`
  - `test_slashBond_transfersBondToRecipient`
  - `test_slashBond_revertsIfNotSuspended`
  - `test_refundBond_revertsBeforeCooldown`
  - `test_refundBond_succeedsAfterCooldown`
  - `test_checkReputation_returnsExpectedTuple`
- `packages/contracts/test/fuzz/MerchantRegistryFuzz.t.sol` — NEW — fuzz tests:
  - `testFuzz_register_bondAmount(uint256 bondAmount)` — bounds `[0, 10_000e6]`; asserts revert-or-success contract
  - `testFuzz_register_slugCollision(bytes calldata slug)` — bounded length; two registrations always conflict
  - `testFuzz_setMinBondAmount(uint256 newMin)` — only admin can set; new min applies to subsequent registrations
  - `testFuzz_slashThenRefund_neverDoublePays(uint256 bondAmount)` — bond is either slashed OR refunded, never both; total payouts <= initial bond
- `packages/contracts/test/invariant/MerchantRegistryInvariant.t.sol` — NEW (lightweight) — single invariant `invariant_bondAccountingConserved`: sum of (held bonds + slashed bonds + refunded bonds) equals total bonds posted

## Shell verification

```bash
cd packages/contracts

# Unit + fuzz suites pass
forge test --match-contract 'MerchantRegistry(Unit|Fuzz)' -vvv
test $? -eq 0

# Invariant passes
forge test --match-contract MerchantRegistryInvariant -vvv
test $? -eq 0

# Test count gates
forge test --match-contract MerchantRegistryUnit --list 2>/dev/null | grep -cE 'test_' | xargs test 10 -le
forge test --match-contract MerchantRegistryFuzz --list 2>/dev/null | grep -cE 'testFuzz_' | xargs test 4 -le

# Coverage gate
forge coverage --match-path 'src/MerchantRegistry.sol' --report summary 2>/dev/null > /tmp/mr-cov.txt
grep "MerchantRegistry.sol" /tmp/mr-cov.txt
COV=$(grep "MerchantRegistry.sol" /tmp/mr-cov.txt | awk '{print $4}' | tr -d '%')
awk -v c="$COV" 'BEGIN { exit (c < 85) }'
```

## Notes

- Reuse `MockERC20` from story-12 (already in `test/mocks/`). Do not create a second USDC mock.
- Fuzz `testFuzz_register_bondAmount` should bound around `minBondAmount` so the boundary is exercised on both sides (use `bound(amount, 0, 2 * minBondAmount)` to bias).
- `testFuzz_slashThenRefund_neverDoublePays` is the most important fuzz test — bond accounting is the contract's only economic primitive. If this ever fails, fraud incentives flip.
- The lightweight invariant `invariant_bondAccountingConserved` uses Foundry ghost variables on a handler. Reuse pattern from story-14.
- All test files MUST stay under 400 LOC.
- No fork required — this contract has no Aave / Chainlink dependency; mocks suffice everywhere.
