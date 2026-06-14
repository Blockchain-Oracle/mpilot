# Epics — Concierge

**Hackathon:** Mantle Turing Test 2026 — AI Awakening (Phase 2)
**Status:** REWORKED 2026-06-09 — supersedes 2026-06-03 draft
**Total epics:** 16 (was 13; +3 from rework)
**Total stories (estimate):** ~110 (was ~95; +13 new + 4 amended)

---

## ⚠️ What changed in the 2026-06-09 rework — cross-reference

| Old understanding | New direction | Driving docs | Affected stories |
|---|---|---|---|
| MCP server is hosted-only Cloudflare Worker | **MCP stdio-first** (`npx -y @concierge-mantle/mcp`); hosted Worker is optional secondary | ADR-011 (amended), AUDIT §3 | story-130 (amended), story-133 (amended), story-136 (NEW), story-137 (NEW), story-138 (NEW) |
| Components live in `apps/web/components/`; designer picks framework | Components ship as **`@concierge-mantle/react`** (headless) + **`@concierge-mantle/react-ui`** (styled) npm packages; tool-ui adopted as DESIGN reference only | ADR-013 (amended), ADR-015 (NEW), SPEC-REWORK-BRIEF Thread 5 | story-310, 311, 312, 313, 314 (all NEW); ux-spec.md amended |
| `Vercel AI SDK 5.x` + Anthropic-only LLM | `ai 6.x` + `@ai-sdk/react 3.x`; **`model: LanguageModelV2`** with `defaultModel()` env auto-detect across 4 providers; tick worker stays Anthropic | ADR-016 (NEW), AUDIT §1, SDK-DX-STUDY §A-B | story-61 (amended), story-22 (amended), story-320 (NEW) |
| Tools defined per-runtime in each adapter | Single **`@concierge-mantle/tools`** framework-agnostic registry with `inputSchema` + `outputSchema` (load-bearing). Adapters (Vercel AI / OpenAI / LangChain / AgentKit / MCP) are 15-40 LOC each, wrap the same source | ADR-014 (NEW), CDR-Kit pattern, SDK-DX-STUDY §H | story-300, 301, 302, 303, 304 (all NEW) |
| Single rail for generative UI (tool cards in the web app) | **Three rails** on a structured-JSON `outputSchema` contract: Vercel AI SDK tool-parts (web) + MCP Apps `ui://` resources (Claude Desktop iframe) + MCP Elicitation (form + url modes for high-value confirms / wallet-connect) | ADR-017 (NEW), AUDIT §3, SEP-1865 merged 2026-01-28 | story-137 (NEW), story-138 (NEW) |
| Bun workspaces + dual ESM/CJS | **pnpm workspaces + pure ESM + Node ≥22 + tree-shakeable** for every published package; tsup for builds; peer deps for `ai` / `zod` / framework SDKs | ADR-018 (NEW), SDK-DX-STUDY §D | every new + amended story |
| Class hierarchy + Result<T, E> + goal-at-construction | **Factory functions** (`createConcierge`) + **typed error discriminator** (`ConciergeError` w/ `type`) + **AsyncIterable + `.on()`** events for streaming + `setGoal()` post-construction | ADR-019 (NEW), SDK-DX-STUDY §F-I | story-22 (amended), story-23 (DX-amended at impl time) |
| `@concierge-mantle/goat` + `@coinbase/agentkit-vercel-ai-sdk` dependencies | **DROPPED** — GOAT SDK 4-15 months stale; AgentKit framework extensions 15 months stale (use `customActionProvider` escape hatch) | AUDIT §5, §6 | n/a (removed from package list) |
| Tambo + Crayon as gen-UI candidates | **DROPPED** — model-driven, contradict "tool X always renders card X" contract | ADR-015, SPEC-REWORK-BRIEF Thread 5 | n/a |

**Reference docs driving the rework:**
- `research/concierge/SPEC-REWORK-BRIEF-2026-06-09.md` — synthesis of the 5 feedback threads + the architectural pivot to "composable primitive."
- `research/concierge/AUDIT-2026-06-09.md` — library + SDK version verification + API surface checks via Context7 + npm view + gh api.
- `research/concierge/SDK-DX-STUDY-2026-06-09.md` — 8-SDK comparison of dev-experience patterns; produced the DX-grounded ADRs 016-019.

---

## Epic overview (dependency order)

