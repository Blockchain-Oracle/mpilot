# Story — `@mpilot/erc8004` action provider

**ID:** story-42-erc8004-provider
**Epic:** Epic E3 — Action Providers
**Depends on:** story-21-shared-abi-imports, story-22-sdk-skeleton
**Estimate:** ~1.5h
**Status:** PENDING

---

## User story

**As a** Concierge agent runtime
**I want to** an `@mpilot/erc8004` package exposes `registerAgent`, `attestAction`, `readReputation`, `readFeedback` actions against the ERC-8004 Identity + Reputation registries on Mantle Mainnet (and Sepolia testnet) using canonical addresses + ABIs
**So that** every tick the agent runs produces an on-chain reputation attestation (the wedge's verifiability claim per ADR-004) without hand-rolling ABIs or address resolution

---

## File modification map

- `packages/providers/erc8004/package.json` — NEW — peer deps + workspace deps
- `packages/providers/erc8004/src/index.ts` — NEW — barrel exports
- `packages/providers/erc8004/src/provider.ts` — NEW — `createErc8004Provider(opts)` returns ProviderInterface with 4 actions
- `packages/providers/erc8004/src/actions/registerAgent.ts` — NEW — `registerAgent({ ownerAddress })` calls `IdentityRegistry.register()` → mints a fresh agent NFT, captures the emitted `Transfer(0x0, owner, tokenId)` event to extract `tokenId` (which IS the `agentId` for the Reputation Registry). Returns `{ agentId, txHash, attestationPayload }`.
- `packages/providers/erc8004/src/actions/attestAction.ts` — NEW — `attest({ agentId, actionPayload, providerSchema })`. Computes the canonical EIP-712 typed-data hash of `actionPayload`. Calls `ReputationRegistry.attest(agentId, schemaIdFor(providerSchema), dataHash)`. Schema IDs are pre-registered constants in `src/schemas.ts` (one per provider — `concierge.aave.v3.borrow.v1`, `concierge.mantle-dex.<venue>.swap.v1`, etc.). Returns `{ txHash, attestationId }`.
- `packages/providers/erc8004/src/actions/readReputation.ts` — NEW — pure read: `readReputation({ agentId })` returns `{ totalAttestations, latestAttestation, schemaCounts: Record<schemaName, number> }`. Uses `ReputationRegistry.getAttestationCount(agentId)` + iterates via `getAttestationByIndex(agentId, i)` for the most recent N (default 10).
- `packages/providers/erc8004/src/actions/readFeedback.ts` — NEW — pure read: `readFeedback({ agentId, fromBlock })` queries `Feedback` events on the ReputationRegistry, returns array of `{ schemaId, dataHash, blockNumber, txHash }`.
- `packages/providers/erc8004/src/schemas.ts` — NEW — schema name → schemaId mapping (computed at module load via `keccak256(schemaName)`). Exports `schemaIdFor(name)` lookup. Pre-registers all expected Concierge schemas (Aave 6 actions × `concierge.aave.v3.<action>.v1`, DEX 5 venues × `concierge.mantle-dex.<venue>.swap.v1`, Ethena 2 × `concierge.ethena.<action>.v1`, etc.).
- `packages/providers/erc8004/src/eip712.ts` — NEW — typed-data helpers for `Attestation { agentId; schemaId; dataHash; timestamp }` and per-provider payload schemas. Verifies hash determinism: `hash(payload) === hash(payload)` across runs.

---

## Acceptance criteria (BDD)

```
Given the package builds
When `pnpm --filter @mpilot/erc8004 run build` runs
Then exit code is 0

Given the provider has 4 actions
When createErc8004Provider({rpcUrl, chain: 'mantle-sepolia'}) returns
Then Object.keys(provider.actions).sort() === ['attestAction','readFeedback','readReputation','registerAgent']

Given the provider on Mantle Sepolia
When provider resolves addresses
Then it uses Identity = 0x8004A818BFB912233c491871b3d84c89A494BD9e + Reputation = 0x8004B663056A597Dffe9eCcC1965A193B7388713 (per CLAUDE.md verified Sepolia addresses)

Given the provider on Mantle Mainnet
When provider resolves addresses
Then it uses Identity = 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 + Reputation = 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63 (verified 2026-06-04)

Given registerAgent
When called with a fresh owner address
Then it submits an `IdentityRegistry.register()` tx, parses the Transfer event from the receipt, returns agentId === extracted tokenId, agentId > 0, txHash valid

Given attestAction
When called with `{ agentId, actionPayload: { schema: 'concierge.aave.v3.borrow.v1', preHF, postHF, ... }, providerSchema: 'concierge.aave.v3.borrow.v1' }`
Then the computed dataHash matches `keccak256(eip712Encode(payload))`, the attest tx is submitted to ReputationRegistry with the correct schemaId (= keccak256('concierge.aave.v3.borrow.v1')), and the returned attestationId matches the emitted `Feedback` event's index field

Given the schemas lookup
When `schemaIdFor('concierge.aave.v3.borrow.v1')` is called
Then it returns `keccak256('concierge.aave.v3.borrow.v1')` (deterministic; same value every call)

Given EIP-712 hash determinism
When the same payload is hashed twice across separate process invocations
Then the two hashes are byte-equal (asserted via test that runs the encoder twice with identical input)

Given readReputation against a freshly registered agent
When called with agentId === 1
Then returns { totalAttestations: 0, latestAttestation: null, schemaCounts: {} }

Given readReputation after 3 attests against the same agent
When called
Then returns totalAttestations === 3, latestAttestation matches the most recent attest's payload, schemaCounts reflects the actual schemas used

Given readFeedback
When called with `{ agentId, fromBlock: 0n }`
Then returns ALL feedback events for the agent (no client-side filtering; the contract's event log is the source of truth)

Given the provider attempts to attest against a non-existent agentId
When called with agentId === 99999 on a fresh deployment
Then the tx reverts with `AgentNotFound(99999)` (typed error from the registry); the provider re-throws as `AttestationFailed({ reason: 'AgentNotFound', agentId })`

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd packages/providers/erc8004
test -f package.json
test -f src/provider.ts
for action in registerAgent attestAction readReputation readFeedback; do
  test -f src/actions/$action.ts
done
test -f src/schemas.ts
test -f src/eip712.ts

cd ../../..

pnpm --filter @mpilot/erc8004 run build
test $? -eq 0
pnpm run typecheck

# Provider exposes 4 actions
bun -e "
  import { createErc8004Provider } from './packages/providers/erc8004/src/index.ts';
  const p = createErc8004Provider({ rpcUrl: 'https://rpc.mantle.xyz', chain: 'mantle-mainnet' });
  const a = Object.keys(p.actions).sort();
  if (JSON.stringify(a) !== JSON.stringify(['attestAction','readFeedback','readReputation','registerAgent'])) process.exit(1);
"

# Schemas pre-registered for all provider/action combos
bun -e "
  import { schemaIdFor } from './packages/providers/erc8004/src/schemas.ts';
  const expected = [
    'concierge.aave.v3.supply.v1', 'concierge.aave.v3.borrow.v1', 'concierge.aave.v3.repay.v1', 'concierge.aave.v3.withdraw.v1', 'concierge.aave.v3.setUserEMode.v1', 'concierge.aave.v3.claimRewards.v1',
    'concierge.ethena.wrap.v1', 'concierge.ethena.unwrap.v1',
  ];
  for (const s of expected) {
    const id = schemaIdFor(s);
    if (!/^0x[a-fA-F0-9]{64}$/.test(id)) { console.error('bad schemaId for', s); process.exit(1); }
  }
"

# Canonical Mantle Mainnet addresses
grep -q "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" packages/providers/erc8004/src/provider.ts
grep -q "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63" packages/providers/erc8004/src/provider.ts

# LOC budget
bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **THIS PROVIDER IS THE WEDGE'S VERIFIABILITY CLAIM.** Per ADR-004. Without per-tick attestation, the "agent reputation lives on-chain" narrative breaks. CLAUDE.md load-bearing gotcha: every Mainnet `execute()` MUST be followed by `record()` calling this provider's `attest()`.
- **ABIs come from `@mpilot/shared`** (story-21) which fetched them from the canonical `erc-8004/erc-8004-contracts` repo via `gh api`. NEVER hand-type ABI signatures — they drift silently. Re-verify ABIs against the canonical source before any new attestation action.
- **Schema IDs are `keccak256(schemaName)`** — deterministic, computed at module load. Pre-registered constants prevent typos at call sites (`schemaIdFor('concierge.aave.v3.borrwo.v1')` would silently produce a different ID than the correct typo-free name). Reference: `research/concierge/03-providers/erc8004.md` § Schema namespace conventions.
- **`tokenId === agentId`** — the IdentityRegistry's NFT tokenId IS the agentId used by ReputationRegistry. They are the same number; there is no separate registration step on Reputation. Extract from the `Transfer(0x0, owner, tokenId)` event in the registerAgent receipt — DON'T try to compute it client-side (next-tokenId is contract storage; can race with concurrent registrations).
- **EIP-712 hash determinism is critical.** Two calls to `hash(samePayload)` from separate processes MUST produce byte-equal output. Common bug: object key ordering in JSON canonicalization. Use a canonical typed-data encoder (viem's `hashTypedData` is correct; ad-hoc JSON.stringify is NOT). Reference: `research/concierge/03-providers/erc8004.md` § EIP-712 typed-data hash.
- **`AttestationFailed` typed error** wraps registry reverts. The runtime needs to distinguish "transient RPC failure" from "permanent rejection (e.g., AgentNotFound)" — the typed error's `reason` field carries this. Per CLAUDE.md no-silent-failures rule + `feedback_audits_can_be_wrong.md`.
- **`readReputation` pagination:** the contract has no `getAllAttestations` (would be unbounded gas). Default returns most recent 10; caller passes `limit` for more. Per `research/concierge/03-providers/erc8004.md` § Open questions.
- **No off-chain dependency.** Reputation is fully on-chain; this provider has zero external API calls (no IPFS, no GitHub, no Pinata for attestation payloads — they live in the tx data, hashed). v1 keeps it simple; v1.1 may add IPFS-backed long-form attestation payloads.
- Cross-ref: ADR-004 (ERC-8004 attestation = verifiability claim), CLAUDE.md load-bearing gotcha (canonical addresses + ABI source), `research/concierge/03-providers/erc8004.md` (every claim).
