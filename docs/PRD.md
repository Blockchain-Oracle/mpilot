# PRD — mPilot

**Hackathon:** Mantle Turing Test 2026 — AI Awakening (Phase 2)
**Track:** Agentic Economy (Byreal-sponsored) primary · Grand Champion · Best UI/UX · Community Voting · 20-Project Deployment Award (stacked)
**Submission window:** 2026-06-15 15:59 UTC (factually noted; build is quality-driven per Abu's pacing — not deadline-driven)
**Status:** REWORKED 2026-06-09 — supersedes 2026-06-03 draft per `research/concierge/SPEC-REWORK-BRIEF-2026-06-09.md` + `AUDIT-2026-06-09.md`
**Approved by Abu:** [ ] pending | [ ] approved on [date]

---

## What mPilot is

**mPilot is an autonomous AI agent that manages a user's DeFi position on Mantle 24/7, and a composable primitive that any Mantle developer can compose into their own agent stack.**

The user sets a financial goal in plain English — *"max stablecoin yield, keep $200 USDC liquid, never breach 70% Aave LTV"* — and mPilot runs a continuous tick loop that **plans → simulates → proposes → executes → records** every action across 7 Mantle protocols (Aave V3, Mantle DEXes Merchant Moe / Agni / FusionX, Ethena sUSDe, Ondo USDY, mETH staking, Li.Fi bridging, ERC-8004 reputation). The user watches the agent work in real time via streaming generative-UI cards, approves manually or grants autopilot per category, and can hit Emergency Stop at any moment. Every Mainnet action is signed by the user's ERC-4337 session key and receipted on-chain via an ERC-8004 attestation — verifiable forever.

mPilot is for Mantle/Bybit-adjacent DeFi users holding stablecoins (USDC), staking assets (mETH), or RWA yield tokens (sUSDe, USDY) who want active management without spending hours per week — and who want a verifiable audit trail, not a black-box robo-advisor.

**But mPilot is more than the consumer app.** It ships as a **core (`@mpilot/tools` + `@mpilot/agent` + `@mpilot/sdk`) with N framework adapters** so that any developer building on LangChain, Vercel AI SDK, OpenAI's Chat Completions, Anthropic's Claude Agent SDK, Coinbase AgentKit, CopilotKit, or assistant-ui can drop mPilot's 30+ DeFi actions into their existing agent app with one `pnpm add`. The web app at `mpilot.xyz` is the flagship reference consumer of that core — not the source of truth.

**One-line pitch (judge-facing):**
> An autonomous AI agent for Mantle that bridges, swaps, lends, and rebalances 24/7 — every move signed by your session key, every receipt on-chain via ERC-8004, every action composable into any other agent runtime via npm.

**Why this beats every other Mantle Track 6 entry:** most teams will ship an app. We ship an **agentic primitive** — the package set every other Mantle dev will integrate against. That's the difference between *one demo* and *infrastructure*. It's also the difference between *one judge moment* (the demo URL) and *N judge moments* (one for every framework adapter we publish + one for the Claude Desktop MCP install + one for the live web app + one for the MCP Apps iframe + one for the npm Skill install).

**Sponsor-native fit:**
mPilot is the canonical reference of Mantle's "Agents as Interface" 2026 thesis — composes 6 Mantle protocols under one autonomous agent runtime, packages as a Claude/OpenCode/Cursor/Windsurf-compatible skill via `vercel-labs/skills` (Track 6 qualifier), and uses ERC-8004 (deployed canonically on Mantle 2026-02) as its verifiability primitive — directly fulfilling judge theses for Allora (verifiable inference output), Virtuals Protocol (agent commerce), Nansen (on-chain track record), and the Mantle team (ecosystem composition).

---

## How mPilot ships — four surfaces, one core

mPilot is NOT an app with a side door for the SDK. It's a **layered set of npm packages** that the four surfaces all consume. Each surface is a first-class deliverable, sized by judge-impact:

### Surface 1 — Consumer web app (`mpilot.xyz`)
The flagship demo. Landing + onboarding + dashboard + tick stream + reputation viewer. Built on `@mpilot/react-ui` (our own component library). This is the judge's first contact and the X-thread shareable. Dogfoods the whole package set.

### Surface 2 — npm SDK + framework adapters (`@mpilot/*`)
The infrastructure deliverable. Total **15 packages** (5 existing + 10 new — see `architecture.md` repo structure):
- **Core (framework-agnostic):** `@mpilot/shared`, `@mpilot/agent`, `@mpilot/tools` (the 30+ DeFi actions as a single source of truth), plus 7 protocol packages (`@mpilot/aave-v3-mantle`, `@mpilot/mantle-dex`, `@mpilot/ethena-susde`, `@mpilot/ondo-usdy`, `@mpilot/meth-staking`, `@mpilot/lifi-bridge`, `@mpilot/erc8004`).
- **Framework adapters** (15-40 LOC each, wrap `@mpilot/tools` for one runtime): `@mpilot/vercel-ai`, `@mpilot/openai` (covers Anthropic raw tool-use too — same JSON Schema), `@mpilot/langchain`, `@mpilot/agentkit`. Audit dropped GOAT (15 months stale) and `@openai/agents` (15 months stale) — use direct Chat Completions instead.
- **Components:** `@mpilot/react` (headless tool-part components), `@mpilot/react-ui` (styled drop-ins), plus 2 optional UI adapters `@mpilot/react-assistant-ui` + `@mpilot/react-copilotkit` (cover LangGraph / CrewAI / Mastra / Pydantic AI / AG-UI users transitively).
- **MCP:** `@mpilot/mcp` — transport-agnostic core, ships as stdio default + Cloudflare Worker hosted variant.
- **Skill:** `@mpilot/skill` — `npx skills add Blockchain-Oracle/mpilot` Track 6 qualifier.
- **Meta:** `@mpilot/sdk` — convenience re-export for the common case.

### Surface 3 — MCP server (`@mpilot/mcp` stdio + `mcp.mpilot.xyz/mcp` hosted)
The agent-host distribution moat. Stdio install via `claude mcp add concierge -- npx -y @mpilot/mcp` works in **Claude Code, Claude Desktop, Cursor, Windsurf, VS Code Copilot, Zed, Cline, Goose, OpenCode, Codex** (10+ hosts). Per-tool `outputSchema` enables structured tool results that other MCPs can compose against. Three-rail generative UI:
- **Vercel AI SDK `tool-${name}` parts** for the web app (and any AI-SDK consumer);
- **MCP Apps `ui://` HTML resources** rendered in sandboxed iframes by Claude Desktop / ChatGPT / Goose / VS Code Insiders (SEP-1865, merged 2026-01-28);
- **MCP Elicitation** (`mode: 'form'` for high-value confirmations + `mode: 'url'` for OAuth/wallet-connect handoff) — both stable since spec `2025-06-18`.

### Surface 4 — Agent Skill (`npx skills add Blockchain-Oracle/mpilot`)
The Byreal/Track 6 qualifier. Built per the `vercel-labs/skills` v1.5.10 format (21,800 stars, supports OpenCode / Claude Code / Codex / Cursor + 67 other agents). Skills folder under `packages/skill/` with `SKILL.md` frontmatter + scripts/resources per the Anthropic Agent Skills format. Auto-installs MCP entry alongside.

---

## Why the four-surface model wins

| Surface | Judge moment | Differentiation |
|---|---|---|
| Web app | "Look, it ticks live on `mpilot.xyz`. Status pill animates. Reasoning streams. Tx hash confirms. Attestation lands." | UI/UX track; community voting shareable. |
| npm SDK + adapters | "I `pnpm add @mpilot/langchain` in my LangChain agent — instant Mantle DeFi." | Mantle Ecosystem Contribution — actual infrastructure that other devs adopt. |
| MCP stdio + hosted + MCP Apps | "I run `npx -y @mpilot/mcp` in Claude Desktop, and the proposal card renders as an iframe inside Claude. I click Approve inside Claude, my session key signs, tx confirms — without leaving the chat." | First-mover on MCP Apps in DeFi; first-mover on stdio-default MCP for a Mantle agent. |
| Skill via `npx skills add` | "`npx skills add Blockchain-Oracle/mpilot` and my OpenCode agent now knows mPilot." | Track 6 (Byreal Agentic Economy) qualifier; cross-host skill distribution. |

**No other Mantle Track 6 team can claim all four with depth.** Most ship one surface. We ship all four because the core (`@mpilot/tools`) makes the marginal cost of each additional surface = ~20-40 LOC of adapter code.

---

## Demo moment (90-second judge walkthrough)

1. **Judge lands on `mpilot.xyz`.** Hero shows a live tick streaming on Sepolia (status pill animating `planning → simulating → proposing → executing → confirmed → attested`). The agent is visibly working before the judge clicks anything.

2. **Judge clicks "Try on Sepolia"** — `/app/onboarding`. Connects wallet (Privy / Reown). mPilot sponsors the smart-account deploy + ERC-8004 identity NFT mint (judge pays zero gas via Pimlico paymaster). Judge sets first goal in plain English: *"Max my USDC yield. Don't break 70% LTV. Keep $50 USDC liquid."*

3. **Cron fires within 60 seconds.** A new `<TickCard>` slides into the top of the stream. Status pill pulses `planning`. The LLM's reasoning streams character-by-character into the card. After ~5 seconds the pill transitions to `simulating` — a nested mini-card renders the dry-run output: *"supply 100 USDe → Aave V3 → expected APR +3.4%, post-action HF 2.1."* Pill transitions to `proposing` — Approve / Reject / Edit controls appear.

4. **Judge clicks Approve.** Pill transitions to `executing`. Pending tx hash links to MantleScan Sepolia. Within ~6 seconds: `confirmed`. Card auto-expands the attestation: *"ERC-8004 feedback hash `0xabc…` written to ReputationRegistry. Agent reputation now +1.74."* Tx hash + ERC-8004 explorer link both clickable.

5. **Judge opens a SECOND surface — Claude Desktop.** Pastes `npx -y @mpilot/mcp` into their MCP config. Claude Desktop loads mPilot's tools. Judge types: *"mPilot, what's my position?"* Claude calls the MCP server. The Portfolio card renders **inside Claude Desktop** as an MCP Apps `ui://` HTML iframe — live position data, identical to the web app card. Judge clicks Approve inside Claude. MCP Elicitation pops a structured confirmation form (`confirm: bool`, `maxSlippageBps: number`). Judge confirms. Same session key signs. Same tx hash confirms. **Same agent, two surfaces, one Mainnet action.**

6. **Judge opens a THIRD surface — their own LangChain agent.** Runs `pnpm add @mpilot/langchain` in their app. 5 lines later, their agent has mPilot's 30+ DeFi tools. They demo it composing mPilot + a Telegram MCP: *"if my yield drops below 6%, message me on Telegram and propose a rebalance."*

**The wow moment:** *The agent does the work, the user just talks, and the same agent runs across the web app, Claude Desktop, and any other developer's stack — with an on-chain reputation receipt that lives forever and a structured JSON contract that any future surface can consume.*

---

## Out of scope (explicit cuts to guard against overbuilding)

- **Cross-chain agent execution beyond Li.Fi bridging** — no Solana, no L1, no non-EVM.
- **zkML / verifiable inference proofs** — ERC-8004 attestation IS the verifiability claim; zkML adds weeks for marginal gain.
- **Perps trading in v1** — defer to v1.1 (Byreal Perps CLI is Hyperliquid-only anyway).
- **NFT trading** — Mantle has near-zero NFT culture; weak ROI.
- **Custom prediction markets** — that's AgentArena's wedge (plan B candidate).
- **Multi-agent swarms / committees** — one agent per user, simpler ship.
- **Pre-built canned strategies UI** — mPilot describes goals; agent picks actions.
- **`@mpilot/goat` adapter** — GOAT SDK 4-15 months stale per `AUDIT-2026-06-09.md`. Defer to v1.1 if GOAT resumes active maintenance.
- **`@openai/agents` dependency** — 15 months stale; use direct Chat Completions tool shape (covers Anthropic raw tool-use too — single adapter).
- **Tambo / Crayon component libraries** — both are model-driven (LLM picks the component); contradicts mPilot's contract that *tool X always renders card X*.
- **Mobile native app** — web app responsive only; mobile PWA defer to v1.1.
- **Email / push notifications** — in-app + on-chain receipts + MCP host notifications only.
- **Internationalization** — English only for v1.
- **Multi-tenant SaaS billing** — out of scope (judge demo, not commercial billing).
- **Real KYC flow for USDY** — assume user already holds USDY if relevant.
- **Aggressive trading strategies** — v1 is yield optimization + spending safety, not directional trading.

**NO LONGER OUT OF SCOPE (audit corrected these from the 2026-06-03 draft):**
- ~~Multi-LLM provider abstraction~~ → **IN SCOPE v1.** Vercel AI SDK's `LanguageModelV1` interface gives us model-agnostic SDK for free (per ADR-016). Env auto-detect (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` / `XAI_API_KEY`); override via `CONCIERGE_AI_MODEL="provider:model"`. The autonomous tick worker stays Anthropic-only (Claude Agent SDK) — users never see that. The public SDK / MCP / chat API are all model-agnostic.

---

## Locked-in technical decisions (carry to architecture.md)

Full decisions live in `architecture.md` ADRs. Highlights:

| Decision | Choice | ADR |
|---|---|---|
| MCP transport default | **stdio** (`npx -y @mpilot/mcp`); hosted Cloudflare Worker is optional secondary | ADR-011 (amended) |
| Tool registry shape | `@mpilot/tools` framework-agnostic registry; `ConciergeTool` interface (`name`, `description`, `inputSchema: ZodObject`, `invoke`, optional `supportsNetwork`) | ADR-014 |
| Components | Two-package split: `@mpilot/react` (headless) + `@mpilot/react-ui` (styled); web app dogfoods both | ADR-015 |
| LLM provider abstraction | Vercel AI SDK `LanguageModelV1`; env auto-detect; tick worker stays Anthropic | ADR-016 |
| Generative UI rails | Three rails on a structured-JSON `outputSchema` contract: Vercel AI SDK tool-parts + MCP Apps `ui://` resources + MCP Elicitation (form + url modes) | ADR-017 |
| Vercel AI SDK version | **`ai 6.x` + `@ai-sdk/react 3.x`** (current stable 2026-06-08) | architecture.md stack |
| MCP SDK version | `@modelcontextprotocol/sdk@1.29` (v2 `registerTool` API + `outputSchema` + `structuredContent`) | architecture.md stack |
| Skill CLI | `vercel-labs/skills@1.5.10` (`npx skills add Blockchain-Oracle/mpilot`) — 21,800 stars, supports 70+ agent hosts | ADR-003 |
| MCP Apps | SEP-1865 `ui://concierge/*` HTML resources; draft spec (not bet-the-wedge) | ADR-017 |
| GOAT SDK | Dropped from v1 (15 months stale framework adapters) | AUDIT-2026-06-09 |

---

## Judging criteria alignment (updated for the rework)

### Grand Champion (cross-track, weighted)

| Criterion | Weight | How mPilot scores |
|---|---|---|
| Technical Depth (AI × on-chain integration, architecture, code quality) | 30% | Full agent runtime (Claude Agent SDK + Vercel AI SDK v6) · smart account layer with ERC-4337 session keys · 7 action providers · MCP server (stdio + hosted) · 4 framework adapters · 2 component adapters · on-chain attestation per tick · comprehensive test suite (unit + integration + Foundry fuzz/invariant) · MCP Apps `ui://` resources · Elicitation (form + URL modes) |
| Innovation (originality, new AI × Web3 paradigm) | 25% | First Mantle agent shipped as a composable primitive across 10+ host runtimes · first ERC-8004 native consumer agent surface · first MCP Apps iframe-in-Claude-Desktop for DeFi · first stdio-default MCP for a Mantle agent · structured-JSON `outputSchema` contract enables auto-generated cards via `@assistant-ui/tool-ui` for any tool we ship |
| Mantle Ecosystem Contribution (substantive use of Mantle, long-term value) | 25% | Composes 6 Mantle protocols substantively · uses ERC-8004 as a primitive · publishes **15 npm packages** other Mantle devs reuse · ships infrastructure (not just an app) · npm Skill installable across 10+ agent hosts |
| Product Completeness (runnable demo, UX, scalability) | 20% | Web app + 4 framework adapters + 2 component adapters + MCP (stdio + hosted) + Skill + Mainnet deploy + Sepolia playground for zero-capital judge access · responsive · accessible · documented |

**Estimated weighted score:** 9.10 / 10 (raised from 8.85 — Innovation + Mantle Ecosystem both step-functioned with the composable-primitive framing).

### Agentic Economy (Byreal) — Track 6 DeFi Deep Dive

- **General (70%):** Byreal integration depth via `npx skills add Blockchain-Oracle/mpilot` (vercel-labs/skills v1.5.10) · agent autonomy via cron tick loop with session-key auto-execute · technical completeness across 7 providers · sustainability (15 open-source npm packages other Mantle devs compose against) · cross-runtime support: a Mantle dev can use mPilot from LangChain, Vercel AI SDK, OpenAI, Anthropic, Coinbase AgentKit, CopilotKit, assistant-ui, or any MCP-compatible host
- **Strategy Alpha (30%):** Verifiability via ERC-8004 attestation per tick + structured-JSON `outputSchema` per tool means **every action is backtestable forever AND replayable in any other agent runtime**
- **Submission answer:** *"mPilot ships as a Claude-/OpenCode-/Cursor-/Windsurf-compatible Agent Skill installable via `npx skills add Blockchain-Oracle/mpilot`, plus 15 npm packages (`@mpilot/tools` + 4 framework adapters + 2 component adapters + MCP stdio server + 7 protocol packages + React headless/styled components). Every action is composable into any Mantle dev's existing agent stack via a single `pnpm add`."*

### Best UI/UX

| Dimension | Weight | Approach |
|---|---|---|
| Visual Design (30%) | — | Designer agent owns implementation (see `docs/ux-spec.md` + `research/concierge/08-ux-component-intent.md`); shipped as `@mpilot/react-ui` (other devs reuse) |
| Interaction & Flow (30%) | — | Onboarding flow → goal-set → activate → live tick stream → approval/autopilot UX → ERC-8004 receipt viewer; identical interactions across web app AND Claude Desktop (MCP Apps iframe) AND any consuming app |
| AI Interaction Design (25%) | — | Three-rail gen UI: tick cards stream reasoning text + status pill transitions + nested simulation/execution cards (Vercel AI SDK) · MCP Apps iframes in Claude Desktop · MCP Elicitation structured confirmation forms — "the AI is visibly thinking" pattern across every surface |
| Accessibility (15%) | — | Keyboard nav, screen reader, motion-reduce, light/dark, mobile-responsive (contract in `08-ux-component-intent.md`); enforced in headless `@mpilot/react` package; styling in `@mpilot/react-ui` |

### Community Voting

Clear/compelling demo, real pain point, shareability. mPilot's Sepolia playground + clickable testnet experience + demo video + X thread + **per-runtime install snippets that devs can RT** ("here's how to add mPilot to your LangChain agent in 5 lines") = compounding viral asset.

### 20-Project Deployment Award (first-come, first-served, 20 spots)

- ✅ Smart contract deployed on Mantle Mainnet — `ConciergeRegistry` + session-key validator
- ✅ Verified on MantleScan
- ✅ AI-powered function callable on-chain — agent tick → `giveFeedback` write IS the AI-powered function
- ✅ Public frontend at `mpilot.xyz/app`
- ✅ Deployment addresses in DoraHacks submission
- ✅ Demo video ≥ 2 min — must show all four surfaces (web + Claude Desktop iframe + LangChain integration + Skill install)
- ✅ Open-source GitHub repo with comprehensive README + per-runtime install snippets

---

## README shape (updated for four-surface model)

The README must contain in this order:

1. **Project name + one-line pitch** (from the top of this PRD)
2. **Demo URL** (`https://mpilot.xyz` — Vercel) + Claude Desktop / OpenCode / Cursor install snippet
3. **Screenshot/GIF** (above the fold) — the tick card stream in action (web app)
4. **Three-surface demo grid** (below the fold) — web app GIF + Claude Desktop MCP Apps iframe GIF + LangChain integration code block
5. **Run-locally steps** (3 commands max — `git clone` → `pnpm install` → `pnpm dev`)
6. **Deployed contracts table** with mantlescan.xyz links for `ConciergeRegistry` + session-key validator + the canonical ERC-8004 / Aave V3 / sUSDe / USDC addresses we compose against
7. **MCP install instructions:**
   - Stdio (default): `claude mcp add concierge -- npx -y @mpilot/mcp`
   - Hosted (optional): `claude mcp add concierge https://mcp.mpilot.xyz/mcp --header "Authorization: Bearer ck_live_..."`
8. **Skill install:** `npx skills add Blockchain-Oracle/mpilot`
9. **SDK quickstart** — 5-line `@mpilot/sdk` example with model auto-detection
10. **Framework adapter install snippets** — one block per framework (`@mpilot/vercel-ai`, `@mpilot/openai`, `@mpilot/langchain`, `@mpilot/agentkit`)
11. **Component install snippets** — `@mpilot/react-ui` standalone + `@mpilot/react-assistant-ui` for assistant-ui users + `@mpilot/react-copilotkit` for AG-UI / LangGraph / CrewAI / Mastra users
12. **Per-tool MCP Apps `ui://` resource list** — what cards render inside Claude Desktop
13. **License** (MIT)
14. **Architecture diagram** (linked, from `docs/architecture-diagram.svg`)
15. **Submission metadata** — Track nominations, Byreal capability answer, X thread link

---

## Research references

- Domain knowledge folder: `research/concierge/` (verified 2026-06-04 + 2026-06-09)
- **Spec rework brief: `research/concierge/SPEC-REWORK-BRIEF-2026-06-09.md`** (the synthesis that drives this PRD update)
- **Library + SDK audit: `research/concierge/AUDIT-2026-06-09.md`** (pre-spec verification pass; version-pinned reality check)
- Wedge lock: `research/concierge/01-wedge-locked.md`
- Architecture brief: `research/concierge/02-architecture.md`
- Action providers (7 files): `research/concierge/03-providers/*.md`
- Agent runtime: `research/concierge/04-agent-runtime.md`
- Smart account: `research/concierge/05-zerodev-erc4337.md`
- Agent Skill packaging: `research/concierge/06-realclaw-skill-pkg.md`
- MCP server pattern: `research/concierge/07-mcp-server-pattern.md`
- UI component intent (designer's brief): `research/concierge/08-ux-component-intent.md`
- Tracks + judges: `research/concierge/09-tracks-and-judges.md`
- Constraints + quality standards: `research/concierge/10-constraints.md`
- On-chain address audit: `research/concierge/AUDIT-2026-06-04.md`
- Patron archive (predecessor wedge, reusable Mantle facts): `archive/patron-2026-06-02/`

---

## Changelog

- **2026-06-03 (initial draft):** Four-surface model first articulated; 13 ADRs locked.
- **2026-06-09 (this rewrite):** Composable-primitive framing made explicit. MCP transport: stdio-first + hosted optional. Components: `@mpilot/react` + `@mpilot/react-ui` split + 2 optional adapters. Model-agnostic via Vercel AI SDK `LanguageModelV1`. Three-rail generative UI on structured-JSON contract. Stack bumped to `ai 6.x`. Dropped GOAT + `@openai/agents` (both stale). 10 new packages added to repo structure. 16 new stories defined in `epics.md` + `sprint-status.yaml` (see SPEC-REWORK-BRIEF).
