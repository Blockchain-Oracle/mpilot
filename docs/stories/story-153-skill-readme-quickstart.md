# Story — Skill quickstart docs (`references/quickstart.md`)

**ID:** story-153-skill-readme-quickstart
**Epic:** Epic E9 — RealClaw Skill
**Depends on:** story-150-skill-package-structure
**Estimate:** ~30min
**Status:** PENDING

---

## User story

**As a** Claude Code user who just ran `npx skills add @mpilot/mantle-agent`
**I want to** the bundled `references/quickstart.md` walks me through the first 5 minutes: connect, set a goal, watch the tick stream, approve a proposal — using only natural-language Claude prompts
**So that** I see mPilot working in my own terminal/Claude session without reading a 50-page manual

---

## File modification map

- `packages/skill-mantle-agent/references/quickstart.md` — UPDATE (created in story-150) — full quickstart content
- `packages/skill-mantle-agent/references/configuration.md` — UPDATE — full configuration reference
- `packages/skill-mantle-agent/references/troubleshooting.md` — NEW — common issues + diagnostics
- `packages/skill-mantle-agent/references/example-prompts.md` — NEW — canonical Claude prompts that work well with the skill
- `packages/skill-mantle-agent/__tests__/references.test.ts` — NEW — validates: code blocks have real syntax-highlighted commands; example prompts are plausible

---

## Acceptance criteria (BDD)

```
Given quickstart.md
When read
Then it covers (in order): install verification, set up agent on Sepolia, define a goal, watch the tick stream, approve a proposal, view reputation

Given the quickstart's command examples
When inspected
Then each command is REAL (executable as-is in a fresh Claude session, no placeholders)

Given the configuration reference
When read
Then it documents EVERY config option from SKILL.md frontmatter with: name, type, default, valid range, example

Given the troubleshooting guide
When read
Then it covers: OAuth flow failures, MCP server unreachable, "agent not found" errors, rate limit hits, session key expired

Given the example prompts
When read
Then they include 5+ canonical Claude prompts: "show me my agent state", "pause my agent on Sepolia", "show me the last 10 actions", etc.

Given each docs file
When inspected for length
Then quickstart.md is ≤ 200 lines (scannable in one screen), configuration.md is ≤ 400 lines

Given the docs include screenshots
When inspected (assets/screenshots/)
Then any screenshot referenced exists at the referenced path (no broken images in the bundled docs)

Given no BNPL contamination
When grepping the references/
Then NO matches for "BNPL", "Buy-Now-Pay-Later", or "Patron"

Given file size budget
When `pnpm scripts/check-file-loc.mjs` runs
Then every file ≤ 400 LOC
```

---

## Shell verification

```bash
test -f packages/skill-mantle-agent/references/quickstart.md
test -f packages/skill-mantle-agent/references/configuration.md
test -f packages/skill-mantle-agent/references/troubleshooting.md
test -f packages/skill-mantle-agent/references/example-prompts.md

# Anti-Patron contamination across references
! grep -irE "(BNPL|Buy.Now.Pay.Later|Patron)" packages/skill-mantle-agent/references/

# quickstart.md size
[ $(wc -l < packages/skill-mantle-agent/references/quickstart.md) -le 200 ]

# Tests pass
pnpm --filter @mpilot/skill-mantle-agent run test 2>&1 | grep "references" | grep -q "PASS"

bun scripts/check-file-loc.mjs
```

---

## Notes for coding agent

- **Quickstart MUST be runnable verbatim.** Every command should work in a fresh Claude Code session right after `npx skills add ...`. Test it manually before merging — no exceptions. Bad docs cost more than missing features.
- **`example-prompts.md` is where the LLM friendliness lives.** Show users prompts that produce great results: specific, concrete, with the agent's name. "Show me agent abc123's recent actions" beats "What's happening?"
- **No placeholder commands.** `<your-agent-id>` is okay if the surrounding text explains where to get it. `agent_xyz123` (looks real but isn't) is NOT okay — users copy-paste and get confused errors.
- **Configuration reference is the long-tail doc.** Each setting needs: what it does, how to set it, what happens if it's wrong. Per `research/concierge/08-ux-component-intent.md` § error states: never make the user guess.
- **Troubleshooting walks through real failures.** Each section: symptom → likely cause → fix. Don't generalize ("if it doesn't work, check your config") — be specific ("if you see 401 errors, your OAuth token expired; run `npx skills config @mpilot/mantle-agent --refresh`").
- **Screenshots help BUT have a maintenance cost.** Use sparingly; only when text fails (e.g., showing the consent screen). Designer agent provides final assets.
- **The BNPL grep is the regression guard.** Without it, an LLM-generated edit could re-introduce Patron-era language. Per `feedback_brief_contamination.md` and AUDIT-2026-06-04.
- Cross-ref: `research/concierge/06-realclaw-skill-pkg.md` § documentation requirements, story-150 (the skill structure).
