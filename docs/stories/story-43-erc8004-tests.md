# Story — `@concierge-mantle/erc8004` integration tests

**ID:** story-43-erc8004-tests
**Epic:** Epic E3 — Action Providers
**Depends on:** story-42-erc8004-provider
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** Concierge maintainer
**I want to** the erc8004 provider has integration tests against the real ERC-8004 registries on Mantle Sepolia (live contracts, not mocks — the addresses are deployed) covering register + attest + read flows, schemaId determinism, and EIP-712 hash determinism
**So that** the wedge's verifiability claim (per ADR-004) is provably wired correctly before any Mainnet attestation goes live

---

## File modification map

- `packages/providers/erc8004/src/__tests__/provider.test.ts` — NEW — construction + action surface + address resolution per chain
- `packages/providers/erc8004/src/__tests__/actions/registerAgent.test.ts` — NEW — fork test on Sepolia: register fresh agent, parse Transfer event, agentId monotonic
- `packages/providers/erc8004/src/__tests__/actions/attestAction.test.ts` — NEW — fork test: register agent → attest 3 actions across 2 different schemas → read back via readReputation, assert counts + payloads
- `packages/providers/erc8004/src/__tests__/actions/readReputation.test.ts` — NEW — fork test: empty reputation (just registered) + populated reputation (after attests)
- `packages/providers/erc8004/src/__tests__/actions/readFeedback.test.ts` — NEW — fork test: iterate Feedback events across block ranges
- `packages/providers/erc8004/src/__tests__/schemas.test.ts` — NEW — pure-compute: schemaIdFor determinism + all expected names are pre-registered
- `packages/providers/erc8004/src/__tests__/eip712.test.ts` — NEW — pure-compute: hash determinism (run twice, byte-equal); known-vector test against a canonical EIP-712 example
- `packages/providers/erc8004/src/__tests__/integration.test.ts` — NEW — end-to-end: register → attest 5 actions across 4 schemas → readReputation matches all 5
- `packages/providers/erc8004/src/__tests__/setup.ts` — NEW — Anvil fork from Mantle Sepolia (real ERC-8004 registries deployed; no mocks needed)
- `packages/providers/erc8004/vitest.config.ts` — NEW — `pool: 'forks'`, 30s timeout

---

## Acceptance criteria (BDD)

```
Given Vitest is configured
When `pnpm --filter @concierge-mantle/erc8004 run test` runs
Then exit code is 0 AND ≥ 22 test cases pass

Given test_provider_ResolvesSepolia
When createErc8004Provider({chain: 'mantle-sepolia'}) is constructed
Then provider.identityRegistry === '0x8004A818BFB912233c491871b3d84c89A494BD9e' AND provider.reputationRegistry === '0x8004B663056A597Dffe9eCcC1965A193B7388713'

Given test_provider_ResolvesMainnet
When createErc8004Provider({chain: 'mantle-mainnet'}) is constructed
Then provider.identityRegistry === '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' AND provider.reputationRegistry === '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63'

Given test_registerAgent_ReturnsAgentIdFromEvent
When register is called against the live Sepolia IdentityRegistry
Then returned agentId > 0, matches the Transfer event's tokenId, and a subsequent ownerOf(agentId) call returns the registered address

Given test_registerAgent_TwoAgents_AgentIdsMonotonic
When two registers run sequentially
Then second agentId === first agentId + 1

Given test_attest_HappyPath
When register → attest({ agentId, payload, schema: 'concierge.aave.v3.borrow.v1' })
Then the tx succeeds, the returned attestationId matches the Feedback event index, and the on-chain stored dataHash equals the locally-computed EIP-712 hash

Given test_attest_AgainstNonExistentAgent
When attest is called with agentId === 99999 on a freshly forked Sepolia
Then it throws `AttestationFailed({ reason: 'AgentNotFound', agentId: 99999 })` (typed; reason populated)

Given test_schemaIdFor_Deterministic
When schemaIdFor('concierge.aave.v3.borrow.v1') is called twice in separate runs
Then both invocations return the same 32-byte hash AND the hash equals `keccak256('concierge.aave.v3.borrow.v1')` exactly

Given test_schemaIdFor_AllPreregistered
When iterating all expected schema names (Aave 6 + DEX 5 + Ethena 2 + 1.1 reserves)
Then schemaIdFor returns a valid 32-byte hash for each; NONE throw

Given test_eip712_HashDeterminism
When eip712Hash(samePayload) runs twice (separate process invocations sharing the same payload via JSON file)
Then both produce byte-equal output (asserted via `vitest`'s `child_process.spawn` of a sibling test runner)

Given test_eip712_KnownVector
When eip712Hash is called with a hand-crafted payload matching EIP-712 spec example
Then the resulting hash matches the known expected hex value (from spec test vectors)

Given test_readReputation_EmptyAgent
When readReputation({ agentId: freshlyRegistered }) is called
Then totalAttestations === 0, latestAttestation === null, schemaCounts === {}

Given test_readReputation_AfterAttests
When 5 attests are submitted across 3 different schemas
Then totalAttestations === 5, schemaCounts reflects { 'concierge.aave.v3.borrow.v1': 2, 'concierge.aave.v3.supply.v1': 2, 'concierge.mantle-dex.agni.swap.v1': 1 }

Given test_readFeedback_IteratesEvents
When readFeedback({ agentId, fromBlock: 0n }) runs after 3 attests
Then returned array has 3 entries; each has matching schemaId + dataHash to the corresponding attest payload

Given test_integration_FullFlow
When register → 5 attests across 4 schemas → readReputation + readFeedback are called
Then all counts + hashes match (5 attestations, 4 unique schemas, all dataHashes reproduce from local EIP-712 encoding)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every test file ≤ 400 LOC

Given coverage
When `pnpm --filter @concierge-mantle/erc8004 run test --coverage` runs
Then line coverage on `src/` ≥ 90% (high bar because attestation is the wedge's load-bearing primitive)
```

