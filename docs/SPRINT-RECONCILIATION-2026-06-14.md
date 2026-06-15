# Sprint-Status ↔ Stories Reconciliation Table (2026-06-14)

**Plan reference:** `~/.claude/plans/partitioned-discovering-truffle.md` Track 0b
**Status:** DECISION TABLE — no renames / authors / drops have been applied yet. Abu reviews row-by-row, then a follow-up PR executes the approved dispositions.

## Headline numbers

- `docs/sprint-status.yaml` declares **122 stories**.
- `docs/stories/` contains **122 story files**.
- **33 phantom** YAML IDs have no matching file.
- **33 orphan** files have no matching YAML ID.
- Prior audit reported 35 + 35 — **corrected to 33 + 33**. Every phantom and every orphan share an exact story-number prefix with exactly one counterpart, so the reconciliation is a clean 33-pair bipartite match (no fan-in / fan-out).

## Disposition legend

- **RENAME** — phantom YAML ID and orphan file describe the same intent. Resolution: rename the file to match the YAML ID (preferred — YAML carries `merged_at` / `pr_url` / `depends_on` graph and is harder to repair than a filename).
- **RENAME-INVERSE** — file title is the better canonical name (matches research / shipped code / actual scope better than the YAML slug). Resolution: rename the YAML id to match the file.
- **AUTHOR** — phantom is real new scope; orphan at the same number is unrelated leftover. Resolution: author a new stub story file under the phantom's slug AND archive the orphan. (None found — all 33 pairs are conceptually adjacent enough to map.)
- **SPLIT** — phantom and orphan describe two distinct deliverables sharing a story number. Resolution: pick one for the existing slot, allocate a fresh number for the other.
- **MERGE** — phantom + orphan describe overlapping work that should consolidate into one story. (None proposed.)
- **DROP** — phantom is obsolete scope, file content covers a different need that's already canonical. (None proposed.)

## The 33-row table

