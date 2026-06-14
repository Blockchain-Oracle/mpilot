# Story — Session-key issuance flow (generate + sign + persist)

**ID:** story-53-session-key-issuance-flow
**Epic:** Epic E4 — Smart Account Layer
**Depends on:** story-52-session-key-policies, story-69-postgres-drizzle-schemas
**Estimate:** ~1.5h
**Status:** PENDING

---

## User story

**As a** Concierge user activating my agent
**I want to** a flow that (1) generates a fresh session-key keypair in my browser, (2) builds the policy from my agent's enabled providers, (3) requests my EOA to sign the policy approval, and (4) persists the (encrypted) session-key + policy to my Concierge account
**So that** the agent can act on my behalf within the granted scope without me being online for every tick

---

## File modification map

- `packages/smart-account/src/issueSessionKey.ts` — NEW — `issueSessionKey({ ownerAccount, conciergeAccount, providers, dailyLimitUSD, validUntil })` returns `{ sessionKeyAddress: Address; encodedPolicy: Hex; signature: Hex; sessionKeyPrivateKey: Hex (TEMPORARY — caller must persist + clear) }`. Internally: generates a fresh ECDSA keypair via `viem.generatePrivateKey()`, builds the PermissionValidator from story-52's policy composer, encodes the validator approval message, prompts the owner to sign via `ownerAccount.signMessage`.
- `packages/smart-account/src/persistSessionKey.ts` — NEW — `persistSessionKey({ userId, agentId, sessionKey, encryptionKey })` encrypts the private key with the user's per-account encryption key (derived from their Privy-managed secret), inserts a row in the `session_keys` Postgres table (from story-69), returns `{ sessionKeyId: string; persistedAt: Date }`. The plaintext private key is wiped from memory immediately after encryption.
- `packages/smart-account/src/loadSessionKey.ts` — NEW — `loadSessionKey({ sessionKeyId, encryptionKey })` reads from Postgres, decrypts, returns `{ privateKey: Hex; policy: Hex; signature: Hex; validUntil: Date }` — used by the worker process when it needs to sign UserOps as the agent.
- `packages/smart-account/src/__tests__/issueSessionKey.test.ts` — NEW — happy path + signature verification

---

## Acceptance criteria (BDD)

```
Given issueSessionKey is called
When the owner EOA signs the policy
Then returned object has `sessionKeyAddress` (Address), `encodedPolicy` (non-empty hex), `signature` (65-byte hex from owner)

Given the signature is verifiable
When `recoverAddress({ hash: encodedPolicy, signature })` is called
Then the recovered address === ownerAccount.address

Given persistSessionKey is called with the issued session key
When the function runs
Then a row is inserted in `session_keys` table with encrypted private key (assert: stored value NOT equal to plaintext key); persistedAt is set; sessionKeyId is a valid UUID

Given the persisted session key is loaded
When `loadSessionKey({ sessionKeyId, encryptionKey })` runs with the correct encryption key
Then it returns the original sessionKeyPrivateKey + policy + signature

Given the wrong encryption key is provided
When loadSessionKey runs
Then it throws `DecryptionFailed` (typed; NOT a generic Error)

Given the session key validUntil has passed
When loadSessionKey runs with an expired session key
Then it throws `SessionKeyExpired({ expiredAt })` (the runtime catches this and forces re-auth)

Given the session key is marked revoked in the database
When loadSessionKey runs
Then it throws `SessionKeyRevoked({ revokedAt })` (NOT silently returns the key)

Given the issuance flow rejects when the signature is invalid
When the user's signMessage callback returns garbage
Then `issueSessionKey` throws `InvalidOwnerSignature` immediately (NOT later, when the validator rejects the UserOp on-chain)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd packages/smart-account
test -f src/issueSessionKey.ts
test -f src/persistSessionKey.ts
test -f src/loadSessionKey.ts

cd ../..

pnpm --filter @concierge-mantle/smart-account run build
test $? -eq 0

# Tests pass
pnpm --filter @concierge-mantle/smart-account run test 2>&1 | grep "issueSessionKey" | grep -q "PASS"

# Encrypted-at-rest invariant verified
pnpm --filter @concierge-mantle/smart-account run test 2>&1 | grep -E "Encrypted|persist" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Encryption-at-rest is non-negotiable.** Session-key private keys MUST be encrypted before they touch Postgres. The encryption key derives from the user's Privy session secret + a per-account salt; never reuse keys across users. Stored plaintext private keys would be a catastrophic security failure.
- **Private-key wipe pattern**: after persisting, immediately overwrite the JS variable holding the plaintext key with random bytes. Avoid JS garbage-collection windows where memory dumps could leak the key. Reference: `crypto.randomFillSync(plaintextKey)`.
- **Signature recovery validation** at issuance prevents the runtime from later trying to use a session key with a bad signature and getting a cryptic on-chain error. Better to fail at issuance.
- **`validUntil` should be 7 days max** (matches story-52's TimeFramePolicy default). Force re-auth weekly limits damage from any leaked-key window.
- **Database schema lives in story-69.** This story consumes it; the Drizzle table definition lives there.
- **`SessionKeyExpired` and `SessionKeyRevoked`** are distinct typed errors. The runtime treats them identically (force re-auth) but the audit log distinguishes them. CLAUDE.md no-silent-failures + typed-errors pattern.
- **No bundler call in this flow** — pure off-chain. The session key only fires when the agent submits a UserOp; issuance is just bytes-on-disk + a verified signature.
- Cross-ref: ADR-010 (session-key issuance flow), `research/concierge/05-zerodev-erc4337.md` § Session-key issuance.
