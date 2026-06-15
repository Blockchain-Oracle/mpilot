# Story — Docs SDK tutorial (5-minute end-to-end agent setup via SDK)

**ID:** story-175-docs-sdk-tutorial
**Epic:** Epic E10 — Docs Site
**Depends on:** story-170-docs-site-scaffold, story-22-sdk-skeleton
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** developer who just landed on /docs and wants to try the SDK
**I want to** a guided tutorial walks me through: `pnpm add @mpilot/sdk` → register an agent → set up session keys → run a tick locally → verify an attestation — all with working code I can copy-paste
**So that** I go from zero to a working tick in 5-10 minutes WITHOUT needing the dashboard UI or any non-CLI tooling

---

## File modification map

- `apps/web/content/docs/guides/quickstart.mdx` — NEW — the canonical 5-minute SDK quickstart
- `apps/web/content/docs/guides/registering-an-agent.mdx` — NEW — step-by-step agent registration
- `apps/web/content/docs/guides/session-key-policies.mdx` — NEW — issuing + revoking session keys via SDK
- `apps/web/content/docs/guides/running-a-tick.mdx` — NEW — programmatic tick + result handling
- `apps/web/content/docs/guides/verifying-attestations.mdx` — NEW — verify an attestation from a tx hash (programmatic complement to story-174's UI)
- `apps/web/content/docs/guides/_meta.tsx` — NEW — section nav
- `apps/web/content/docs/guides/__tests__/code-snippets.test.ts` — NEW — extract code blocks from MDX, lint them with the SDK's exported types (catches drift)

---

## Acceptance criteria (BDD)

```
Given the quickstart page
When followed verbatim in a fresh project
Then a developer goes from `pnpm add @mpilot/sdk` to a successful tick result in ≤ 5 minutes

Given each code block in the tutorials
When extracted and type-checked
Then it passes typecheck (NO type errors — drift between docs and SDK types is caught)

Given the registering-an-agent guide
When read
Then it covers: registerAgent function, the agentId returned, the IdentityRegistry tx that fires, what an agent record looks like in DB

Given the session-key-policies guide
When read
Then it covers: defining a policy, issuing the session key, the EIP-712 typed data signed, revoking via SDK

Given the running-a-tick guide
When read
Then it covers: tick() function, the TickResult shape (status: noop | awaiting_approval | awaiting_signature | executed | failed), what to do per status

Given the verifying-attestations guide
When read
Then it covers: SDK function for verification (`verifyAttestation(txHash)`), the steps it performs internally, the typed result

Given the code snippets test
When run
Then it extracts every ```typescript code block, runs typecheck against it; any unresolvable import or type error fails the test

Given Patron contamination guard
When grep'd across guides
Then NO matches for "BNPL", "Buy-Now-Pay-Later", "Patron"

Given each guide
When inspected for length
Then no guide exceeds 250 lines (split into multiple files if needed)
```

---

## Shell verification

```bash
cd apps/web/content/docs/guides
for guide in quickstart registering-an-agent session-key-policies running-a-tick verifying-attestations; do
  test -f $guide.mdx || { echo "missing $guide.mdx"; exit 1; }
done

cd ../../../../..

pnpm --filter @mpilot/web run build
test $? -eq 0

# Code snippets typecheck (extracts + validates)
pnpm --filter @mpilot/web run test 2>&1 | grep "code-snippets" | grep -q "PASS"

# No Patron contamination
! grep -irE "(BNPL|Buy.Now.Pay.Later|Patron)" apps/web/content/docs/guides/

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **CODE SNIPPETS MUST WORK VERBATIM.** Per `research/concierge/08-ux-component-intent.md` § docs: developers copy-paste from tutorials. If it doesn't run, the credibility hit is fatal. The code-snippets test is the regression guard — it extracts every ts block from MDX and typechecks it against the actual SDK exports.
- **Quickstart is the 5-minute version** of the longer guides. Each subsequent guide goes deeper on one section. A reader who only has 5 minutes does quickstart; a reader who has 30 minutes does all 5 guides.
- **TickResult shape** is the developer-facing contract. Document every status variant + what to do when you see it. Per CLAUDE.md no-silent-failures: a `failed` status with no recovery guidance is worse than no docs at all.
- **EIP-712 typed data display** in the session-key guide. Show the actual struct + types — devs need to understand what they're asking the user to sign.
- **`verifyAttestation(txHash)`** is the SDK-friendly mirror of story-174's UI verifier. Same logic; different surface. Both should produce the same VERIFIED/MISMATCH outcome for the same input.
- **Don't pad tutorials with prose explaining concepts** — link to concept pages. Tutorials are HOW-TO docs; concepts are WHY docs. Keep them separate.
- **Quick reference table at the top of quickstart** showing addresses + endpoints (Mainnet RPC, Sepolia RPC, MCP URL). Developers like having the "fastest path to action" visible.
- Cross-ref: `packages/sdk/src/index.ts` (export surface), story-22 (SDK skeleton), story-110 (approval flow this guide references).
