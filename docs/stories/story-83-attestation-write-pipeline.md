# Story — Full attestation write pipeline (envelope → pin → hash → on-chain attest)

**ID:** story-83-attestation-write-pipeline
**Epic:** Epic E6 — ERC-8004 Attestation Flow
**Depends on:** story-81-ipfs-pinning-pinata, story-82-feedback-hash-compute, story-42-erc8004-provider, story-67-tick-phase-record
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** Concierge agent runtime's record() phase
**I want to** a `writeAttestation({ agentId, providerSchema, payload, txHash, chainId })` function builds the envelope, pins to IPFS, computes the hash, and submits the on-chain `giveFeedback` tx
**So that** record() phase has ONE function to call (instead of orchestrating envelope/pin/hash/attest itself), and the pipeline can be tested end-to-end as a unit

---

## File modification map

- `packages/attestation/src/writeAttestation.ts` — NEW — `writeAttestation({ agentId, providerSchema, payload, txHash, chainId, erc8004Provider })`: builds FeedbackEnvelope → `pin = await pinFeedback(envelope)` → `hash = computeFeedbackHash(envelope)` → `attestResult = await erc8004Provider.attestAction({ agentId, dataHash: hash, dataURI: 'ipfs://' + pin.cid, providerSchema })`. Returns `{ attestationUid: attestResult.attestationId, cid: pin.cid, hash, onChainTxHash: attestResult.txHash }`. Logs each step via Pino.
- `packages/attestation/src/__tests__/writeAttestation.test.ts` — NEW — integration test on Sepolia fork with MSW for pinning: full pipeline runs → attestationUid captured → on-chain ReputationRegistry has the attestation → readReputation(agentId) returns it

---

## Acceptance criteria (BDD)

```
Given writeAttestation is called with valid inputs
When the function runs
Then envelope is built, pinned (CID returned), hash computed (matches CID's content hash), giveFeedback tx submitted, result includes { attestationUid, cid, hash, onChainTxHash }

Given the on-chain attestation
When readReputation(agentId) is called immediately after
Then the new attestation appears in the latest list with the same dataHash and dataURI === 'ipfs://' + cid

Given pinning fails (both Pinata + web3.storage)
When writeAttestation runs
Then it throws `IPFSPinFailed` BEFORE attempting the on-chain tx (don't write a stale dataURI to chain)

Given hash computation fails (malformed envelope, caught by Zod)
When writeAttestation runs
Then it throws BEFORE attempting pin or on-chain tx (fail at validation, not at the side-effect layers)

Given the on-chain tx reverts (e.g., RegistryPaused)
When writeAttestation runs
Then it throws `AttestationFailed` with the revert reason captured AND the pin is NOT rolled back (pinning is idempotent + the CID is still valid; just no on-chain reference)

Given the dataURI format
When the on-chain attestation is read
Then dataURI === 'ipfs://bafy...' (exact format: 'ipfs://' + CIDv1)

Given the success log
When the function completes
Then a single Pino info entry with { attestationUid, cid, hash, onChainTxHash, durationMs, providerSchema } is emitted

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd packages/attestation
test -f src/writeAttestation.ts

cd ../..

pnpm --filter @mpilot/attestation run build
test $? -eq 0

# Integration test passes
pnpm --filter @mpilot/attestation run test 2>&1 | grep "writeAttestation" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Pin BEFORE on-chain tx.** The on-chain reference (`dataURI`) points to an IPFS CID; that CID must exist at the time the tx is mined or anyone fetching the dataURI gets a 404. Pin first, attest second. If on-chain tx fails after pin succeeds, the pin remains (no rollback needed — orphan CIDs are cheap on Pinata).
- **Fail fast at validation.** Per CLAUDE.md no-silent-failures: Zod validation runs in `buildEnvelope`; failure here is a hard stop, before any side effect.
- **`dataURI` format is `ipfs://<cid>` (NOT a gateway URL).** Gateway URLs are owned by gateway operators; raw `ipfs://` is the protocol-level reference and can be resolved by any compatible client. Per ERC-8004 convention.
- **The on-chain dataHash MUST match the IPFS content.** If they diverge, the attestation is essentially lying. Round-trip test (story-81) catches this. Per `research/concierge/03-providers/erc8004.md` § verifiability.
- **No retries inside writeAttestation.** If pin or attest fails, surface the typed error. The CALLER (story-67 record phase) decides whether to retry. Per `feedback_audits_can_be_wrong.md` — silent retries on error paths mask real bugs.
- **Single Pino log entry per success** is the structured audit primitive. Lets us query "all attestations for agent X with their CIDs" via log query.
- Cross-ref: story-67 (callsite), `research/concierge/03-providers/erc8004.md` § dataURI semantics.
