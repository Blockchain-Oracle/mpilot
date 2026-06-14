# Story — ERC-8004 feedback URI JSON schema + Zod validation

**ID:** story-80-feedback-uri-schema
**Epic:** Epic E6 — ERC-8004 Attestation Flow
**Depends on:** story-42-erc8004-provider
**Estimate:** ~30min
**Status:** PENDING

---

## User story

**As a** Concierge agent runtime
**I want to** a canonical JSON schema defines what goes in every off-chain feedback URI (the data referenced by an on-chain ERC-8004 attestation), with Zod validation so malformed payloads NEVER hit the IPFS pinner
**So that** the off-chain attestation content is queryable, type-safe, version-tagged, and downstream auditors (judges, users, future agents) can verify the data without reverse-engineering the format

---

## File modification map

- `packages/attestation/package.json` — NEW — workspace deps + `zod`
- `packages/attestation/src/index.ts` — NEW — barrel exports
- `packages/attestation/src/schema.ts` — NEW — Zod schemas: `FeedbackEnvelope { v: 1; schema: string; agentId: string; chainId: number; txHash?: string; payload: object; createdAt: ISOString }`. Per-provider payload schemas (`AaveSupplyPayload`, `MantleDexSwapPayload`, etc.) imported from each provider's package. Discriminated union via `schema` field.
- `packages/attestation/src/canonicalize.ts` — NEW — `canonicalize(envelope)`: returns JSON with deterministic key ordering (sorted alphabetically at every level) AND no whitespace. Critical so `keccak256(canonicalize(payload))` is reproducible across runs/clients.
- `packages/attestation/src/__tests__/schema.test.ts` — NEW — unit tests: valid envelopes parse; missing required fields throw; canonicalize is byte-equal across two runs with same input; canonicalize key order is alphabetical at all nesting levels
- `packages/attestation/src/__tests__/__fixtures__/envelopes.ts` — NEW — example envelopes for each provider schema

---

## Acceptance criteria (BDD)

```
Given the package builds
When `pnpm --filter @concierge-mantle/attestation run build` runs
Then exit code is 0

Given a valid Aave supply envelope
When parsed via `FeedbackEnvelope.parse(...)`
Then it returns the typed envelope with all fields populated

Given an envelope missing the schema field
When parsed
Then it throws `ZodError` (NOT silently accepts undefined schema)

Given an envelope with an unknown schema discriminator
When parsed
Then it throws with a clear error message naming the unknown schema (NOT generic Zod error)

Given canonicalize is called twice on the same envelope (object key order varied)
When both outputs are compared byte-by-byte
Then they are identical (canonical form is deterministic regardless of input key order)

Given canonicalize produces JSON
When inspected
Then it has NO trailing whitespace, NO indentation, NO newlines — the canonical form is the most compact valid JSON

Given an envelope's payload contains nested objects
When canonicalize runs
Then keys at EVERY nesting level are alphabetically sorted (not just the top level)

Given the v field
When set to 2
Then parsing throws — only v: 1 is supported in v1; explicit version gate

Given the createdAt field is missing
When parsed
Then it throws (createdAt is REQUIRED — no implicit "now" fallback)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd packages/attestation
test -f package.json
test -f src/schema.ts
test -f src/canonicalize.ts

cd ../..

pnpm --filter @concierge-mantle/attestation run build
test $? -eq 0
pnpm run typecheck

# Tests pass with the canonicalize-determinism case
pnpm --filter @concierge-mantle/attestation run test --reporter=verbose 2>&1 | grep "canonicalize.*Determinism" | grep -q "✓"

# Discriminated union by schema
grep -q "discriminatedUnion" packages/attestation/src/schema.ts

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Discriminated union by `schema` field** is the canonical Zod pattern for a polymorphic envelope. Each provider's payload schema is a member of the union; the runtime branches on `envelope.schema` to know which payload type to expect.
- **Canonicalization is non-negotiable.** Per `research/concierge/03-providers/erc8004.md` § EIP-712 typed-data hash: the on-chain hash (`feedbackHash` in giveFeedback) must equal `keccak256(canonicalize(envelope))`. If canonicalize is non-deterministic, the on-chain hash drifts from the off-chain content and verification breaks. Test it brutally.
- **`v: 1`** is the schema version. When we change the envelope structure post-hackathon, bump to v: 2 and gate parsing. Never silently accept future versions — explicit forward-compatibility.
- **`createdAt` is required, NOT defaulted.** Defaulting to `new Date()` at parse time would let two clients produce different canonical forms of the same logical envelope. Forces the producer to commit to a timestamp.
- **No whitespace in canonical JSON.** Compact form: `{"a":1,"b":[2,3]}` — no spaces, no newlines, no indentation. JSON.stringify with no spaces argument is correct; just sort keys first.
- **The canonicalize function recurses through nested objects.** Sorts arrays NOT by content (arrays preserve order — they're ordered data) but ensures keys within each object element are sorted.
- Cross-ref: `research/concierge/03-providers/erc8004.md` § EIP-712 + § dataHash computation.
