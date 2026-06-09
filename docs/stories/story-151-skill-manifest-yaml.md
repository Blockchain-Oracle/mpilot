# Story — SKILL.md frontmatter (canonical metadata + tool registry binding)

**ID:** story-151-skill-manifest-yaml
**Epic:** Epic E9 — RealClaw Skill
**Depends on:** story-150-skill-package-structure, story-132-mcp-tools-write
**Estimate:** ~30min
**Status:** PENDING

---

## User story

**As a** Concierge user installing the skill
**I want to** SKILL.md's frontmatter is the canonical source of truth for the skill's metadata (name, description, tools array, MCP server URL, OAuth client_id, required permissions, supported chains), validated against the RealClaw schema
**So that** the skill registry can display correct metadata; OAuth flows know which client_id to use; the skill installer knows where to configure the MCP server

---

## File modification map

- `packages/skill-mantle-agent/SKILL.md` — UPDATE (created in story-150) — full canonical frontmatter populated
- `packages/skill-mantle-agent/schemas/skill-manifest.schema.json` — NEW — JSON Schema for the SKILL.md frontmatter (used by validation)
- `packages/skill-mantle-agent/scripts/validate-manifest.ts` — NEW — Zod-based validator; runs in CI
- `packages/skill-mantle-agent/__tests__/manifest-cross-check.test.ts` — NEW — validates that the `tools` array in SKILL.md matches the registered tools in apps/mcp-server (drift catches via shared source of truth)
- `.github/workflows/validate-skill.yml` — NEW — CI job that runs validate-manifest.ts on every PR touching the skill

---

## Acceptance criteria (BDD)

```
Given SKILL.md has full frontmatter
When parsed
Then it contains: name, description, version, mcp_server_url, oauth_client_id, tools (array of {name, description, scope}), permissions (array of OAuth scopes), supported_chains (array of chain IDs), homepage, repository, license

Given the mcp_server_url
When read
Then it points to https://mcp.concierge.xyz/mcp (production URL from story-133)

Given the tools array
When cross-checked against apps/mcp-server/src/tools/
Then every registered tool appears in SKILL.md AND every tool in SKILL.md is registered (no drift)

Given the supported_chains array
When inspected
Then it lists Mantle Mainnet (5000) AND Mantle Sepolia (5003)

Given the permissions array
When inspected
Then it includes "read:agent" AND "write:agent" (matching OAuth scopes from story-134)

Given the license field
When inspected
Then it is "MIT"

Given the validation script
When `pnpm packages/skill-mantle-agent/scripts/validate-manifest.ts` runs
Then exit code is 0 AND it explicitly validates each required field

Given a future regression: someone removes a tool from apps/mcp-server but forgets to update SKILL.md
When the cross-check test runs
Then it FAILS with a clear message naming the missing tool

Given the CI workflow
When a PR modifies SKILL.md or apps/mcp-server/src/tools/
Then validate-skill.yml runs (path-filtered trigger) AND blocks merge on validation failure

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
test -f packages/skill-mantle-agent/SKILL.md
test -f packages/skill-mantle-agent/schemas/skill-manifest.schema.json
test -f packages/skill-mantle-agent/scripts/validate-manifest.ts
test -f .github/workflows/validate-skill.yml

# Manifest validates
bun packages/skill-mantle-agent/scripts/validate-manifest.ts
test $? -eq 0

# Production MCP URL set
grep -q "mcp.concierge.xyz" packages/skill-mantle-agent/SKILL.md

# Both Mantle chains supported
grep -q "5000" packages/skill-mantle-agent/SKILL.md
grep -q "5003" packages/skill-mantle-agent/SKILL.md

# Cross-check test passes
pnpm --filter @concierge/skill-mantle-agent run test 2>&1 | grep "cross-check" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **SKILL.md frontmatter is the canonical source of truth.** Don't duplicate this metadata in package.json or elsewhere — drift breeds bugs.
- **Cross-check test** is the critical anti-drift guard. Without it, a future PR could remove a tool from the MCP server without updating SKILL.md, and users would install a broken skill. Per `feedback_audits_can_be_wrong.md`: silent drift is the worst kind of bug.
- **Chain IDs**: Mantle Mainnet = 5000, Mantle Sepolia = 5003 (verified per Mantle docs).
- **License: MIT** matches the repo license + signals open-source per Mantle ecosystem norms.
- **`oauth_client_id`** is the OAuth client ID registered with the concierge.xyz OAuth server (story-134). MCP clients use this to initiate the OAuth flow when they see a 401 from the MCP server.
- **`homepage` + `repository`** are the URLs that appear in the RealClaw skill listing. Pre-launch, these can be `https://concierge.xyz` and `https://github.com/<your-org>/mantel`.
- **The CI workflow uses path-filtered triggers** so it only runs when SKILL.md or apps/mcp-server/src/tools/ changes. Saves CI cycles.
- **Validation script uses Zod** (not raw JSON Schema) for consistency with the rest of the codebase, even though the .schema.json is for external tooling (e.g., editors).
- Cross-ref: `research/concierge/06-realclaw-skill-pkg.md` § SKILL.md spec, story-134 (OAuth client_id source).
