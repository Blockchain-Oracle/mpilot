# Story — Docs API reference (auto-generated from SDK + handwritten supplements)

**ID:** story-176-docs-api-reference
**Epic:** Epic E10 — Docs Site
**Depends on:** story-170-docs-site-scaffold, story-22-sdk-skeleton
**Estimate:** ~1h
**Status:** PENDING

---

## User story

**As a** developer integrating Concierge
**I want to** the API reference auto-generates from the SDK's TypeScript exports via TypeDoc (or equivalent), with hand-written supplements for the per-provider tool surfaces + MCP tools + REST endpoints
**So that** every public function has docs that NEVER drift from the source code, and I can hit "Reference" in the sidebar to look up exact signatures

---

## File modification map

- `apps/web/content/docs/reference/sdk/_meta.tsx` — NEW — section nav (auto-populated from TypeDoc output)
- `apps/web/content/docs/reference/sdk/index.mdx` — NEW — SDK reference overview
- `apps/web/content/docs/reference/mcp-tools.mdx` — NEW — handwritten MCP tools list (read + write) with input schemas
- `apps/web/content/docs/reference/rest-api.mdx` — NEW — handwritten REST endpoint reference (/api/portfolio, /api/proposals/[id]/approve, etc.)
- `apps/web/content/docs/reference/contracts.mdx` — NEW — handwritten contracts reference (ConciergeRegistry methods, events)
- `apps/web/content/docs/reference/errors.mdx` — NEW — handwritten typed error reference (every error from @concierge/sdk + how to handle)
- `apps/web/content/docs/reference/_meta.tsx` — NEW — top-level reference nav
- `apps/web/scripts/generate-sdk-reference.ts` — NEW — TypeDoc invocation script that outputs MDX into apps/web/content/docs/reference/sdk/
- `.github/workflows/regenerate-docs.yml` — NEW — CI job that regenerates SDK reference on every push to main and commits the diff

---

## Acceptance criteria (BDD)

```
Given the generate-sdk-reference script runs
When `pnpm apps/web/scripts/generate-sdk-reference.ts` executes
Then it produces MDX files in apps/web/content/docs/reference/sdk/ for every public export of @concierge/sdk

Given a public function signature changes in @concierge/sdk
When the regenerate script runs in CI
Then the docs reference reflects the new signature (drift caught by uncommitted diff in CI)

Given the MCP tools reference
When inspected
Then it lists ALL tools registered in apps/mcp-server (read + write) with Zod-derived JSON Schema for inputs AND the OAuth scope required

Given the REST API reference
When inspected
Then it covers: /api/chat, /api/portfolio, /api/proposals/[id]/approve, /api/proposals/[id]/reject, /api/policy, /api/agent/[id]/history, /api/oauth/* — each with: method, auth, request shape, response shape, error cases

Given the contracts reference
When inspected
Then it covers ConciergeRegistry's public methods (registerAgent, validateSessionKey, getAgent) AND emitted events with their indexed fields

Given the typed errors reference
When inspected
Then it lists every error class from @concierge/sdk/errors with: error code, when it fires, recovery action

Given the regenerate-docs.yml workflow
When triggered by push to main
Then it: (1) runs the regenerate script, (2) commits the changes to a branch, (3) opens a PR with the diff (NOT auto-merges — humans review docs changes)

Given the docs are auto-generated
When a developer reads the SDK reference
Then they see types pulled directly from the source (no copy-paste drift possible)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
test -f apps/web/content/docs/reference/sdk/index.mdx
test -f apps/web/content/docs/reference/mcp-tools.mdx
test -f apps/web/content/docs/reference/rest-api.mdx
test -f apps/web/content/docs/reference/contracts.mdx
test -f apps/web/content/docs/reference/errors.mdx
test -f apps/web/scripts/generate-sdk-reference.ts
test -f .github/workflows/regenerate-docs.yml

pnpm --filter @concierge/web run build
test $? -eq 0

# Regenerate script runs cleanly
bun apps/web/scripts/generate-sdk-reference.ts --dry-run
test $? -eq 0

# Each MCP tool documented (cross-check against apps/mcp-server)
for tool in get_agent_state get_reputation get_attestation pause_agent resume_agent revoke_session_key; do
  grep -q "$tool" apps/web/content/docs/reference/mcp-tools.mdx || { echo "missing $tool in mcp-tools reference"; exit 1; }
done

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **TypeDoc with the markdown plugin** (`typedoc-plugin-markdown`) is the canonical generator for MDX-compatible output. Per Context7 verification: actively maintained, supports modern TS features (template literals, conditional types).
- **MCP + REST + contracts + errors are handwritten** because their structure isn't 1:1 derivable from TypeScript types — they need narrative context (auth model, error recovery, event semantics).
- **Drift between MCP tools list in docs vs apps/mcp-server is the worst kind of bug.** Per story-151 cross-check pattern: bake a CI check that every registered tool appears in the docs MDX.
- **REST API reference covers AUTH model per endpoint.** Some endpoints are public (story-113 reputation feed), most require Privy session. State this per endpoint — no global "all endpoints require auth" handwave.
- **The contracts reference is for devs who want to interact directly** (without our SDK). List public ABIs + events. Devs who integrate via SDK can skip; devs writing their own contract layer need this.
- **`regenerate-docs.yml` opens a PR**, doesn't auto-commit to main. Docs changes deserve review (typos, broken cross-links, etc.). The bot creates the PR; a human merges.
- **Errors reference is the on-call developer's first stop at debug time.** "I got `SessionKeyExpired`" → look up reference → see "fires when validUntil < now; recover by re-issuing via story-53 flow" → action.
- **Don't auto-generate the MCP tools section** — the Zod schemas don't TypeDoc cleanly. Write them by hand with structure pulled from the source.
- Cross-ref: `packages/sdk/src/index.ts` (export surface this docs), TypeDoc docs (Context7-verified).
