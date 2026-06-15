# Story — `computeFeedbackHash(envelope)` (EIP-712 typed-data hashing for `giveFeedback`)

**ID:** story-82-feedback-hash-compute
**Epic:** Epic E6 — ERC-8004 Attestation Flow
**Depends on:** story-80-feedback-uri-schema
**Estimate:** ~30min
**Status:** PENDING

---

## User story

**As a** mPilot agent runtime
**I want to** a `computeFeedbackHash(envelope)` function returns the EXACT bytes32 hash that ReputationRegistry's giveFeedback expects, using viem's `hashTypedData` against the canonical envelope content
**So that** the on-chain hash (stored in the attestation NFT's metadata) matches the off-chain IPFS content byte-for-byte, enabling anyone to verify "this CID is what the agent attested" without ambiguity

---

## File modification map

- `packages/attestation/src/hash.ts` — NEW — `computeFeedbackHash(envelope): Hex` returns 32-byte hex string. Internally: canonicalize the envelope (story-80) → utf-8 encode → `keccak256`. NOT EIP-712 typed-data hashing (that's for signed messages); ERC-8004 `giveFeedback` takes a raw bytes32 dataHash — keccak256 of canonical content is sufficient and matches the contract's expectation.
- `packages/attestation/src/__tests__/hash.test.ts` — NEW — unit tests: hash determinism across processes (compute twice via child_process spawn, byte-equal); known-vector test (hand-craft an envelope, hardcode the expected hash, verify); collision-resistance smoke (random envelopes produce different hashes)
- `packages/attestation/src/__tests__/__helpers__/hash-cross-process.ts` — NEW — helper script for the cross-process determinism test

---

## Acceptance criteria (BDD)

```
Given computeFeedbackHash on a valid envelope
When run twice in the same process
Then both calls return byte-equal hex strings

Given computeFeedbackHash on the same envelope from two child processes
When the test spawns two fresh Node processes and compares their outputs
Then both processes produce byte-equal hex strings (cross-process determinism)

Given a known fixture envelope
When computeFeedbackHash is called
Then it returns the hardcoded expected hash from the test (known-vector test)

Given two slightly different envelopes (one field changed)
When both are hashed
Then the hashes differ in at least 50% of bytes (collision-resistance smoke)

Given the canonical envelope JSON
When `keccak256(utf8Encode(canonical))` is computed manually via viem
Then it matches `computeFeedbackHash(envelope)` (the function does what it says)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC

Given the function is called with a malformed envelope
When the schema validation runs first
Then it throws ZodError (NOT a generic hash error — fail at the validation layer, not the hash layer)
```

---

## Shell verification

```bash
cd packages/attestation
test -f src/hash.ts
test -f src/__tests__/hash.test.ts

cd ../..

pnpm --filter @mpilot/attestation run build
test $? -eq 0

# Tests pass including the cross-process determinism case
pnpm --filter @mpilot/attestation run test --reporter=verbose 2>&1 | grep "Cross.*Process.*Determinism" | grep -q "✓"

# Known vector test
pnpm --filter @mpilot/attestation run test --reporter=verbose 2>&1 | grep "Known.*Vector" | grep -q "✓"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Use `keccak256` from viem**, NOT a third-party implementation. viem's keccak is the Solidity-canonical implementation; mismatches in keccak implementations (which exist!) would cause on-chain hash to disagree with off-chain.
- **NOT EIP-712 typed-data hashing here.** ERC-8004's `giveFeedback(uint256 agentId, bytes32 dataHash, ...)` takes a raw bytes32 — no domain separator, no typed struct. The dataHash is application-defined; we define it as `keccak256(canonicalize(envelope))`. Keep this simple.
- **Cross-process determinism is the hardest property to maintain.** It's why story-80 canonicalize alphabetically-sorts at every nesting level. If you ever see a flaky hash test, the bug is almost certainly in canonicalize, NOT in keccak.
- **The known-vector test pins the hash output.** Hand-craft a specific envelope (in `__fixtures__/envelopes.ts` from story-80) and compute its hash once by hand (or with a one-time script). Hardcode that hash in the test. Now any future regression in the hash function fails this test immediately.
- **Collision-resistance smoke** is just a sanity check that we're using a real hash function (not, say, `JSON.stringify(envelope).length`). 50%-different-bytes is the threshold; cryptographic hashes produce ~50% Hamming distance for any input change.
- **No EIP-712 domain.** A future v1.1 might switch to EIP-712 if we want to use the dataHash as a signed message (signed by the agent's session key, for additional non-repudiation). For v1, raw keccak suffices.
- Cross-ref: `research/concierge/03-providers/erc8004.md` § dataHash computation + § keccak256 of canonical content.