| Epic | Title | # Stories | Est. | Depends on |
|---|---|---|---|---|
| E0 | Foundation — monorepo (pnpm), CI, biome, Foundry init, husky, security workflow | 8 | ~6.5h | None |
| E1 | Smart Contracts — ConciergeRegistry + session-key validator + Sepolia mocks | 10 | ~15h | E0 |
| E2 | Shared SDK Core — `@concierge-mantle/sdk` skeleton, `@concierge-mantle/shared` | 5 | ~6h | E0 |
| E3 | Action Providers — 7 `@concierge-mantle/<provider>` packages | 14 | ~22h | E1, E2 |
| E4 | Smart Account Layer — ZeroDev Kernel + Pimlico + session keys + EOA fallback | 7 | ~10h | E2 |
| E5 | Agent Runtime — tick loop, six phases, Postgres + Redis + BullMQ | 11 | ~16h | E3, E4 |
| E6 | ERC-8004 Attestation Flow — IPFS pin, feedback hash, reputation read | 5 | ~7h | E3, E5 |
| E7 | Web App — landing, onboarding, dashboard, tick stream, goal-set, settings | 16 | ~22h | E4, E5, E6, E14 (dogfoods react-ui) |
| E8 | MCP Server — stdio-first + hosted Cloudflare Worker optional + Apps + Elicitation | 9 | ~13h | E2, E3, E5, **E13** |
| E9 | Agent Skill Packaging — `@concierge-mantle/skill`, SKILL.md, `npx skills add` install | 5 | ~6h | E2, E8 |
| E10 | Docs Site — Fumadocs, quickstart, SDK + provider + runtime + skill + MCP + recipes | 8 | ~10h | E2, E3, E5, E8, E9 |
| E11 | Mainnet Deployment + Sepolia Playground — `DeployAll.s.sol`, real Aave V3, MockAavePool + faucet | 6 | ~8h | E1, E5, E7, E8, E9 |
| E12 | Submission Polish — README, demo video, X thread, DoraHacks, architecture diagram | 6 | ~6h | All previous |
| **E13** | **Composable Primitive — `@concierge-mantle/tools` registry + 4 framework adapters + model-agnostic provider** | **6** | **~7h** | **E2, E3** |
| **E14** | **Composable UI — `@concierge-mantle/react` (headless) + `@concierge-mantle/react-ui` (styled) + 2 adapters + web dogfood** | **5** | **~10h** | **E13, E7 (scaffold)** |
| **E15** | **Distribution — `create-concierge-app` scaffolder with 5 templates** | **1** | **~2h** | **E13, E14** |

**Total estimate:** ~160h of coding-agent work (was ~141h; +19h for E13/14/15). Parallelizable across the orchestrator.

**Critical path note:** E13 (Composable Primitive) is the new DEPENDENCY ROOT for E8 (MCP rework) and E14 (Composable UI). Start E13 immediately after E3 (Action Providers) — it blocks the most other work.

---

## Epic E0 — Foundation

**Business value:** Without a clean monorepo + CI + lint + format + Foundry + pre-commit + security guards, every subsequent epic ships into chaos. This is the substrate. If E0 is broken, nothing else can be trusted.

**Dependencies:** None.

**Estimate:** ~6.5h.

**Stories:**
- `story-00-monorepo-scaffold` — pnpm workspaces, root `package.json`, `tsconfig.json`, basic folder structure (`apps/`, `packages/`, `contracts/`)
- `story-01-biome-and-loc-enforcement` — Biome config with `noExcessiveLinesPerFile { maxLines: 400 }` + `scripts/check-file-loc.mjs` (named exclude sets, no silent failures) + `scripts/test-check-file-loc.mjs` smoke test (mirrors cross-project pattern: every enforcement script gets a test)
- `story-02-typescript-config` — strict TS, project references across packages
- `story-03-foundry-init-and-remappings` — Foundry init, remappings (OZ v5, Aave V3 Origin, NO Chainlink), solc 0.8.26
- `story-04-ci-typescript-pipeline` — `.github/workflows/ci.yml` TS jobs (lint + typecheck + loc-cap + test matrix-per-package) with concurrency + timeouts + workflow_dispatch + explicit permissions
- `story-05-ci-contracts-pipeline` — `.github/workflows/ci.yml` Foundry job (forge build + test + coverage) + `contracts-security` (Slither + Aderyn, PR + nightly)
- `story-06-husky-precommit-hooks` — husky + lint-staged + commitlint + .gitleaks.toml. pre-commit (Biome + LOC + typecheck) + commit-msg (Conventional Commits) + pre-push (LOC smoke test)
- `story-07-security-workflow` — `.github/workflows/security.yml` with gitleaks-action + trivy fs-scan + osv-scanner + nightly cron at 03:00 UTC

---

## Epic E1 — Smart Contracts

**Business value:** On-chain layer for agent identity (goal/policy storage) + session-key gating + Sepolia mocks. The 20-Project Deployment Award requires verified Mantle Mainnet contracts; without these, no submission.

**Dependencies:** E0.

**Estimate:** ~15h.

