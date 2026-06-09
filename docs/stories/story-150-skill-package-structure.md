# Story — RealClaw skill package structure (`packages/skill-mantle-agent`)

**ID:** story-150-skill-package-structure
**Epic:** Epic E9 — RealClaw Skill
**Depends on:** story-22-sdk-skeleton
**Estimate:** ~45min
**Status:** PENDING

---

## User story

**As a** Concierge maintainer
**I want to** the RealClaw skill lives at `packages/skill-mantle-agent` with the standard skill folder layout (SKILL.md, assets/, scripts/, references/) per the RealClaw skills convention, NOT the Byreal Skills CLI (which is Solana-only)
**So that** the skill can be packaged + published to RealClaw's skill registry as a Track-6 qualifier, distributed via `npx skills add @concierge/mantle-agent`

---

## File modification map

- `packages/skill-mantle-agent/package.json` — NEW — workspace package; bundled output (NOT a code package); `files` field lists what gets published
- `packages/skill-mantle-agent/SKILL.md` — NEW — the skill's main definition (per RealClaw spec): YAML frontmatter (name, description, version, tools[], permissions) + markdown body with usage instructions
- `packages/skill-mantle-agent/assets/icon.svg` — NEW — placeholder skill icon (designer agent will replace)
- `packages/skill-mantle-agent/assets/preview.png` — NEW — placeholder preview screenshot (designer agent will replace)
- `packages/skill-mantle-agent/scripts/install.sh` — NEW — post-install script: configures the MCP server URL, prompts for OAuth completion
- `packages/skill-mantle-agent/references/quickstart.md` — NEW — 5-minute quickstart for new skill installers
- `packages/skill-mantle-agent/references/configuration.md` — NEW — config options (chain selection, default thresholds, etc.)
- `packages/skill-mantle-agent/.skillignore` — NEW — files NOT to package (similar to .gitignore for skills)
- `packages/skill-mantle-agent/__tests__/skill-structure.test.ts` — NEW — validates SKILL.md frontmatter against the RealClaw schema

---

## Acceptance criteria (BDD)

```
Given the skill folder structure
When inspected
Then it contains SKILL.md, assets/, scripts/, references/ (per RealClaw skill spec)

Given SKILL.md frontmatter
When parsed as YAML
Then it has fields: name, description, version, tools, permissions (all required by RealClaw)

Given SKILL.md description
When read
Then it does NOT call Concierge a "Buy-Now-Pay-Later agent" or any BNPL-era language (Patron contamination must NEVER appear)

Given the description
When inspected
Then it accurately describes Concierge: "Autonomous DeFi agent for Mantle" + the action surface (Aave, sUSDe, mETH, bridging, attestation)

Given the version field
When inspected
Then it follows semver (0.1.0 for hackathon submission)

Given the tools array
When iterated
Then it lists the MCP tools the skill exposes (matches the registered tools in apps/mcp-server: get_agent_state, get_reputation, get_attestation, pause_agent, resume_agent, revoke_session_key)

Given the permissions field
When inspected
Then it lists scopes: read:agent (for get_*) AND write:agent (for pause/resume/revoke) — matches OAuth scopes from story-134

Given the .skillignore
When checked
Then it excludes development artifacts (.test.ts, vitest.config.ts, src/)

Given typecheck
When `pnpm --filter @concierge/skill-mantle-agent run typecheck` runs
Then exit code is 0

Given the structure validation test
When run
Then it passes (SKILL.md schema valid, required fields present, no Patron contamination)

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
cd packages/skill-mantle-agent
test -f SKILL.md
test -f assets/icon.svg
test -f scripts/install.sh
test -f references/quickstart.md
test -f references/configuration.md
test -f .skillignore

cd ../..

# YAML frontmatter parseable
bun -e "
  import { readFileSync } from 'fs';
  import { parse } from 'yaml';
  const content = readFileSync('packages/skill-mantle-agent/SKILL.md', 'utf-8');
  const fm = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) { console.error('no frontmatter'); process.exit(1); }
  const parsed = parse(fm[1]);
  for (const k of ['name', 'description', 'version', 'tools', 'permissions']) {
    if (!parsed[k]) { console.error('missing field:', k); process.exit(1); }
  }
"

# Anti-Patron contamination
! grep -iE "(BNPL|Buy.Now.Pay.Later|yield.spread.wedge)" packages/skill-mantle-agent/SKILL.md

# Tests pass
pnpm --filter @concierge/skill-mantle-agent run test 2>&1 | grep "structure" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **REALCLAW SKILLS, NOT BYREAL.** Per CLAUDE.md load-bearing gotcha + memory: Byreal Skills CLI is Solana-only. RealClaw is the Mantle-compatible skill packaging system. The folder structure here matches RealClaw's spec.
- **PATRON CONTAMINATION IS A CRITICAL BUG.** Per AUDIT-2026-06-04: a previous version of this SKILL.md said "Buy-Now-Pay-Later agent" (residual from the archived Patron wedge). That language would ship to thousands of Claude users via the skill registry. The grep check is the regression guard.
- **The description field is the public-facing one-liner.** It appears in the skill listing. Copy it verbatim from `research/concierge/01-wedge-locked.md` (the locked positioning).
- **Tools array must MATCH the MCP server's registered tools.** Drift here = users install a skill that promises tools the server doesn't have. CI catches this via cross-reference test.
- **`.skillignore` like `.gitignore`** — excludes test files, source TypeScript, internal docs. The published skill is the SKILL.md + assets + scripts + references + maybe install scripts.
- **The install.sh script** handles the post-install configuration: it asks the user for their concierge.xyz user ID (or runs OAuth), saves to local config. Reference: `research/concierge/06-realclaw-skill-pkg.md` § install flow.
- **Designer agent owns icon + preview.** Placeholders here; final assets from designer per CLAUDE.md "designer owns UI" rule.
- Cross-ref: `research/concierge/06-realclaw-skill-pkg.md` (full skill packaging spec), CLAUDE.md anti-contamination grep.
