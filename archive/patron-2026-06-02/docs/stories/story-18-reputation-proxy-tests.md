# Story 18 — ReputationProxy Foundry tests vs ERC-8004 mocks

**Epic:** Epic 1 — Smart Contracts
**Estimated:** ~1.5h
**Depends on:** story-17-reputation-proxy

## BDD Acceptance Criteria

```
Given the ReputationProxy test suites exist
When `forge test --match-contract 'ReputationProxy(Unit|Fuzz|Fork)' -vvv` runs
Then exit code is 0
And `forge test --match-contract ReputationProxyUnit --list` reports >= 8 tests
And `forge test --match-contract ReputationProxyFuzz --list` reports >= 2 fuzz tests

Given a mock ERC-8004 Reputation Registry is deployed in the fixture
When logAction is invoked
Then the mock records the setMetadata call with (agentId, key, value)
Then ReputationProxy emits ActionLogged with matching fields
Then getActionByIndex returns the same Action struct that was logged

Given a Mantle Sepolia fork is loaded
When ReputationProxy.logAction is called against the live ERC-8004 Reputation Registry at 0x8004B663056A597Dffe9eCcC1965A193B7388713
Then the call succeeds (subject to the registry's own access checks)
Or it reverts with a documented registry error
And `forge test --match-test test_logAction_forkSepolia --fork-url $MANTLE_SEPOLIA_RPC_URL` exits 0

Given coverage is collected on ReputationProxy.sol
When `forge coverage --match-path 'src/ReputationProxy.sol' --report summary` runs
Then line coverage is >= 85%
```

## File modification map

- `packages/contracts/test/unit/ReputationProxyUnit.t.sol` — NEW — unit tests using mock registries:
  - `test_logAction_happyPath_emitsEventAndStoresAction`
  - `test_logAction_revertsForNonAgentRole`
  - `test_logAction_revertsWhenPaused`
  - `test_logAction_revertsOnRegistryUnset`
  - `test_getActionByIndex_revertsOutOfRange`
  - `test_getActionCount_returnsCorrectLength`
  - `test_setIdentityRegistry_byAdmin_succeeds`
  - `test_setReputationRegistry_byAdmin_succeeds`
- `packages/contracts/test/fuzz/ReputationProxyFuzz.t.sol` — NEW — fuzz tests:
  - `testFuzz_logAction_roundTripCodec(bytes32 paramsHash, int128 deltaScore, bool success)` — encode then decode via ActionCodec; assert equivalence
  - `testFuzz_logAction_multipleAgents(uint256 agentSeed, uint8 numActions)` — bounded; asserts per-agent isolation
- `packages/contracts/test/fork/ReputationProxyFork.t.sol` — NEW — Mantle Sepolia fork test calling the real ERC-8004 Reputation Registry; uses `vm.createSelectFork(vm.envString("MANTLE_SEPOLIA_RPC_URL"))`
- `packages/contracts/test/mocks/MockERC8004IdentityRegistry.sol` — NEW — minimal ERC-721-shaped mock with `ownerOf` + `mint(address, uint256)` helper
- `packages/contracts/test/mocks/MockERC8004ReputationRegistry.sol` — NEW — records every setMetadata call into a `Call[] public calls` array for assertions
- `packages/contracts/test/helpers/ReputationProxyFixture.sol` — NEW — abstract Test base wiring all three contracts and granting AGENT_ROLE to test caller

## Shell verification

```bash
cd packages/contracts

# Unit + fuzz suites pass without fork
forge test --match-contract 'ReputationProxy(Unit|Fuzz)' -vvv
test $? -eq 0

# Test count gates
forge test --match-contract ReputationProxyUnit --list 2>/dev/null | grep -cE 'test_' | xargs test 8 -le
forge test --match-contract ReputationProxyFuzz --list 2>/dev/null | grep -cE 'testFuzz_' | xargs test 2 -le

# Fork test (requires Sepolia RPC; skip if not set)
if [ -n "$MANTLE_SEPOLIA_RPC_URL" ]; then
  forge test --match-contract ReputationProxyFork --fork-url $MANTLE_SEPOLIA_RPC_URL -vvv
  test $? -eq 0
fi

# Coverage gate
forge coverage --match-path 'src/ReputationProxy.sol' --report summary 2>/dev/null > /tmp/rp-cov.txt
grep "ReputationProxy.sol" /tmp/rp-cov.txt
COV=$(grep "ReputationProxy.sol" /tmp/rp-cov.txt | awk '{print $4}' | tr -d '%')
awk -v c="$COV" 'BEGIN { exit (c < 85) }'
```

## Notes

- `MockERC8004ReputationRegistry` MUST faithfully replay the canonical Reputation Registry interface — store every `(agentId, key, value)` triple so the proxy's encoder can be asserted byte-for-byte.
- Fork test discipline: if the live ERC-8004 Registry on Sepolia has access control (e.g., must hold an Identity NFT before logging), the fork test should mint a test Identity NFT via the live Identity Registry's permissionless mint path (or skip with a clear `vm.skip(true)` if the path is gated).
- `ActionCodec` library is exercised here via `testFuzz_logAction_roundTripCodec` — this is the only place codec correctness is verified. If the codec is wrong, every receipt in production would be unreadable; treat this fuzz test as gating.
- Per architecture.md "Banned patterns": no mocks in the hot path. Mocks are explicitly allowed in tests (this story). Fork tests against the real registry are the hot-path coverage.
- All test files MUST stay under 400 LOC.
- The fork test address discovery may show that the live registry requires the caller to hold an Identity NFT; in that case the test calls Identity.mint first within the same forked state.