**Stories:**
- `story-10-concierge-registry-base` — `ConciergeRegistry.sol` skeleton (goal/policy storage per agent, AccessControl, Pausable, ReentrancyGuard)
- `story-11-concierge-registry-tests-unit` — Foundry unit tests for ConciergeRegistry happy paths
- `story-12-concierge-registry-tests-fuzz` — Foundry fuzz tests (256+ runs)
- `story-13-concierge-registry-tests-invariant` — Foundry invariant test (goal/policy state machine integrity)
- `story-14-mock-aave-pool` — `MockAavePool.sol` for Sepolia playground (supply/borrow/repay/withdraw + E-Mode 1 mechanic)
- `story-15-mock-susde-usdc-usdy-meth` — `MockSUSDe.sol` + `MockUSDC.sol` + `MockUSDY.sol` + `MockMETH.sol` (ERC20 + faucet)
- `story-16-mock-aave-oracle` — `MockAaveOracle.sol` returning deterministic demo prices
- `story-17-helper-config` — `HelperConfig.s.sol` chain-id routing (5000 → real, 5003 → mocks)
- `story-18-deploy-script-sepolia` — `DeployAll.s.sol` deploys Sepolia mocks + ConciergeRegistry
- `story-19-deploy-script-mainnet-gated` — Mainnet variant of DeployAll with interactive `DEPLOY-MAINNET` gate

---

## Epic E2 — Shared SDK Core

**Business value:** All packages depend on `@concierge-mantle/shared` (addresses + ABIs + types) and `@concierge-mantle/sdk` skeleton. Without this, providers can't share an interface.

**Dependencies:** E0.

**Estimate:** ~6h.

**Stories:**
- `story-20-shared-package-bootstrap` — `packages/shared/` with `addresses.ts` (auto-generated from broadcast artifacts), `types.ts`, ABI re-exports
- `story-21-shared-abi-imports` — Import canonical ABIs (Aave V3 IPool from bgd-labs, ERC-8004 from erc-8004-contracts, viem chain config)
- `story-22-sdk-skeleton` — `packages/sdk/` skeleton: `Concierge` class signature, provider registration pattern, env validation (Zod)
- `story-23-sdk-error-types` — Typed error hierarchy (`AaveBorrowFailed`, `OraclePriceUnavailable`, `SessionKeyExpired`, etc.)
- `story-24-sdk-config-loader` — `loadConfig()` reads env, validates, returns typed config object

---

## Epic E3 — Action Providers

**Business value:** The 7 action providers ARE the agent's tool surface. Without them, the agent has nothing to call. Each provider is independently publishable so other Mantle devs can compose against single providers.

**Dependencies:** E1 (mocks for Sepolia tests), E2 (shared types + SDK skeleton).

**Estimate:** ~22h.

**Stories (2 per provider — implementation + tests — × 7 providers = 14):**

For each of {aave-v3-mantle, mantle-dex, ethena-susde, ondo-usdy, meth-staking, lifi-bridge, erc8004}:

- `story-3X-provider-{slug}-implementation` — Action provider with Zod-validated inputs, Vercel AI SDK `tool()` exports, viem-based execution
- `story-3X+1-provider-{slug}-tests` — Vitest with `createTestClient` against Mantle Sepolia fork; integration test for each exposed action

**Stories:**
- `story-30-aave-v3-mantle-provider` + `story-31-aave-v3-mantle-tests`
- `story-32-mantle-dex-provider` + `story-33-mantle-dex-tests`
- `story-34-ethena-susde-provider` + `story-35-ethena-susde-tests`
- `story-36-ondo-usdy-provider` + `story-37-ondo-usdy-tests` (read-only v1 per KYC restrictions)
- `story-38-meth-staking-provider` + `story-39-meth-staking-tests`
- `story-40-lifi-bridge-provider` + `story-41-lifi-bridge-tests`
- `story-42-erc8004-provider` + `story-43-erc8004-tests`

---

## Epic E4 — Smart Account Layer

**Business value:** Without ERC-4337 + session keys, the agent can't operate autonomously between user approvals. EOA fallback ensures the tick loop ships even if Day-1 spike fails.

**Dependencies:** E2.

**Estimate:** ~10h.

**Stories:**
- `story-50-zerodev-sdk-bootstrap` — ZeroDev Kernel v3.1 client wired up, `createKernelAccount` + `createKernelClient` patterns
- `story-51-pimlico-bundler-client` — `permissionless` library wired to Pimlico Mantle endpoint, paymaster sponsorship
- `story-52-session-key-policies` — `toCallPolicy` + `toTimestampPolicy` + `toSpendingLimitPolicy` per-category scoping
- `story-53-session-key-issuance-flow` — Generate session key, sign with master, store in Postgres, expose via API
- `story-54-session-key-revocation-flow` — Revoke session key, halt cron, surface to UI (Emergency Stop)
- `story-55-eoa-fallback-queue` — Postgres-backed signed-tx queue + worker for EOA fallback path
- `story-56-smart-account-tests` — Vitest against Sepolia: deploy account, grant session key, execute test tx, revoke