| # | Phantom YAML ID | Orphan File | Disposition | Rationale |
|---|---|---|---|---|
| 1 | `story-107-app-dashboard` | `story-107-app-dashboard-shell.md` | RENAME-INVERSE | File scope ("3-column layout + nav + agent switcher") is the canonical shell. Rename YAML id → `story-107-app-dashboard-shell`. Update downstream `depends_on` (108–115 chain, story-191). |
| 2 | `story-108-tick-card-component` | `story-108-tick-stream-live.md` | RENAME-INVERSE | File implements live SSE tick stream w/ 4 UI states, broader than a single "card component." Rename YAML id → `story-108-tick-stream-live`. Downstream: 110, 111. |
| 3 | `story-109-goal-set-screen` | `story-109-proposal-card.md` | SPLIT | YAML's "goal-set screen" (user goal capture) and the file's "proposal card" (before/after + hypothesis) are genuinely distinct UX surfaces, both required by ux-spec. Keep file as `story-109-proposal-card`, rename YAML id to match, then allocate a NEW number (suggest `story-116-goal-set-screen`) and author a stub for the goal-set screen. |
| 4 | `story-110-tick-history-list` | `story-110-approval-flow.md` | SPLIT | File covers the approval state-machine API (proposal→approve→execute trigger); YAML asked for a tick-history list view. Both needed. Keep file as `story-110-approval-flow`, rename YAML, allocate NEW number for tick-history (suggest `story-117-tick-history-list`) and author a stub. |
| 5 | `story-111-tick-detail-page` | `story-111-policy-editor.md` | SPLIT | File is the `/app/settings` policy editor (session-key policy CRUD); YAML asked for a tick detail page. Both needed and listed in ux-spec. Keep file as `story-111-policy-editor`, rename YAML, allocate NEW number for tick-detail (suggest `story-118-tick-detail-page`) and author a stub. |
| 6 | `story-112-portfolio-page` | `story-112-portfolio-snapshot.md` | RENAME-INVERSE | Same intent; file is the `/app` overview card variant of "portfolio page." Rename YAML id → `story-112-portfolio-snapshot`. |
| 7 | `story-114-settings-page` | `story-114-mantle-test-mode-banner.md` | SPLIT | Settings page is already covered by file 111 (policy editor) per the rework. File 114 is the Sepolia↔Mainnet test-mode banner — a load-bearing judges-first UI per `archive/patron-2026-06-02` testnet pattern. Keep file as `story-114-mantle-test-mode-banner`, rename YAML id; the "settings page" slot in YAML is obsolete (covered by 111) — also DROP the phantom's `depends_on` references (none currently). |
| 8 | `story-115-emergency-stop-flow` | `story-115-error-boundary-and-toasts.md` | SPLIT | Both required by ux-spec. File covers the cross-cutting error-boundary + toast system; YAML asked for the emergency-stop flow (revoke + halt). Keep file as `story-115-error-boundary-and-toasts`, rename YAML, allocate NEW number for emergency-stop (suggest `story-119-emergency-stop-flow`) and author a stub. NOTE: `story-193-mainnet-deploy-execution` declares `depends_on: story-115-emergency-stop-flow` — that dependency must be repointed to the new number. |
| 9 | `story-131-mcp-server-setup` | `story-131-mcp-tools-read.md` | RENAME-INVERSE | "Server setup" is too vague; file's "MCP read tools (`get_agent_state`, `get_reputation`, `get_attestation`)" is the actual scope per ADR-011 amended. Rename YAML id → `story-131-mcp-tools-read`. |
| 10 | `story-132-mcp-tool-registrations` | `story-132-mcp-tools-write.md` | RENAME-INVERSE | File's write tools (`pause_agent`, `resume_agent`, `revoke_session_key`) are the actual registration deliverable. Rename YAML id → `story-132-mcp-tools-write`. The 8-way `depends_on` block in YAML still applies (all providers + tick orchestrator). |
| 11 | `story-133-mcp-bearer-auth` | `story-133-mcp-cloudflare-worker.md` | SPLIT | File covers the OPTIONAL Cloudflare Worker hosted variant per ADR-011 amended (stdio-first, worker secondary). YAML's "bearer auth" is part of the hosted-variant deliverable but distinct. Keep file as `story-133-mcp-cloudflare-worker`, rename YAML, allocate NEW number for bearer auth (suggest `story-139-mcp-bearer-auth`) and author a stub OR fold into 134 (see row 12). |
| 12 | `story-134-mcp-redis-session-store` | `story-134-mcp-oauth-and-rate-limit.md` | RENAME-INVERSE | File scope (OAuth + per-token rate limit) is the canonical hosted-variant security layer; the Redis session store is one implementation detail within rate-limiting. Rename YAML id → `story-134-mcp-oauth-and-rate-limit`. Consider folding row-11's "bearer auth" stub here too. |
| 13 | `story-135-mcp-claude-code-integration-test` | `story-135-mcp-server-tests.md` | RENAME-INVERSE | File's "MCP server e2e tests (full client → server flow)" is the broader canonical scope that already covers the Claude Code integration test. Rename YAML id → `story-135-mcp-server-tests`. |
| 14 | `story-152-skill-json-output-contract` | `story-152-skill-install-flow.md` | SPLIT | File covers `npx skills add @mpilot/mantle-agent` install UX. YAML's "JSON output contract" is the structured-stdout requirement for skill tool calls (ADR-017 three-rail UI). Both needed. Keep file as `story-152-skill-install-flow`, rename YAML, allocate NEW number for JSON output contract (suggest `story-155-skill-json-output-contract`) and author a stub. |
| 15 | `story-153-skill-npm-publish` | `story-153-skill-readme-quickstart.md` | SPLIT | File is the `references/quickstart.md` skill docs. YAML's "skill npm publish" is the actual publish pipeline. Both needed; downstream story-175, story-200, story-204 depend on `story-153-skill-npm-publish`. Keep file as `story-153-skill-readme-quickstart`, rename YAML, allocate NEW number for npm publish (suggest `story-156-skill-npm-publish`) and author a stub. ⚠️ HIGH-IMPACT — repoint 3 downstream `depends_on` references. |
| 16 | `story-154-skill-distribution-prs` | `story-154-skill-publish.md` | RENAME-INVERSE | File "Publish skill to RealClaw registry (`npm publish` + registry submission)" subsumes the YAML's "distribution PRs." Rename YAML id → `story-154-skill-publish`. NOTE: with row-15 splitting the npm-publish out, reconsider whether 154 collapses entirely. Flag for Abu. |
| 17 | `story-170-docs-framework-bootstrap` | `story-170-docs-site-scaffold.md` | RENAME-INVERSE | File's "docs site scaffold" is the canonical Nextra/whatever-framework scaffold task. Rename YAML id → `story-170-docs-site-scaffold`. Cascades to 171–177 (all depend on 170). |
| 18 | `story-171-docs-quickstart` | `story-171-docs-concept-overview.md` | RENAME-INVERSE | File is the conceptual overview (read-first doc). Quickstart is covered separately by story-175 (`docs-sdk-tutorial`). Rename YAML id → `story-171-docs-concept-overview`. |
| 19 | `story-172-docs-sdk-reference` | `story-172-docs-agent-loop-deepdive.md` | RENAME-INVERSE | File is the agent-loop deep-dive (plan/simulate/propose/execute/record). SDK reference is covered by story-176. Rename YAML id → `story-172-docs-agent-loop-deepdive`. ⚠️ HIGH-IMPACT — story-177 depends on `story-172-docs-sdk-reference`; repoint. |
| 20 | `story-173-docs-providers-reference` | `story-173-docs-provider-reference.md` | RENAME | Spelling drift only (providers→provider). Rename file → `story-173-docs-providers-reference.md` to match YAML (YAML is the harder-to-change side). Trivial. |
| 21 | `story-174-docs-runtime-concepts` | `story-174-docs-erc8004-explainer.md` | RENAME-INVERSE | File is the ERC-8004 explainer (the verifiability-claim story per ADR-004). Runtime concepts are absorbed into story-172 (agent-loop deepdive). Rename YAML id → `story-174-docs-erc8004-explainer`. |
| 22 | `story-175-docs-skill-guide` | `story-175-docs-sdk-tutorial.md` | RENAME-INVERSE | File is the SDK tutorial (`@mpilot/sdk` quickstart). Skill guide is folded into story-177 (deploy). Rename YAML id → `story-175-docs-sdk-tutorial`. ⚠️ story-175 currently `depends_on: story-153-skill-npm-publish` — that dep makes sense ONLY under the YAML's old "skill guide" framing; with the rename, drop that dep and replace with `story-22-sdk-skeleton`. |
| 23 | `story-176-docs-mcp-guide` | `story-176-docs-api-reference.md` | RENAME-INVERSE | File is the full API reference (typed surface across packages). MCP-specific guide is part of story-177 (deploy) per the rework. Rename YAML id → `story-176-docs-api-reference`. Drop the `story-135-mcp-claude-code-integration-test` dep; replace with `story-22-sdk-skeleton`. |
| 24 | `story-177-docs-recipes` | `story-177-docs-deploy.md` | RENAME-INVERSE | File is the deploy guide (web + worker + MCP variants). "Recipes" was the old framing pre-rework. Rename YAML id → `story-177-docs-deploy`. Replace dep `story-172-docs-sdk-reference` (now renamed) with the deploy chain (`story-193-worker-fly-deploy`, `story-194-web-vercel-deploy`). |
| 25 | `story-191-sepolia-faucet-page` | `story-191-pimlico-prod-config.md` | SPLIT | File is the Pimlico production config + paymaster sponsorship policy (per ADR-010). YAML's Sepolia faucet page is a judges-first playground deliverable. Both needed. Keep file as `story-191-pimlico-prod-config`, rename YAML, allocate NEW number for sepolia-faucet-page (suggest `story-196-sepolia-faucet-page`) and author a stub. ⚠️ `story-202-demo-video-script-and-shoot` depends on `story-191-sepolia-faucet-page`; repoint. |
| 26 | `story-193-mainnet-deploy-execution` | `story-193-worker-fly-deploy.md` | SPLIT | File is the BullMQ worker Fly.io deploy (per CLAUDE.md `apps/worker/` on Fly.io). YAML's "mainnet deploy execution" is the contract deployment runbook execution. Both needed. Keep file as `story-193-worker-fly-deploy`, rename YAML, allocate NEW number for mainnet-deploy-execution (suggest `story-197-mainnet-deploy-execution`) and author a stub. ⚠️ HIGH-IMPACT — `story-195-postdeploy-smoke-tests` depends on `story-193-mainnet-deploy-execution`; repoint. |
| 27 | `story-194-mcp-server-deployment` | `story-194-web-vercel-deploy.md` | SPLIT | File is the Vercel web deploy. YAML's "MCP server deployment" is the optional Cloudflare Worker hosted variant deploy (pairs with story-133). Both needed. Keep file as `story-194-web-vercel-deploy`, rename YAML, allocate NEW number (suggest `story-198-mcp-server-deployment`) and author a stub. ⚠️ `story-195-postdeploy-smoke-tests` depends on `story-194-mcp-server-deployment`; repoint. |
| 28 | `story-195-postdeploy-smoke-tests` | `story-195-deploy-smoke-tests.md` | RENAME | Same intent, naming drift (deploy-smoke-tests vs postdeploy-smoke-tests). Rename file → `story-195-postdeploy-smoke-tests.md` to match YAML (YAML carries the 2 downstream `depends_on` from story-200 + story-202). |
| 29 | `story-201-architecture-diagram-export` | `story-201-demo-video-script.md` | SPLIT | File is the demo-video script. YAML's "architecture diagram export" is a separate submission asset. Both needed. Keep file as `story-201-demo-video-script`, rename YAML, allocate NEW number for arch-diagram (suggest `story-206-architecture-diagram-export`) and author a stub. NOTE: this collides with YAML's `story-202-demo-video-script-and-shoot` (row 30) — possible MERGE candidate; flag for Abu. |
| 30 | `story-202-demo-video-script-and-shoot` | `story-202-judge-walkthrough.md` | MERGE-CANDIDATE | File is the 90-sec judge walkthrough doc. YAML's "demo-video script-and-shoot" overlaps with both row-29's file (demo-video script) AND the judge walkthrough framing. Recommend: keep `story-201-demo-video-script` (row 29 file) as the video work, keep `story-202-judge-walkthrough` (this file) as the doc, rename YAML id → `story-202-judge-walkthrough`, and DROP the redundant "demo-video-script-and-shoot" framing. ⚠️ `story-203-x-thread-draft` and `story-204-dorahacks-submission` depend on `story-202-demo-video-script-and-shoot`; repoint to `story-202-judge-walkthrough`. |
| 31 | `story-203-x-thread-draft` | `story-203-submission-form-prep.md` | SPLIT | File is DoraHacks + Mantle submission form prep. YAML's X thread draft is a separate social/marketing deliverable. Both needed. Keep file as `story-203-submission-form-prep`, rename YAML, allocate NEW number (suggest `story-207-x-thread-draft`) and author a stub. ⚠️ `story-204-dorahacks-submission` depends on `story-203-x-thread-draft`; repoint. |
| 32 | `story-204-dorahacks-submission` | `story-204-final-audit-pass.md` | SPLIT | File is the final pre-submission audit pass (security + anti-slop + claims-vs-reality). YAML's DoraHacks submission is the actual form-submit action. Both needed. Keep file as `story-204-final-audit-pass`, rename YAML, allocate NEW number (suggest `story-208-dorahacks-submission`) and author a stub. ⚠️ `story-205-live-demo-rehearsal` depends on `story-204-dorahacks-submission`; repoint. |
| 33 | `story-205-live-demo-rehearsal` | `story-205-sprint-status-ready-to-ship.md` | SPLIT | File is the sprint-status flip to READY-TO-SHIP + coverage report (the literal "we're done" gate). YAML's live-demo-rehearsal is the dress-rehearsal that should precede it. Both needed. Keep file as `story-205-sprint-status-ready-to-ship`, rename YAML, allocate NEW number for live-demo-rehearsal (suggest `story-209-live-demo-rehearsal`) and author a stub that DEPENDS on the new submission story. |

