# Concierge — Agent Operating Manual

Autonomous AI agent for Mantle DeFi, shipped as a **composable primitive** — a core (`@concierge-mantle/tools` + `@concierge-mantle/agent` + `@concierge-mantle/sdk`) consumable from any agent runtime (Vercel AI SDK / OpenAI / LangChain / Coinbase AgentKit / MCP), distributed across **four surfaces**: web app + MCP server (stdio-first) + Agent Skill + npm SDK. 15 packages total. The user sets a plain-English goal; the agent runs `plan → simulate → propose → execute → record` across 7 Mantle protocols (Aave V3, Mantle DEXes, Ethena sUSDe, Ondo USDY, mETH staking, Li.Fi bridging, ERC-8004) with reputation attested per tick. Spec set in `docs/` (19 ADRs, 16 epics, ~110 stories). Verified domain knowledge in `research/concierge/`.

## Non-negotiables

1. **Quality > deadline.** AI coding ships the *right thing*, not corners cut. **No mocks in the hot path. No half-built features.** Per Abu 2026-06-03.
2. **Research before building.** Library APIs drift; specs can be wrong. Verify before implementing:
   - **Context7 MCP FIRST for ANY SDK/library — before the first line of code.** Per `feedback_context7_before_library_code.md` — burned this on story-61 chat handler (shipped `abortSignal` + `consumeSseStream` missing because I went from memory, not docs). Concrete pre-story checklist (PASTE INTO PR DESCRIPTION so it's auditable):
     - [ ] Ran `mcp__plugin_context7_context7__resolve-library-id` for each library the story touches
     - [ ] Ran `query-docs` for the canonical pattern of the API surface I'm about to write
     - [ ] Inspected actual exports in the pinned version via `node --input-type=module -e "import * as lib from '...'; for (const k of [...]) console.log(k, typeof lib[k])"`
     - [ ] Noted any deprecations / version skew in the PR description
   - **`cast call` against `https://rpc.mantle.xyz`** before trusting an on-chain claim.
   - **`gh api` + WebFetch** for fresh GitHub state, official docs, library source.
   - When you discover a contradiction between an older spec and `AUDIT-2026-06-09.md` / `SDK-DX-STUDY-2026-06-09.md` — **trust the audit; the audit supersedes.** Patch `research/concierge/AUDIT-<date>.md` when you learn something the next story will hit.
3. **Plan mode + read every relevant spec BEFORE writing or patching.** Don't drip-feed changes. One coherent pass. (Per `feedback_audit_specs_upfront.md` — burned this lesson on 2026-06-09.)
4. **Test first.** BDD acceptance criteria in the story → runnable failing tests → implementation. Stay strictly inside the story's file modification map.
5. **One story = one branch.** Sub-agents are *research assistants*, not parallel implementers.
6. **≤400 LOC per file** (Biome `noExcessiveLinesPerFile` + `scripts/check-file-loc.mjs`). Split before 350.

## How to work

1. **Pick the next PENDING story** from `docs/sprint-status.yaml` whose `depends_on` are all `COMPLETE`. **Execution root is `story-00-monorepo-scaffold`** (sprint-status.yaml's only zero-deps story). **Architectural keystone is `story-300-tools-registry`** — the framework-agnostic tool registry that all adapters + UIs hang off (ADR-014). Foundation arc (stories 00–07) lands before story-300 can exist.
2. **Read the story file end-to-end.** Check for `⚠️ 2026-06-09 UPDATE` banners; those supersede the body.
3. **Read referenced ADRs** in `docs/architecture.md` (19 ADRs; especially 011 amended + 014-019 from the rework).
4. **Branch:** `git checkout -b story/<slug>`.
5. **Tests first** → vitest / forge test / playwright.
6. **Implement** until tests pass. Stay within the file modification map.
7. **Local gates:** `pnpm run check && pnpm run typecheck && pnpm run test` + `cd contracts && forge test` for contract stories.
8. **Conventional commit + PR:** `gh pr create --fill`.
9. **Run `pr-review-toolkit:review-pr`** immediately. Address blockers; reject noise with rationale.
10. **Merge:** `gh pr merge --squash --delete-branch` once CI green AND review acceptable.
11. **Update `sprint-status.yaml` on `main`** — flip story to `COMPLETE`, set `merged_at` + `pr_url`. Next story.

## Autonomy

Decide and act. Escalate to Abu ONLY when:
- (a) PR review surfaces a BLOCKER requiring project-level judgment
- (b) A story spec genuinely contradicts `research/concierge/` (audit/study docs win — but flag the contradiction)
- (c) A hot-path mock would be required to ship — **forbidden**, re-research
- (d) An ADR (especially 002 / 003 / 004 / 008 / 010 / **011 / 014 / 015 / 016 / 017 / 018 / 019**) would need amendment

## Load-bearing gotchas (verified 2026-06-04 + 2026-06-09 — full detail in `research/concierge/AUDIT-*.md`)

- **Aave E-Mode 1 silent-fail trap.** sUSDe LTV in general mode = 0. `Pool.borrow()` returns 0 *silently* without E-Mode 1. ALWAYS `setUserEMode(1)` before first sUSDe-backed borrow.
- **NO direct Chainlink on Mantle for sUSDe/USDC.** Use `IAaveOracle.getAssetPrice(asset)` from `0x47a063CfDa980532267970d478EC340C0F80E8df` per ADR-008. Foundry remappings exclude Chainlink intentionally.
- **ERC-8004 canonical addresses on Mantle Mainnet** (verified 2026-06-04): Identity `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`, Reputation `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`. Fetch ABIs via `gh api erc-8004/erc-8004-contracts` — never type from memory.
- **ZeroDev + Pimlico routing.** ZeroDev SDK for account + permissions; route bundler/paymaster through Pimlico (`https://api.pimlico.io/v2/mantle/rpc?apikey=...`) per ADR-010. Pimlico Mantle support verified.
- **Aave V3 is NOT on Mantle Sepolia.** Use `HelperConfig.s.sol` chain-id routing (5000 → real, 5003 → mocks) + the Patron `MockAavePool` pattern.
- **MCP transport is stdio-first** per ADR-011 amended. `claude mcp add concierge -- npx -y @concierge-mantle/mcp` is the README default. Cloudflare Worker is the OPTIONAL hosted variant (`mcp.concierge.xyz/mcp`) — same `packages/mcp/` core, different transport. Stdout in stdio bin is RESERVED for MCP — all logs to stderr.
- **Every `ConciergeTool` requires BOTH `inputSchema` AND `outputSchema`** (Zod) per ADR-014. `outputSchema` is load-bearing for MCP `structuredContent` + Vercel AI SDK `InferUITools` + `<XxxCard part={p}>` parse-then-render. Bare `unknown` for tool inputs is BANNED.
- **Model-agnostic via `LanguageModelV2`** per ADR-016. `@concierge-mantle/sdk` accepts `model: LanguageModelV2` directly; `defaultModel()` helper does env auto-detect (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` / `XAI_API_KEY`) + `AI_MODEL="provider:model"` override. **Per-call model override per tick phase** (NOT sub-clients). Tick worker `apps/worker/` stays Anthropic-only (Claude Agent SDK) — internal.
- **AgentKit uses `customActionProvider` escape hatch**, NOT `@CreateAction` decorator. No `reflect-metadata`. No `experimentalDecorators`. Per ADR-014.
- **Pure ESM, Node ≥ 22, no CJS dual** per ADR-018. Every package: `"type": "module"`, `"sideEffects": false`, `tsup` build, peer deps for `ai` / `@ai-sdk/provider` / `zod` / framework SDKs / `react`. Handcrafted `.d.ts` BANNED.
- **Three-rail generative UI** per ADR-017 on the structured-JSON `outputSchema` contract: Vercel AI SDK `tool-${name}` parts (web) + MCP Apps `ui://` HTML resources (Claude Desktop iframe — SEP-1865) + MCP Elicitation (`mode: 'form'` for high-value confirms + `mode: 'url'` for wallet-connect handoff). Tambo / Crayon BANNED (model-driven, contradict per-tool card contract).
- **Stale adapter deps BANNED.** `@coinbase/agentkit-vercel-ai-sdk` (15mo stale), `@goat-sdk/*` (4-15mo stale), `@openai/agents` (15mo stale). Write ~30-LOC adapter from `@concierge-mantle/tools` to the framework's core.
- **ERC-8004 attestation per successful tick IS the verifiability claim** (ADR-004 — replaces zkML). Every Mainnet `execute()` MUST be followed by `record()` writing `giveFeedback`.
- **One source of truth for addresses: `@concierge-mantle/shared/addresses.ts`.** Runtime reads from shared; tests assert against shared.

## Where things are

- `docs/` — PRD / architecture (**19 ADRs**) / ux-spec / epics (**16, 110 stories**) / sprint-status / stories. Orchestrator's source of truth.
- `research/concierge/` — domain knowledge. `CONTEXT.md` is the entry. Audits: `AUDIT-2026-06-04.md` (on-chain addresses), `AUDIT-2026-06-09.md` (library versions + APIs), `SDK-DX-STUDY-2026-06-09.md` (DX patterns), `SPEC-REWORK-BRIEF-2026-06-09.md` (synthesis).
- `archive/patron-2026-06-02/` — predecessor wedge. Reusable Mantle facts + MockAavePool pattern.
- `apps/` — `web/` (Next.js — dogfoods `@concierge-mantle/react-ui`) + `mcp/` (Cloudflare Worker wrapper) + `worker/` (BullMQ tick worker, Fly.io).
- `packages/` — **15 packages**. Foundation: `shared` + `agent` + `tools` + 7 providers. Adapters: `vercel-ai` + `openai` + `langchain` + `agentkit` + `mcp` (stdio-first). UI: `react` + `react-ui` (+ optional `react-assistant-ui` / `react-copilotkit`). Plus `ui` (brand tokens) + `skill` + `sdk` (meta).
- `contracts/` — Foundry. `ConciergeRegistry` + session-key validator + Sepolia mocks. `script/DeployAll.s.sol`.

## Memory

Project memory auto-loads from `~/.claude/projects/-Users-abu-dev-hackathon-mantel/memory/MEMORY.md`. Don't bloat — only persist (a) Abu's preferences, (b) cross-session project state, (c) external system pointers. Active feedback: `feedback_no_deadline_pressure.md`, `feedback_plan_full_dont_prioritize.md`, `feedback_spec_mode_active.md`, `feedback_audits_can_be_wrong.md`, `feedback_multi_surface_package_layout.md`, **`feedback_audit_specs_upfront.md` (Plan mode + read every spec BEFORE writing/patching — the 2026-06-09 lesson).**