---

## Epic E5 — Agent Runtime

**Business value:** The agent IS the product. Without the tick loop + six-phase orchestration + state persistence, there is no Concierge.

**Dependencies:** E3 (providers), E4 (smart account).

**Estimate:** ~16h.

**Stories:**
- `story-60-anthropic-sdk-bootstrap` — `@anthropic-ai/sdk` + `@anthropic-ai/claude-agent-sdk` clients, prompt caching, model routing (Sonnet/Opus/Haiku)
- `story-61-vercel-ai-sdk-chat-api` — `/api/chat` POST handler with `streamText`, `tool()` registrations, Zod schemas
- `story-62-tick-loop-orchestrator` — `tick(agentId)` function: Redis NX lock, six-phase orchestration, return type
- `story-63-tick-phase-plan` — `plan()` phase: LLM call with phase-scoped toolset (read-only), returns `Plan { intent, hypothesis }`
- `story-64-tick-phase-simulate` — `simulate()` phase: dry-run via `eth_call`, returns `Sim { ok, gasUsed, deltaState }`
- `story-65-tick-phase-propose` — `propose()` phase: creates `proposals` row, awaits approval OR auto-approves per policy
- `story-66-tick-phase-execute` — `execute()` phase: signs UserOp via session key, sends via Pimlico, captures tx hash
- `story-67-tick-phase-record` — `record()` phase: writes Postgres `executions` row, fires ERC-8004 attestation (E6)
- `story-68-bullmq-cron-worker` — BullMQ repeatable job per agent, worker process on Fly.io
- `story-69-postgres-drizzle-schemas` — Drizzle schemas: agents, ticks, proposals, executions, attestations
- `story-70-runtime-integration-tests` — End-to-end test: agent ticks once on Sepolia, all 6 phases observable

---

## Epic E6 — ERC-8004 Attestation Flow

**Business value:** Verifiability is the wedge claim. Without ERC-8004 attestation per tick, the agent has no on-chain track record — the entire "Mantle Ecosystem Contribution" + "Innovation" scoring premise breaks.

**Dependencies:** E3 (erc8004 provider), E5 (record phase).

**Estimate:** ~7h.

**Stories:**
- `story-80-feedback-uri-schema` — JSON schema for the off-chain feedback content (reasoning, tx hash, before/after snapshot)
- `story-81-ipfs-pinning-pinata` — Upload feedback JSON to Pinata + web3.storage (dual-pin)
- `story-82-feedback-hash-compute` — Canonical hash of feedback content for on-chain `feedbackHash`
- `story-83-attestation-write-pipeline` — Wire `record()` phase to fire `giveFeedback` via the erc8004 provider
- `story-84-reputation-read-sdk` — `readReputation(agentId)` SDK helper + public `/agent/:id` page data loader

---

## Epic E7 — Web App

**Business value:** The user-facing surface. Where judges land. Where the demo happens. Where Community Voting + Best UI/UX prizes are won.

**Dependencies:** E4 (smart account), E5 (tick loop), E6 (attestation), **designer agent's `@concierge-mantle/ui@1.0.0` published**.

**Estimate:** ~22h.

**Stories:**
- `story-100-next-app-scaffold` — Next.js 15 App Router skeleton, Tailwind, `@concierge-mantle/ui` import, routing
- `story-101-landing-hero` — `/` page hero with embedded live tick demo
- `story-102-landing-how-it-works` — 3-step explainer with live-rate API integration
- `story-103-landing-klarna-comparison` — Live spread comparison block
- `story-104-landing-developer-cta` — SDK install snippet + code example
- `story-105-landing-trust-signals` — Verified addresses + protocol logo grid
- `story-106-onboarding-flow` — 6-step onboarding (connect → account → identity → goal → policy → activate)
- `story-107-app-dashboard` — `/app` dashboard with tick stream + portfolio + active goal + emergency stop
- `story-108-tick-card-component` — `<TickCard>` with all 13 states + streaming reasoning + nested cards
- `story-109-goal-set-screen` — `/app/goal` with plain-English input + chip extraction + autopilot toggles
- `story-110-tick-history-list` — `/app/ticks` paginated list with filters
- `story-111-tick-detail-page` — `/app/ticks/:tickId` full detail
- `story-112-portfolio-page` — `/app/portfolio` with positions + health-factor gauge
- `story-113-agent-reputation-page` — `/app/agent` + public `/agent/:id` reputation viewer
- `story-114-settings-page` — `/app/settings` with network, model, API keys, MCP install
- `story-115-emergency-stop-flow` — Persistent button + confirmation modal + revocation wire

