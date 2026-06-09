# Story — Docs ERC-8004 explainer (standard primer + Concierge integration)

**ID:** story-174-docs-erc8004-explainer
**Epic:** Epic E10 — Docs Site
**Depends on:** story-170-docs-site-scaffold
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** developer unfamiliar with ERC-8004 (the agent reputation standard)
**I want to** a primer doc covering: what ERC-8004 is, registerAgent vs giveFeedback vs readFeedback, how Concierge uses each, why the wedge depends on per-tick attestation
**So that** I can understand the standard from scratch (no prior ERC-8004 knowledge required) AND can audit Concierge's integration without reading the EIP

---

## File modification map

- `apps/web/content/docs/concepts/erc8004/primer.mdx` — NEW — what ERC-8004 is, ecosystem context
- `apps/web/content/docs/concepts/erc8004/identity.mdx` — NEW — IdentityRegistry + registerAgent flow
- `apps/web/content/docs/concepts/erc8004/reputation.mdx` — NEW — ReputationRegistry + giveFeedback flow
- `apps/web/content/docs/concepts/erc8004/concierge-integration.mdx` — NEW — how Concierge uses ERC-8004 (the per-tick attestation pattern)
- `apps/web/content/docs/concepts/erc8004/verifying-an-attestation.mdx` — NEW — step-by-step: how anyone can verify a Concierge attestation given a tx hash
- `apps/web/content/docs/concepts/erc8004/_meta.tsx` — NEW — section nav
- `apps/web/components/docs/AttestationVerifier.tsx` — NEW — interactive embedded tool: paste a tx hash → fetch the attestation → display the verification steps

---

## Acceptance criteria (BDD)

```
Given the primer page
When read by someone with zero ERC-8004 knowledge
Then they understand: it's an agent reputation standard, has Identity + Reputation registries, supports off-chain payloads via dataURI

Given the identity page
When inspected
Then it documents: registerAgent function signature, what an agent ID looks like, how Concierge users get an agent ID at onboarding

Given the reputation page
When inspected
Then it documents: giveFeedback parameters (agentId, dataHash, dataURI, schema), schema discriminator pattern, readFeedback for querying

Given the concierge-integration page
When inspected
Then it explicitly states: "Per ADR-004, every Mainnet execution MUST be followed by record() writing giveFeedback. Without this, the wedge is broken."

Given the verifying-an-attestation page
When followed
Then a reader can take a tx hash from Mantlescan + verify the attestation in 5 manual steps (no Concierge SDK required)

Given the AttestationVerifier component
When the user pastes a tx hash and clicks Verify
Then it fetches the attestation, fetches the IPFS payload, computes the hash locally, displays "VERIFIED ✓" or "MISMATCH ✗" with diagnostic

Given the AttestationVerifier handles errors
When the tx hash is invalid OR the attestation doesn't exist OR the IPFS fetch fails
Then a clear typed error message is shown (per CLAUDE.md no-silent-failures)

Given all pages reference the canonical contract addresses
When inspected
Then they use the AddressTable component pulling from @concierge/shared/addresses

Given file size budget per MDX file
When inspected
Then no page ≤ 300 lines
```

---

## Shell verification

```bash
cd apps/web/content/docs/concepts/erc8004
for page in primer identity reputation concierge-integration verifying-an-attestation; do
  test -f $page.mdx || { echo "missing $page.mdx"; exit 1; }
done

cd ../../../../../..

pnpm --filter @concierge/web run build
test $? -eq 0

# ADR-004 referenced
grep -q "ADR-004" apps/web/content/docs/concepts/erc8004/concierge-integration.mdx

# Canonical ERC-8004 contract addresses present
grep -q "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" apps/web/content/docs/concepts/erc8004/identity.mdx \
  || grep -q "concierge/shared/addresses" apps/web/content/docs/concepts/erc8004/identity.mdx

# Tests pass
pnpm --filter @concierge/web run test 2>&1 | grep "AttestationVerifier" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **ERC-8004 is unfamiliar to most devs.** The primer page assumes ZERO prior knowledge. Define every term; show every function signature.
- **The verifying-an-attestation page is the trust-primitive UX in docs form.** A skeptical judge should be able to take a Mantlescan tx hash + verify the attestation themselves with no Concierge tooling. The 5 manual steps are: (1) read attestation from ReputationRegistry, (2) extract dataURI, (3) fetch IPFS content, (4) compute keccak256(canonical(content)), (5) compare to on-chain dataHash. This is the verifiability claim made tangible.
- **AttestationVerifier component** is the docs killer feature — paste a real tx hash, watch the verification run live. Judges love interactive demos.
- **Don't shy from the ADR-004 quote.** "Without this, the wedge is broken" is the load-bearing dependency; surface it so devs understand the criticality. Per CLAUDE.md no-silent-failures + `feedback_audits_can_be_wrong.md`.
- **Schema discriminator pattern** (each provider has its own schema like `concierge.aave.v3.borrow.v1`) is a non-obvious detail. Document it as a section with examples per provider.
- **IPFS gateway choice matters** for the verifier UI. Use ipfs.io as primary, cloudflare-ipfs.com as fallback (same as story-84). Tell the user which gateway returned the content (transparency).
- **Cross-link to the ERC-8004 EIP** at the start of the primer for devs who want the canonical source.
- Cross-ref: `research/concierge/03-providers/erc8004.md`, ADR-004, story-82 (hash computation matches what the verifier uses).
