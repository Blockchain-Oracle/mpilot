# Story 20 — AgentAuthorizer Foundry tests (issuance, revocation, scope enforcement)

**Epic:** Epic 1 — Smart Contracts
**Estimated:** ~1.5h
**Depends on:** story-19-agent-authorizer-v1

## BDD Acceptance Criteria

```
Given the AgentAuthorizer test suites exist
When `forge test --match-contract 'AgentAuthorizer(Unit|Fuzz)' -vvv` runs
Then exit code is 0
And `forge test --match-contract AgentAuthorizerUnit --list` reports >= 14 tests
And `forge test --match-contract AgentAuthorizerFuzz --list` reports >= 4 fuzz tests
And every test passes

Given a session key with windowSeconds=3600 and spendCapPerWindow=100e6
When two openLoan calls each spending 60e6 occur in the same window
Then the second call's authorization check returns false (cap exceeded)
And `forge test --match-test test_isAuthorized_capPersistsAcrossCalls` exits 0

Given a session key whose window has elapsed
When isAuthorized is called after windowSeconds + 1
Then spentInWindow resets to 0 in the next accounting call
And the new call is authorized within the fresh cap
And `forge test --match-test test_accountSpend_resetsAfterWindow` exits 0

Given coverage is collected
When `forge coverage --match-path 'src/AgentAuthorizer.sol' --report summary` runs
Then line coverage is >= 90%
```

## File modification map

- `packages/contracts/test/unit/AgentAuthorizerUnit.t.sol` — NEW — unit tests inheriting `AgentAuthorizerFixture`:
  - `test_issueSessionKey_happyPath_emitsEvent`
  - `test_issueSessionKey_revertsIfNotAgentOwner`
  - `test_issueSessionKey_revertsWhenPaused`
  - `test_revokeSessionKey_byOwner_succeeds`
  - `test_revokeSessionKey_byNonOwner_reverts`
  - `test_freezeAgent_byOwner_blocksAuthorization`
  - `test_unfreezeAgent_restoresAuthorization`
  - `test_isAuthorized_returnsFalseWhenRevoked`
  - `test_isAuthorized_returnsFalseWhenFrozen`
  - `test_isAuthorized_returnsFalseAfterExpiry`
  - `test_isAuthorized_returnsFalseForUnlistedTarget`
  - `test_isAuthorized_returnsFalseForUnlistedSelector`
  - `test_isAuthorized_returnsFalseWhenCapExceeded`
  - `test_isAuthorized_capPersistsAcrossCalls`
  - `test_accountSpend_resetsAfterWindow`
  - `test_accountSpend_revertsIfCallerNotInTargets`
- `packages/contracts/test/fuzz/AgentAuthorizerFuzz.t.sol` — NEW — fuzz tests:
  - `testFuzz_isAuthorized_capArithmeticSafe(uint128 cap, uint128 spend1, uint128 spend2)` — no overflow under any combination
  - `testFuzz_windowReset(uint64 windowSeconds, uint64 elapsed)` — bounded; window resets are correct
  - `testFuzz_freezeThenIssue_keyStillBlockedUntilUnfreeze(uint256 agentSeed)`
  - `testFuzz_scopeHashIsCanonical(address[] targets, bytes4[] selectors)` — bounded; same fields → same hash regardless of ordering (verifies ScopeHash.sol canonicalisation)
- `packages/contracts/test/helpers/AgentAuthorizerFixture.sol` — NEW — abstract base; deploys MockERC8004IdentityRegistry, AgentAuthorizer, mints test NFT to a test user, prepares a default Scope struct, exposes helpers like `issueDefaultKey(...)`
- `packages/contracts/test/invariant/AgentAuthorizerInvariant.t.sol` — NEW (single invariant) — `invariant_frozenAgentNeverAuthorizes`: after a freeze is observed in any sequence, isAuthorized for that agent returns false until an Unfreeze event

## Shell verification

```bash
cd packages/contracts

# Suites pass
forge test --match-contract 'AgentAuthorizer(Unit|Fuzz|Invariant)' -vvv
test $? -eq 0

# Test count gates
forge test --match-contract AgentAuthorizerUnit --list 2>/dev/null | grep -cE 'test_' | xargs test 14 -le
forge test --match-contract AgentAuthorizerFuzz --list 2>/dev/null | grep -cE 'testFuzz_' | xargs test 4 -le

# Coverage gate (this contract is security-critical → higher bar)
forge coverage --match-path 'src/AgentAuthorizer.sol' --report summary 2>/dev/null > /tmp/aa-cov.txt
grep "AgentAuthorizer.sol" /tmp/aa-cov.txt
COV=$(grep "AgentAuthorizer.sol" /tmp/aa-cov.txt | awk '{print $4}' | tr -d '%')
awk -v c="$COV" 'BEGIN { exit (c < 90) }'
```

## Notes

- Coverage bar is **90%** (vs 80-85% on other contracts) because this contract is the user's safety primitive — Emergency Freeze and spend caps. If authorization logic has a hole, user funds are at risk regardless of how good the vault is.
- `invariant_frozenAgentNeverAuthorizes` uses a handler that randomises freeze / unfreeze / spend / revoke calls; ghost variable tracks whether the agent is currently frozen; invariant asserts the predicate.
- `testFuzz_scopeHashIsCanonical` is the gating test for `ScopeHash.sol` — if hashing isn't canonical, two semantically identical scopes produce different hashes and the deduplication breaks.
- Reuse `MockERC8004IdentityRegistry` from story-18's test mocks.
- Per ADR-004, this v1 (scoped API key) is the fallback for EIP-7702. The test design should be agnostic enough that a v2 EIP-7702-backed implementation can swap in without rewriting the test suite — express assertions against the `IAgentAuthorizer` interface, not the concrete contract.
- All test files MUST stay under 400 LOC.