---

## Epic E8 — MCP Server

**Business value:** The strategic distribution moat — Concierge is callable from Claude Code / Claude Desktop / OpenClaw / RealClaw without us shipping additional UI. Free reach into the judge audience.

**Dependencies:** E2 (SDK), E3 (providers), E5 (runtime).

**Estimate:** ~8h.

**Stories:**
- `story-130-cloudflare-worker-bootstrap` — `apps/mcp/` Worker + `wrangler.toml` + Hono router
- `story-131-mcp-server-setup` — `@modelcontextprotocol/sdk` `McpServer` with Streamable HTTP transport
- `story-132-mcp-tool-registrations` — Register all 7 provider actions as MCP tools (plus `tickNow`, `getPortfolio`, `getReputation`, `activate`, `deactivate`, `setGoal`)
- `story-133-mcp-bearer-auth` — Bearer token v0 authentication, session bound to `agentId`
- `story-134-mcp-redis-session-store` — Upstash Redis-backed session persistence
- `story-135-mcp-claude-code-integration-test` — E2E test driving Concierge from Claude Code via MCP

---

## Epic E9 — RealClaw Skill Packaging

**Business value:** Track 6 qualifier. Without this, no Agentic Economy track. Pattern verified via `byreal-git/byreal-agent-skills` (the canonical Byreal-shipped skill).

**Dependencies:** E2 (SDK), E8 (MCP).

**Estimate:** ~6h.

**Stories:**
- `story-150-skill-manifest` — `packages/skill/SKILL.md` with frontmatter mirroring `byreal-git/byreal-agent-skills`
- `story-151-skill-cli-bootstrap` — TypeScript Commander CLI exposing all 7 provider actions + tick controls
- `story-152-skill-json-output-contract` — `-o json` JSON output format per Byreal convention for LLM consumption
- `story-153-skill-npm-publish` — Publish `@concierge-mantle/mantle-agent` to npm; verify `npx skills add @concierge-mantle/mantle-agent` installs cleanly
- `story-154-skill-distribution-prs` — PRs to `VoltAgent/awesome-openclaw-skills` + `LeoYeAI/openclaw-master-skills` (post-launch)

---

## Epic E10 — Docs Site

**Business value:** Other Mantle developers `npm install @concierge-mantle/sdk` and ship their own agent. Docs convert builders into users. Critical for the "AgentKit for Mantle" positioning + Mantle Ecosystem Contribution score.

**Dependencies:** E2 (SDK), E3 (providers), E5 (runtime), E8 (MCP), E9 (skill).

**Estimate:** ~10h.

**Stories:**
- `story-170-docs-framework-bootstrap` — Fumadocs (or equivalent) at `/docs/*`, same Next.js project
- `story-171-docs-quickstart` — `git clone` to first running agent in ≤ 10 min
- `story-172-docs-sdk-reference` — `@concierge-mantle/sdk` API reference (auto-generated from JSDoc + manual)
- `story-173-docs-providers-reference` — Per-provider docs mirroring `research/concierge/03-providers/*.md`
- `story-174-docs-runtime-concepts` — Tick loop, session keys, attestation explained
- `story-175-docs-skill-guide` — `npx skills add` install + customization
- `story-176-docs-mcp-guide` — MCP server setup + Claude Code config
- `story-177-docs-recipes` — Copy-paste examples (yield optimizer, depeg-resistant treasury, autopay)

---

## Epic E11 — Mainnet Deployment + Sepolia Playground

**Business value:** Mainnet deploy is a hard submission requirement. Sepolia playground enables zero-capital judge interaction. Both are required for the 20-Project Deployment Award + Community Voting.

**Dependencies:** E1, E5, E7, E8, E9.

**Estimate:** ~8h.

**Stories:**
- `story-190-sepolia-mock-deploy` — Deploy `MockAavePool` + mocks + `ConciergeRegistry` to Mantle Sepolia, write addresses to `@concierge-mantle/shared`
- `story-191-sepolia-faucet-page` — `/app/faucet` page that mints mock sUSDe + USDC + USDY + mETH to connected wallet
- `story-192-mainnet-deploy-runbook` — `DEPLOY-MAINNET-RUNBOOK.md` + interactive `deploy-mainnet.sh` wrapper
- `story-193-mainnet-deploy-execution` — Actual Mainnet deploy (one-off — runbook executed): `ConciergeRegistry` + session-key validator deployed + verified on MantleScan
- `story-194-mcp-server-deployment` — Deploy MCP server to Cloudflare Workers, configure domain `mcp.concierge.xyz`
- `story-195-postdeploy-smoke-tests` — Smoke test against Mainnet deployments: read-only verifications, addresses.ts populated