## Summary of dispositions

| Disposition | Count |
|---|---|
| RENAME (file → YAML) | 2 (rows 20, 28) |
| RENAME-INVERSE (YAML → file) | 15 (rows 1, 2, 6, 9, 10, 12, 13, 16, 17, 18, 19, 21, 22, 23, 24) |
| SPLIT (rename + author NEW story) | 15 (rows 3, 4, 5, 7, 8, 11, 14, 15, 25, 26, 27, 29, 31, 32, 33) |
| MERGE-CANDIDATE | 1 (row 30) |
| AUTHOR (no orphan match) | 0 |
| DROP (obsolete) | 0 |

(Recount: 2 RENAME + 15 RENAME-INVERSE + 15 SPLIT + 1 MERGE = 33. ✅)

## High-impact cascade warnings

The following downstream `depends_on` references will need repointing once the renames execute. Listed here so Abu can pre-approve the cascade in one pass:

- **Row 8** `story-115-emergency-stop-flow` is referenced by `story-193-mainnet-deploy-execution` (currently a phantom too).
- **Row 15** `story-153-skill-npm-publish` is referenced by `story-175-docs-skill-guide`, `story-200-readme-finalize`, `story-204-dorahacks-submission`.
- **Row 19** `story-172-docs-sdk-reference` is referenced by `story-177-docs-recipes`.
- **Row 25** `story-191-sepolia-faucet-page` is referenced by `story-202-demo-video-script-and-shoot`.
- **Row 26** `story-193-mainnet-deploy-execution` is referenced by `story-195-postdeploy-smoke-tests`.
- **Row 27** `story-194-mcp-server-deployment` is referenced by `story-195-postdeploy-smoke-tests`.
- **Row 30** `story-202-demo-video-script-and-shoot` is referenced by `story-203-x-thread-draft`, `story-204-dorahacks-submission`.
- **Row 31** `story-203-x-thread-draft` is referenced by `story-204-dorahacks-submission`.
- **Row 32** `story-204-dorahacks-submission` is referenced by `story-205-live-demo-rehearsal`.