---

## Shell verification

```bash
pnpm --filter @concierge-mantle/erc8004 run test --reporter=verbose
test $? -eq 0

pnpm --filter @concierge-mantle/erc8004 run test --reporter=verbose 2>&1 | grep -E "(✓|PASS)" | wc -l | awk '$1 >= 22 {exit 0} {exit 1}'

# Critical load-bearing tests present
for tn in "HashDeterminism" "schemaIdFor_Deterministic" "AgainstNonExistentAgent" "ResolvesSepolia" "ResolvesMainnet"; do
  pnpm --filter @concierge-mantle/erc8004 run test --reporter=verbose 2>&1 | grep "$tn" | grep -q "✓" || { echo "missing $tn"; exit 1; }
done

# Coverage ≥ 90%
cov=$(pnpm --filter @concierge-mantle/erc8004 run test --coverage 2>&1 | grep "All files" | awk '{print $4}' | tr -d '%')
test "${cov%.*}" -ge 90

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Test against live Sepolia registries, NOT mocks.** The ERC-8004 Identity + Reputation registries are DEPLOYED on Mantle Sepolia at the canonical addresses. Anvil-fork from `https://rpc.sepolia.mantle.xyz` and exercise the real contracts. Per CLAUDE.md no-silent-failures + ADR-004 wedge-criticality.
- **`readReputation` schemaCounts** is computed by querying every attestation's schemaId and reverse-mapping to schema names. Confirm the schemas.ts lookup is bidirectional (name ↔ id, both directions).
- **EIP-712 known-vector test** uses the canonical example from EIP-712 spec (the "Mail" example with from/to/contents fields). Hard-coding the expected hash guards against viem updates silently changing the hashing implementation.
- **Hash determinism cross-process test** uses `spawn('bun', ['src/__tests__/_helpers/hash-runner.ts', payloadJson])` to compute the hash in a fresh process, captures stdout, compares to in-process result. If viem ever introduces non-deterministic ordering (e.g., object iteration), this catches it.
- **90% coverage gate** is intentionally higher than the other providers (Aave 85%, DEX 80%). This is the wedge's verifiability primitive — every code path matters.
- **No live Mainnet calls in tests.** The registry test that asserts `ResolvesMainnet` checks the resolved ADDRESSES from the provider's config, NOT actual on-chain reads against Mainnet. Mainnet reads are reserved for postdeploy-smoke (story-19 + story-195).
- **Address re-verification.** The CLAUDE.md and provider both quote the Mantle Mainnet addresses; the test asserts the provider matches the documented addresses. If the addresses are ever revised (canonical repo updates), this test catches the drift before it ships.
- Cross-ref: `research/concierge/03-providers/erc8004.md` (every claim + ABI), AUDIT-2026-06-04.md (2026-06-04 re-verification of the addresses + `getVersion() === "2.0.0"`).