---

## Epic E12 — Submission Polish

**Business value:** Judges read README before they demo. Demo video is the asset that travels. X thread is Community Voting's lifeline. This epic is a direct scoring lever.

**Dependencies:** All previous.

**Estimate:** ~6h.

**Stories:**
- `story-200-readme-finalize` — Title + pitch + demo URL + GIF + run-locally + contracts table + MCP install + SDK quickstart + license + architecture diagram + submission metadata
- `story-201-architecture-diagram-export` — `docs/architecture-diagram.{excalidraw,svg,png}` exported, embedded in README
- `story-202-demo-video-script-and-shoot` — `docs/demo-video/script.md` + recorded `patron-demo-tight-90s.mp4` (≤ 140MB, ≤ 2:20, h264)
- `story-203-x-thread-draft` — `docs/x-thread/draft.md` tagged `#MantleAIHackathon` + native video reference + verified addresses
- `story-204-dorahacks-submission` — Form filled with tracks + Byreal answer + URLs + addresses; submit
- `story-205-live-demo-rehearsal` — Rehearsal log + backup video recorded + presentation device validated

---

## Implementation order (for orchestrator)

The orchestrator dispatches stories in this order, respecting dependencies. **Designer agent runs in parallel from the start; coding-agent UI stories (E7) wait for `@concierge-mantle/ui@1.0.0` to publish.**

```yaml
dispatch_queue:
  # Wave 1: Foundation (parallel)
  - story-00-monorepo-scaffold
  - story-01-biome-and-loc-enforcement
  - story-02-typescript-config
  - story-03-foundry-init-and-remappings
  - story-04-ci-typescript-pipeline
  - story-05-ci-contracts-pipeline
  - story-06-husky-precommit-hooks       # depends on 01 + 02
  - story-07-security-workflow           # depends on 04 + 06

  # Wave 2: Smart Contracts + Shared SDK (parallel after E0)
  - story-10-concierge-registry-base
  - story-20-shared-package-bootstrap
  - story-21-shared-abi-imports
  - story-22-sdk-skeleton
  - story-23-sdk-error-types
  - story-24-sdk-config-loader
  - story-11-concierge-registry-tests-unit
  - story-12-concierge-registry-tests-fuzz
  - story-13-concierge-registry-tests-invariant
  - story-14-mock-aave-pool
  - story-15-mock-susde-usdc-usdy-meth
  - story-16-mock-aave-oracle
  - story-17-helper-config
  - story-18-deploy-script-sepolia
  - story-19-deploy-script-mainnet-gated

  # Wave 3: Providers + Smart Account (parallel after E1 + E2)
  - story-30-aave-v3-mantle-provider
  - story-31-aave-v3-mantle-tests
  - story-32-mantle-dex-provider
  - story-33-mantle-dex-tests
  - story-34-ethena-susde-provider
  - story-35-ethena-susde-tests
  - story-36-ondo-usdy-provider
  - story-37-ondo-usdy-tests
  - story-38-meth-staking-provider
  - story-39-meth-staking-tests
  - story-40-lifi-bridge-provider
  - story-41-lifi-bridge-tests
  - story-42-erc8004-provider
  - story-43-erc8004-tests
  - story-50-zerodev-sdk-bootstrap
  - story-51-pimlico-bundler-client
  - story-52-session-key-policies
  - story-53-session-key-issuance-flow
  - story-54-session-key-revocation-flow
  - story-55-eoa-fallback-queue
  - story-56-smart-account-tests

  # Wave 4: Runtime + Attestation (after E3 + E4)
  - story-60-anthropic-sdk-bootstrap
  - story-61-vercel-ai-sdk-chat-api
  - story-62-tick-loop-orchestrator
  - story-63-tick-phase-plan
  - story-64-tick-phase-simulate
  - story-65-tick-phase-propose
  - story-66-tick-phase-execute
  - story-67-tick-phase-record
  - story-68-bullmq-cron-worker
  - story-69-postgres-drizzle-schemas
  - story-70-runtime-integration-tests
  - story-80-feedback-uri-schema
  - story-81-ipfs-pinning-pinata
  - story-82-feedback-hash-compute
  - story-83-attestation-write-pipeline
  - story-84-reputation-read-sdk

  # Wave 5: Distribution (parallel)
  - story-130-cloudflare-worker-bootstrap
  - story-131-mcp-server-setup
  - story-132-mcp-tool-registrations
  - story-133-mcp-bearer-auth
  - story-134-mcp-redis-session-store
  - story-135-mcp-claude-code-integration-test
  - story-150-skill-manifest
  - story-151-skill-cli-bootstrap
  - story-152-skill-json-output-contract
  - story-153-skill-npm-publish

  # Wave 6: Web App (BLOCKED until @concierge-mantle/ui@1.0.0 ships from designer)
  - story-100-next-app-scaffold
  - story-101-landing-hero
  - story-102-landing-how-it-works
  - story-103-landing-klarna-comparison
  - story-104-landing-developer-cta
  - story-105-landing-trust-signals
  - story-106-onboarding-flow
  - story-107-app-dashboard
  - story-108-tick-card-component
  - story-109-goal-set-screen
  - story-110-tick-history-list
  - story-111-tick-detail-page
  - story-112-portfolio-page
  - story-113-agent-reputation-page
  - story-114-settings-page
  - story-115-emergency-stop-flow

  # Wave 7: Docs (after most epics)
  - story-170-docs-framework-bootstrap
  - story-171-docs-quickstart
  - story-172-docs-sdk-reference
  - story-173-docs-providers-reference
  - story-174-docs-runtime-concepts
  - story-175-docs-skill-guide
  - story-176-docs-mcp-guide
  - story-177-docs-recipes

  # Wave 8: Deployment
  - story-190-sepolia-mock-deploy
  - story-191-sepolia-faucet-page
  - story-192-mainnet-deploy-runbook
  - story-193-mainnet-deploy-execution
  - story-194-mcp-server-deployment
  - story-195-postdeploy-smoke-tests

  # Wave 9: Submission
  - story-200-readme-finalize
  - story-201-architecture-diagram-export
  - story-202-demo-video-script-and-shoot
  - story-203-x-thread-draft
  - story-204-dorahacks-submission
  - story-205-live-demo-rehearsal
  - story-154-skill-distribution-prs
```