## Already-clean tail (no action)

YAML entries previously renamed in-band per the 2026-06-13 fixup comments (already match file IDs) — confirmed clean:

- `story-130-mcp-server-bootstrap`, `story-136-mcp-stdio-publish`, `story-137-mcp-apps-ui-resources`, `story-138-mcp-elicitation`
- `story-150-skill-package-structure`, `story-151-skill-manifest-yaml`
- `story-190-mainnet-deploy-runbook`, `story-192-sepolia-playground-deploy`

All other YAML ids (Epics E0–E6 foundation/contracts/SDK/providers/smart-account/runtime/attestation) match story files 1-to-1 with no drift.

## Next step

Abu reviews this table row-by-row. Once dispositions are approved, a follow-up PR will:

1. Execute the renames (file renames for RENAME rows; YAML id swaps for RENAME-INVERSE rows).
2. Author stub story files for the 15 SPLIT rows at the new numbers listed.
3. Repoint the cascade `depends_on` references atomically.
4. Resolve the row-30 MERGE-CANDIDATE per Abu's call.

The 2026-06-09 spec-rework lesson (`feedback_audit_specs_upfront.md`) applies — execute as ONE coherent pass, not drip-fed.

Note on package scope: rationale columns reference the new `@mpilot/*` scope (per the in-flight rebrand from `@concierge/*`), since the reconciliation will land after the rebrand branch merges.