---

## Critical path

The longest dependency chain (gates submission):

```
E0 → E1 → E5 → E6 → E11 → E12
(Foundation → Contracts → Runtime → Attestation → Deployment → Submission)
```

Designer agent runs in parallel from the start. UI stories (E7) gate on `@concierge-mantle/ui@1.0.0`, but every non-UI surface (contracts, SDK, providers, runtime, MCP, skill, docs) is unblocked from Wave 2 onwards.

---

## Epic E13 — Composable Primitive (NEW 2026-06-09)

**Business value:** Concierge becomes a **composable primitive** — the single `@concierge-mantle/tools` registry feeds 4 framework adapters (Vercel AI SDK / OpenAI/Anthropic raw / LangChain / Coinbase AgentKit) + the MCP server. Any developer can `pnpm add @concierge-mantle/<adapter>` and drop our 30+ DeFi actions into their existing agent stack in 5 lines. This is the LARGEST single-cost-multiplier win: ~30-40 LOC per adapter × N runtimes = N distribution channels with marginal cost.

**Dependencies:** E2 (`@concierge-mantle/sdk` skeleton — amended), E3 (action providers expose `tools()` functions).

**Estimate:** ~7h.

**Stories:**
- `story-300-tools-registry` — `@concierge-mantle/tools` framework-agnostic registry. `ConciergeTool<TIn, TOut>` interface with `inputSchema` + `outputSchema` (Zod, both mandatory) + `uiCardId`. `tool()` helper. `createConciergeTools(agent)` aggregator. Per-tool `SerializableConciergeXxxSchema` exports. (Reference: CDR-Kit's `@cdr-kit/tools` shape, code-verified per SDK-DX-STUDY §H.)
- `story-301-vercel-ai-adapter` — `@concierge-mantle/vercel-ai` → AI SDK v6 `ToolSet` (~15 LOC wrapper around `aiTool()`)
- `story-302-langchain-adapter` — `@concierge-mantle/langchain` → `@langchain/core/tools` `StructuredToolInterface[]` (~10 LOC)
- `story-303-openai-adapter` — `@concierge-mantle/openai` → direct Chat Completions `tools: [{ type: 'function', function: { name, description, parameters } }]` + dispatch. Covers Anthropic raw tool-use too (same JSON Schema). NO `@openai/agents` dep.
- `story-304-agentkit-adapter` — `@concierge-mantle/agentkit` → Coinbase AgentKit `customActionProvider` (escape hatch — NOT `@CreateAction` decorator) (~12 LOC)
- `story-320-model-agnostic-provider` — `@concierge-mantle/sdk` accepts `model: LanguageModelV2` directly. `defaultModel()` helper auto-detects `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` / `XAI_API_KEY` with `AI_MODEL="provider:model"` override. Per-call model override per tick phase.

**Acceptance criteria for the epic as a whole:** `pnpm add @concierge-mantle/langchain` in an external LangChain app + `getLangChainTools(agent)` returns ≥30 working Concierge tools. Same for Vercel AI SDK + OpenAI + AgentKit. End-to-end demo: a third-party LangChain agent supplies a USDC via Concierge tools, signed by the user's session key.

---

## Epic E14 — Composable UI (NEW 2026-06-09)

**Business value:** Concierge cards (proposal, tick, portfolio, reputation) ship as TWO npm packages — `@concierge-mantle/react` (headless: behavior + ARIA + state machines + parse-then-render) and `@concierge-mantle/react-ui` (styled drop-ins built on Radix + shadcn + brand tokens). The web app at `concierge.xyz/app` DOGFOODS the package (per ADR-015) — no duplicate components. External devs can `pnpm add @concierge-mantle/react-ui` and embed Concierge cards in THEIR dashboard / chat. Two thin adapter packages (`@concierge-mantle/react-assistant-ui`, `@concierge-mantle/react-copilotkit`) bridge to assistant-ui and CopilotKit — which transitively covers LangGraph / CrewAI / Mastra / Pydantic AI / AutoGen2 / MS Agent Framework users.

**Dependencies:** E13 (`@concierge-mantle/tools` for schemas), E7 (Next.js + Tailwind scaffold).

**Estimate:** ~10h.

**Stories:**
- `story-310-react-headless` — `@concierge-mantle/react`: `<ProposalPart>`, `<TickPart>`, `<PortfolioPart>`, `<ReputationPart>` taking typed `tool-${name}` parts as props + hooks (`useTickStream`, `useProposal`, `useReputation`) + `<ConciergeProvider>`. ARIA, keyboard nav, state machines. Zero CSS. Render-prop API for consumer's custom visual layer.
- `story-311-react-ui-styled` — `@concierge-mantle/react-ui`: `<TickCard>`, `<ProposalCard>`, `<PortfolioCard>`, `<ReputationChart>`, `<EmergencyStop>`, `<GoalInput>`, `<MCPInstallSnippet>`, `<SimulationCard>`, `<TxConfirmationCard>`, `<AttestationCard>`, `<StatusPill>`. Tool-UI patterns as DESIGN REFERENCE only (not dep). 12-state TickCard lifecycle per `08-ux-component-intent.md`. Storybook with ≥12 stories. Axe-core a11y check.
- `story-312-web-dogfood-react-ui` — Rewrite `apps/web/app/app/*` pages to consume `@concierge-mantle/react-ui` directly. Delete `apps/web/components/{TickCard,ProposalCard,PortfolioCard,...}.tsx`. NET LOC decreases in apps/web/.
- `story-313-react-assistant-ui` — `@concierge-mantle/react-assistant-ui`: `getConciergeToolkit()` returns assistant-ui `defineToolkit({ proposeAction: { type: 'backend', render: ProposalPart }, ... })`. Covers assistant-ui + LangGraph + LangChain users transitively. ~15 LOC.
- `story-314-react-copilotkit` — `@concierge-mantle/react-copilotkit`: `useConciergeActions()` hook calling `useCopilotAction` (or `useFrontendTool` v2, pinned at impl time). Covers AG-UI Protocol users transitively: LangGraph + CrewAI + Mastra + Pydantic AI + AutoGen2 + MS Agent Framework. ~30 LOC.

**Acceptance criteria for the epic as a whole:** `pnpm add @concierge-mantle/react-ui` in an external Next.js app + render `<TickStream agentId="agt_..." />` shows live ticks. `apps/web/components/` is empty (everything moved to packages). axe-core: 0 critical violations across all cards. Storybook builds with 12+ stories.

---

## Epic E15 — Distribution (NEW 2026-06-09)

**Business value:** `npm create concierge-app@latest` with 5 templates (starter / vercel-ai-agent / langchain-agent / mcp-only / react-embed) — a Mantle developer goes from zero to running Concierge integration in 30 seconds. Reduces adoption friction from "read 5 packages' READMEs" to "answer 2 prompts."

**Dependencies:** E13, E14 (all framework adapters + react packages publishable so templates can reference them).

**Estimate:** ~2h.

**Stories:**
- `story-330-scaffolder` — `packages/create-concierge-app/` with `@clack/prompts` CLI + 5 templates. Each template ships `package.json` w/ pinned `@concierge-mantle/*` deps + `.env.example` + working `pnpm dev` from clone-to-running in < 5 minutes. Pattern reference: CDR-Kit's `create-cdr-kit-app` with 9 templates.

**Acceptance criteria for the epic as a whole:** `npm create concierge-app@latest my-app --template vercel-ai-agent` followed by `cd my-app && pnpm install && pnpm dev` opens a working chat at localhost:3000 with live Concierge tools rendered as cards. All 5 templates demonstrated working end-to-end.

---

*Rework epics tracked in `sprint-status.yaml` under their respective IDs. The dependency root is `story-300-tools-registry` — start there.*
