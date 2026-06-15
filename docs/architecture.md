# Architecture — Concierge

**Status:** REWORKED 2026-06-09 — supersedes 2026-06-03 draft. 19 ADRs (was 13). Driving documents: `research/concierge/SPEC-REWORK-BRIEF-2026-06-09.md` (synthesis), `AUDIT-2026-06-09.md` (library + spec verification), `SDK-DX-STUDY-2026-06-09.md` (developer-experience patterns).
**Last updated:** 2026-06-09

---

## Stack (locked after approval, post-2026-06-09 audit)

| Layer | Choice | Version | Why |
|---|---|---|---|
| Language | TypeScript | 5.6+ | Type-safe across web + SDK + MCP server; Solidity for contracts only |
| Module format | **Pure ESM, Node ≥ 22** | — | Per SDK-DX-STUDY §D. Every package has `"type": "module"`, `"sideEffects": false`, `"engines.node": ">=22"`. No CJS dual. (Matches Vercel AI SDK v6's stance.) |
| Package manager / monorepo | pnpm workspaces | 9.x | Switched from Bun: aligned with reference repos (cdr-kit / pokaldot / kwala all pnpm); pnpm's strict peer-dep handling matches our adapter package strategy |
| Frontend framework | Next.js (App Router) | 15.x | RSC + server actions + SSE; same codebase serves landing + app + docs |
| Styling | Tailwind CSS | 4.x | Modern, JIT, atomic; designer composes brand tokens on top |
| UI component library | `@concierge-mantle/react-ui` (we ship this) | own | Two-package split per ADR-015: `@concierge-mantle/react` (headless) + `@concierge-mantle/react-ui` (styled). Schema-driven cards per tool (pattern reference: `@assistant-ui/tool-ui`). Tool-ui adopted as DESIGN reference only — not a runtime dependency. |
| Agent runtime — interactive surface | Vercel AI SDK (`ai`) + `@ai-sdk/react` | **6.x + 3.x** | `streamText` + `tool({ description, inputSchema, outputSchema, execute })` + Zod + typed `tool-${name}` UI parts with 4 states. Model-agnostic via `LanguageModelV2` (per ADR-016). Verified 2026-06-08 (released yesterday). |
| Agent runtime — autonomous tick loop | `@anthropic-ai/claude-agent-sdk` | 0.3.x | Owns the multi-step tool-use loop natively; prompt caching native. Anthropic-only is FINE here — internal to the tick worker, not exposed to SDK consumers (per ADR-016). |
| LLM provider abstraction | `@ai-sdk/provider` (peer) + `@ai-sdk/{openai,anthropic,google,xai}` | — | SDK accepts `model: LanguageModelV2` directly per ADR-016. Defaults via env auto-detect (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` / `XAI_API_KEY`) + `AI_MODEL="provider:model"` override. Per-call override per tick phase. |
| LLM SDK (direct) | `@anthropic-ai/sdk` | 0.102.x | Used inside `@concierge-mantle/sdk` only for non-Vercel-AI-SDK paths (e.g., MCP server tool internals). Not exposed to consumers. |
| Smart account | ZeroDev SDK + Pimlico bundler | Kernel v3.1 + EntryPoint v0.7 | Session keys with `toCallPolicy` + `toTimestampPolicy` + `toSpendingLimitPolicy`; Pimlico bundler verified Mantle support |
| EOA fallback (if Day-1 spike fails) | viem direct signing + Postgres-queued tx queue | viem 2.x | Loses autopilot polish but keeps tick loop functional |
| On-chain reads/writes | viem | 2.x | Modern, tree-shakeable, typed; no ethers |
| Smart contracts | Solidity | 0.8.26 | Standard, errors-not-strings (OZ v5) |
| Contract testing | Foundry | latest | `forge test` + fuzz + invariant; bgd-labs Aave V3 ABIs |
| Contract libs | OpenZeppelin Contracts | 5.1 | `AccessControl`, `Pausable`, `ReentrancyGuard`, `ERC721`, `SafeERC20` |
| Backend API | Next.js API routes + server actions | — | Co-located with frontend, simpler ship; Hono as fallback if scaling pressure |
| ORM | Drizzle ORM | latest | Type-safe queries, migrations |
| Database | Postgres (Neon free tier) | 16 | Agent state, tick history, action log, user goals |
| Cache + locks | Redis (Upstash free tier) | 7 | In-flight tick locks (NX), MCP OAuth sessions, LLM response cache |
| Job queue | BullMQ | latest | Cron tick scheduler, retry semantics, repeatable jobs by key |
| Validation | Zod | latest | Schema for tool inputs/outputs + env vars |
| MCP server | `@modelcontextprotocol/sdk` | 1.29.x | `McpServer.registerTool` v2 API + `outputSchema` + `structuredContent` per tool (load-bearing — see ADR-014 / 017). Stdio default, Streamable HTTP for hosted. |
| MCP transport (default) | **stdio** via `@concierge-mantle/mcp` npm package | — | `npx -y @concierge-mantle/mcp` is the README default install per ADR-011 (amended). Matches pokaldot/kwala/cdr-kit pattern. |
| MCP hosting (optional secondary) | Cloudflare Workers + Hono | — | Same `packages/mcp/` core, wrapped in a Worker. Bearer-token v0 → OAuth v1. Required only when users want a URL-paste install. |
| MCP Apps (`ui://` resources) | `@mcp-ui/server@6.1.0` + `@mcp-ui/client@7.1.1` | per audit | Per ADR-017 Rail 2. SEP-1865 merged 2026-01-28; draft spec. Renders our HTML cards inside Claude Desktop / ChatGPT / Goose / VS Code Insiders sandboxed iframes. |
| MCP Elicitation | Native to SDK 1.29 | — | Per ADR-017 Rail 3. `mode: 'form'` for high-value confirmations; `mode: 'url'` (SEP-1036) for OAuth / wallet-connect handoff. |
| Skill CLI | `vercel-labs/skills@1.5.10` | — | `npx skills add Blockchain-Oracle/concierge`. Verified owner: Guillermo Rauch (Vercel CTO). 21,800 stars. Supports 70+ agent hosts. |
| Wallet connection (web) | Privy or Reown (AppKit) | — | Day-1 spike picks between them based on TG-WebView support + smart-account UX |
| Cross-chain bridging | Li.Fi HTTP API + Diamond contract | API v1 | `https://li.quest/v1` + Diamond `0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE` on Mantle |
| Testing — TS | Vitest | latest | Unit + integration; `createTestClient` against Anvil fork for chain-aware tests |
| Testing — e2e | Playwright | latest | Web app flows; TG WebView in test mode for mini-app |
| Linting + formatting | Biome | pin specific minor | Single tool 10× faster than ESLint+Prettier; `noExcessiveLinesPerFile { maxLines: 400 }` enforced |
| Observability | Pino + Sentry | latest | Structured logs (`tickId`, `agentId`, phase) + error tracking |
| Web deploy | Vercel | — | Landing + app + docs + API routes |
| MCP deploy (optional hosted) | Cloudflare Workers | — | SSE-safe, no 10s limit |
| npm publishing | `tsup` for declarations + builds | — | Per SDK-DX-STUDY §D. Same builder as Vercel AI SDK. Handcrafted `.d.ts` banned. |
| Contracts deploy chain | Mantle Mainnet (5000) + Sepolia (5003) | — | Mainnet for real; Sepolia for the zero-capital judge playground (Patron-pattern mocks reused) |

---

## Repo structure

```
concierge/
├── apps/
│   ├── web/                          # Next.js 15 app (landing + /app + /docs)
│   │   ├── app/
│   │   │   ├── page.tsx              # Landing (concierge.xyz/)
│   │   │   ├── app/                  # Authed app (concierge.xyz/app)
│   │   │   │   ├── page.tsx          # Dashboard
│   │   │   │   ├── onboarding/       # First-run flow
│   │   │   │   ├── goal/             # Goal-setting screen
│   │   │   │   ├── ticks/            # Tick history + detail
│   │   │   │   ├── portfolio/        # Position view
│   │   │   │   ├── agent/[id]/       # Agent identity + reputation viewer
│   │   │   │   └── settings/         # Settings
│   │   │   ├── docs/                 # Docs site (Fumadocs or equivalent)
│   │   │   ├── agent/[id]/           # Public unauthenticated reputation page
│   │   │   └── api/
│   │   │       ├── chat/             # Vercel AI SDK streaming endpoint
│   │   │       ├── tick/             # Manual "tick now" trigger
│   │   │       ├── rates/            # Live rate API (Aave Oracle + DefiLlama)
│   │   │       └── webhook/          # ZeroDev callbacks
│   │   ├── components/               # App-specific components (designer fills)
│   │   └── e2e/                      # Playwright specs
│   ├── mcp/                          # Cloudflare Worker (Hono + MCP SDK)
│   │   ├── src/
│   │   │   ├── index.ts              # Worker entry + Hono router
│   │   │   ├── server.ts             # McpServer setup + tool registration
│   │   │   └── oauth.ts              # Bearer-token auth (v0) → OAuth (v1)
│   │   └── wrangler.toml
│   └── worker/                       # BullMQ worker process (Fly.io)
│       ├── src/
│       │   ├── tick.ts               # The tick loop entry point
│       │   ├── phases/               # plan, simulate, propose, decide, execute, record
│       │   └── cron.ts               # Repeatable job registration
│       └── fly.toml
├── packages/
│   # === Foundation (framework-agnostic, no peer SDK deps) ===
│   ├── shared/                       # @concierge-mantle/shared — addresses + ABIs + types
│   │   └── src/{addresses.ts,abi/,types.ts}
│   ├── agent/                        # @concierge-mantle/agent — ConciergeAgent class (wallet + RPC + provider singletons)
│   │   └── src/
│   ├── tools/                        # @concierge-mantle/tools — framework-agnostic ConciergeTool[] registry (ADR-014)
│   │   └── src/{types.ts,index.ts,serializable/*.ts}
│   ├── providers/
│   │   ├── aave-v3-mantle/           # @concierge-mantle/aave-v3-mantle
│   │   ├── mantle-dex/               # @concierge-mantle/mantle-dex
│   │   ├── ethena-susde/             # @concierge-mantle/ethena-susde
│   │   ├── ondo-usdy/                # @concierge-mantle/ondo-usdy
│   │   ├── meth-staking/             # @concierge-mantle/meth-staking
│   │   ├── lifi-bridge/              # @concierge-mantle/lifi-bridge
│   │   └── erc8004/                  # @concierge-mantle/erc8004
│   # === Framework adapters (wrap @concierge-mantle/tools for each runtime, ~15-40 LOC each) ===
│   ├── vercel-ai/                    # @concierge-mantle/vercel-ai → ai SDK ToolSet
│   ├── openai/                       # @concierge-mantle/openai → OpenAI Chat Completions + Anthropic raw tool-use (one adapter, two runtimes)
│   ├── langchain/                    # @concierge-mantle/langchain → @langchain/core/tools StructuredToolInterface[]
│   ├── agentkit/                     # @concierge-mantle/agentkit → Coinbase customActionProvider (NOT @CreateAction)
│   # NOTE: @concierge-mantle/goat dropped per AUDIT-2026-06-09 §6 (GOAT SDK 4-15 months stale; defer to v1.1)
│   # === MCP server (transport-agnostic core; stdio default + Worker wrapper) ===
│   ├── mcp/                          # @concierge-mantle/mcp — transport-agnostic factory + stdio bin (ADR-011 amended)
│   │   └── src/{server.ts,stdio.ts,ui-resources/*.html}
│   # === React components (two-package split per ADR-015) ===
│   ├── react/                        # @concierge-mantle/react — headless tool-part components, schema-driven, parse-then-render
│   │   └── src/{ProposalPart.tsx,TickPart.tsx,PortfolioPart.tsx,ReputationPart.tsx,hooks/*.ts}
│   ├── react-ui/                     # @concierge-mantle/react-ui — styled drop-ins (Radix + shadcn + Tailwind tokens)
│   │   └── src/{TickCard.tsx,ProposalCard.tsx,PortfolioCard.tsx,ReputationChart.tsx,EmergencyStop.tsx,GoalInput.tsx,MCPInstallSnippet.tsx}
│   ├── react-assistant-ui/           # @concierge-mantle/react-assistant-ui — assistant-ui defineToolkit adapter (optional)
│   ├── react-copilotkit/             # @concierge-mantle/react-copilotkit — useConciergeActions hook (covers AG-UI/LangGraph/CrewAI/Mastra/Pydantic AI) (optional)
│   # === Brand + skill ===
│   ├── ui/                           # @concierge-mantle/ui — brand tokens only (color, type, motion, spacing) — designer fills
│   ├── skill/                        # @concierge-mantle/skill — Agent Skill (Track 6 qualifier per ADR-003)
│   │   ├── SKILL.md
│   │   ├── package.json              # discoverable by `npx skills add Blockchain-Oracle/concierge`
│   │   └── src/
│   # === SDK meta (convenience re-export) ===
│   └── sdk/                          # @concierge-mantle/sdk — convenience meta-package re-exporting agent + tools + vercel-ai
│       └── src/
├── contracts/                        # Foundry project
│   ├── src/
│   │   ├── ConciergeRegistry.sol     # Agent goal + policy storage
│   │   ├── SessionKeyValidator.sol   # (or use ZeroDev's stock validator)
│   │   └── mocks/                    # MockAavePool, MockSUSDe, MockUSDC, MockAaveOracle (Sepolia playground)
│   ├── test/
│   │   ├── unit/
│   │   ├── fuzz/
│   │   ├── invariant/
│   │   └── fork/                     # Mainnet fork tests via Anvil
│   ├── script/
│   │   ├── DeployAll.s.sol
│   │   └── HelperConfig.s.sol        # Per-chain dep addresses
│   ├── foundry.toml
│   └── remappings.txt                # OZ v5 + Aave V3 (NO Chainlink — per ADR-008)
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint + typecheck + test + forge test
│       ├── deploy-web.yml            # Vercel deploy gated on CI green
│       └── publish-packages.yml      # npm publish for SDK + 7 providers + skill
├── docs/                             # THIS folder — spec artifacts (not shipped)
│   ├── PRD.md
│   ├── architecture.md
│   ├── ux-spec.md
│   ├── epics.md
│   ├── stories/
│   └── sprint-status.yaml
├── research/                         # Domain knowledge (not shipped, source-of-truth for spec writer)
│   └── concierge/
├── archive/                          # Patron predecessor (kept for reusable facts)
│   └── patron-2026-06-02/
├── CLAUDE.md                         # Repo-level agent instructions
├── biome.json                        # Lint + format config; max-lines 400
├── package.json                      # pnpm workspace root
├── tsconfig.json
└── README.md                         # The submission-grade README
```

---

## Required external libraries (use these — do not reinvent)

The coding agent MUST use these. Do not build from scratch what a library already solves.

| Library | Purpose | How to add |
|---|---|---|
| `ai` (Vercel AI SDK 6.x) | Interactive chat surface, `streamText`, `tool()`, generative UI states | `pnpm add ai @ai-sdk/anthropic @ai-sdk/react` |
| `@anthropic-ai/sdk` | Direct Anthropic API (one-shot + prompt caching) | `pnpm add @anthropic-ai/sdk` |
| `@anthropic-ai/claude-agent-sdk` | Autonomous tick-loop runner with native tool-use loop | `pnpm add @anthropic-ai/claude-agent-sdk` |
| `viem` | All on-chain reads/writes | `pnpm add viem` |
| `wagmi` + `@rainbow-me/rainbowkit` OR `@privy-io/react-auth` | Wallet connect (Day-1 spike picks) | `pnpm add wagmi @rainbow-me/rainbowkit` OR `pnpm add @privy-io/react-auth` |
| `@zerodev/sdk` + `@zerodev/permissions` | ERC-4337 smart account + session keys | `pnpm add @zerodev/sdk @zerodev/permissions @zerodev/permission-validator` |
| `permissionless` (Pimlico SDK) | ERC-4337 bundler client + paymaster | `pnpm add permissionless` |
| `@modelcontextprotocol/sdk` | MCP server | `pnpm add @modelcontextprotocol/sdk` |
| `hono` | Cloudflare Worker router | `pnpm add hono` |
| `drizzle-orm` + `drizzle-kit` + `pg` | Postgres ORM + migrations | `pnpm add drizzle-orm pg && pnpm add -D drizzle-kit` |
| `@upstash/redis` + `bullmq` | Redis + job queue | `pnpm add @upstash/redis bullmq ioredis` |
| `zod` | Schema validation (tool inputs, env, request bodies) | `pnpm add zod` |
| `pino` | Structured logging | `pnpm add pino` |
| `@sentry/nextjs` | Error tracking | `pnpm add @sentry/nextjs` |
| `@aave-dao/aave-address-book` | Canonical Aave V3 addresses + asset metadata | `pnpm add @aave-dao/aave-address-book` |
| `@lifi/sdk` | Cross-chain bridging via Li.Fi (optional — HTTP API also fine) | `pnpm add @lifi/sdk` |
| OpenZeppelin Contracts | Solidity primitives | `forge install OpenZeppelin/openzeppelin-contracts@v5.1.0` |
| Aave V3 Origin | Aave V3 interfaces for our integrations + tests | `forge install aave-dao/aave-v3-origin` |
| forge-std | Foundry stdlib | `forge install foundry-rs/forge-std` |
| `biome` | Lint + format | `pnpm add -D @biomejs/biome` |
| `vitest` + `@vitest/coverage-v8` | Unit + integration tests | `pnpm add -D vitest @vitest/coverage-v8` |
| `@playwright/test` | E2E tests | `pnpm add -D @playwright/test` |

### Context7 library research rule (mandatory)

Before implementing ANYTHING from scratch:

```bash
# Step 1: find the library
mcp__plugin_context7_context7__resolve-library-id libraryName="<what you need>"

# Step 2: read the docs
mcp__plugin_context7_context7__query-docs context7CompatibleLibraryID="<id>" topic="<specific area>" tokens=5000
```

**If a library exists that solves it, use it. Do not build it yourself.**

Required Context7 lookups during build (already verified during spec writing):
- `/vercel/ai` — Vercel AI SDK 6 patterns
- `/websites/zerodev_app` — ZeroDev Kernel + permissions
- `/aave/aave-sdk` + `/aave-dao/aave-address-book` — Aave V3 + Mantle addresses
- `/modelcontextprotocol/typescript-sdk` — MCP TypeScript SDK
- `/websites/ethena_fi` — Ethena sUSDe mechanics

Coding agent MUST re-query Context7 for any library decision the architecture doesn't explicitly lock.

---

## Banned patterns (anti-slop)

### Stack-level

- ❌ `from-purple-500 to-pink-500` Tailwind gradient — generic AI slop
- ❌ `text-gray-600` body on white — low contrast, no personality
- ❌ `font-sans` without explicit font import — Inter default
- ❌ Hardcoded mock data in hot path — real Mantle Mainnet / Sepolia, always
- ❌ `useState` for shared state — use Zustand if needed (TanStack Query covers server state)
- ❌ `ethers` — use viem
- ❌ Python in agent runtime — TypeScript only
- ❌ Files > 400 LOC — enforced by Biome `noExcessiveLinesPerFile`
- ❌ Day-N schedule framing in any doc — completion criteria + quality standards only

### SDK / package-level (added 2026-06-09 per SDK-DX-STUDY §4)

- ❌ **Bundling an LLM provider** — accept `model: LanguageModelV2`; user brings their own (per ADR-016)
- ❌ **Class decorators (`@CreateAction`-style)** — AgentKit's documented escape hatch (`customActionProvider`) is what we use. Decorators require `reflect-metadata` + `experimentalDecorators` and break tree-shaking
- ❌ **CJS dual** — pure ESM, Node ≥ 22. Anyone who can't do ESM in 2026 is not our user
- ❌ **`unknown` for tool inputs** — every `ConciergeTool` MUST have `inputSchema: z.ZodTypeAny` and `outputSchema: z.ZodTypeAny`. No bare `unknown` (per AUDIT-2026-06-09 §2)
- ❌ **Depending on stale adapter packages** — `@coinbase/agentkit-vercel-ai-sdk` (15 months stale), `@goat-sdk/adapter-vercel-ai` (15 months stale), `@openai/agents` (15 months stale). Write our own ~30-LOC adapter against the core directly
- ❌ **`Result<T, E>` error style** — no major TS SDK does this. Throw `ConciergeError` with `type` discriminator (per ADR-019)
- ❌ **Omitting `outputSchema`** on a `ConciergeTool` — load-bearing for MCP `structuredContent` + Vercel AI SDK `InferUITools` + `@concierge-mantle/react-ui` parse-then-render
- ❌ **Subpath-exporting framework adapters from `@concierge-mantle/sdk`** — keep adapters as separate packages so peer-dep matrices don't explode
- ❌ **`goal` required at construction** — `createConcierge({ model, registry })` then `agent.setGoal(...)`. Constructor side-effects = test hell (per SDK-DX-STUDY §I)
- ❌ **Tambo / Crayon / model-driven gen-UI libs** — contradict the "tool X always renders card X" contract (per Thread 5)
- ❌ **Handcrafted `.d.ts`** — `tsup` (or equivalent) generates declarations
- ❌ **`"sideEffects": true` (or unspecified)** — every published package MUST declare `"sideEffects": false` for tree-shakeability

### Concierge-specific

- ❌ Hardcoded rate numbers (sUSDe APY, USDC borrow APR) in components — fetch from `/api/rates` always
- ❌ Direct Chainlink AggregatorV3 reads — use `IAaveOracle.getAssetPrice` (per ADR-008)
- ❌ Borrowing without first calling `setUserEMode(1)` for sUSDe collateral — silent failure
- ❌ Bypassing the tick loop's simulate phase — every execute MUST be preceded by successful simulation
- ❌ Direct `Pool.borrow` calls without typed error wrapping — wrap reverts in `AaveBorrowFailed()` etc.
- ❌ Storing session-key private keys in browser localStorage — use ZeroDev key management
- ❌ Calling Byreal Skills CLI (Solana-only) — use RealClaw skill packaging path instead

---

## Architecture decisions (ADRs)

### ADR-001 — Greenfield TypeScript monorepo (NOT a fork of Eliza/Giza/AgentKit) (AMENDED 2026-06-09)

Greenfield **pnpm** monorepo using proven primitives. (Originally proposed as Bun; switched 2026-06-09 to align with reference repos cdr-kit / pokaldot / kwala and to leverage pnpm's strict peer-dep handling, which matches our adapter package strategy in ADR-018.) Forking Eliza adds cognitive overhead for solo build; forking Giza means wrapping a closed-source brain; AgentKit alone is too thin. Steal patterns (MCP server shape, session keys, tick loop) but write our own runtime.

### ADR-002 — Vercel AI SDK + Claude Agent SDK as agent foundation (NOT LangGraph/CrewAI)

Vercel AI SDK for the interactive chat surface (`streamText` + four UI states). Claude Agent SDK for the autonomous tick loop (owns the multi-step tool-use loop natively). LangGraph is Python-heavy; CrewAI's multi-agent ceremony doesn't fit the single-executor DeFi shape.

### ADR-003 — Track 6 via RealClaw skill packaging (NOT Byreal Skills CLI)

Byreal Skills CLI is **Solana-only** (`byreal-git/byreal-agent-skills` is "CLMM DEX on Solana"). Byreal Perps CLI is **Hyperliquid-only**. Track 6 qualification path uses the **RealClaw** capability — Concierge packages as a TypeScript skill installable via `npx skills add @concierge-mantle/mantle-agent`. Pattern verified via byreal-agent-skills itself + `Magicianhax/mantle-active-trader`.

### ADR-004 — ERC-8004 attestation as verifiability (NOT zkML)

Every successful tick writes an ERC-8004 `giveFeedback` attestation. This is the verifiability claim. No zkML rabbit hole (Giza's Orion/LuminAIR is decoupled from their consumer product anyway). Allora cares about verifiable output, not runtime proofs; ERC-8004 reputation history + tx hashes = sufficient narrative.

### ADR-005 — Single-domain routing (`concierge.xyz/app`, not `app.concierge.xyz`)

Single Next.js project at `concierge.xyz` with `/app`, `/docs`, `/agent/:id` as top-level routes. MCP server on `mcp.concierge.xyz` as the only subdomain (because SSE long-lived connections need Cloudflare Workers, different from Vercel function semantics).

### ADR-006 — Sonnet 4.6 default + Opus 4.7 for hard reasoning + Haiku 4.5 for recap

Per-tick LLM routing: Sonnet 4.6 for routine `plan()` + `propose()` (fast + cheap). Opus 4.7 conditionally for goal-decomposition + risk analysis on high-value actions. Haiku 4.5 for `record()` summarization. Aggressive prompt caching on stable prefix (system prompt + tool schemas) — drops per-tick cost ~10×.

### ADR-007 — Biome as single quality tool with `noExcessiveLinesPerFile: { maxLines: 400 }`

Biome (single tool, 10× faster than ESLint+Prettier) with nursery rule `noExcessiveLinesPerFile` for hygiene. Pin to a specific minor (nursery rules can drift). Generated files excluded via `files.ignore`. `scripts/check-file-loc.mjs` as defense-in-depth.

### ADR-008 — Aave Oracle (NOT direct Chainlink) for price reads on Mantle

There is NO direct Chainlink sUSDe/USD feed on Mantle. Aave Oracle (`0x47a063CfDa980532267970d478EC340C0F80E8df`) routes to Capped composites (sUSDe/USDT/USD + USDC/USD). Concierge reads prices via `IAaveOracle.getAssetPrice(asset)` so health-factor reads align with Aave's liquidation triggers. USDC peg hardcoded at $1 in `@concierge-mantle/aave-v3-mantle` price-read helper as defense-in-depth (matches Aave's own treatment).

### ADR-009 — Postgres + Redis for off-chain state (ERC-8004 = canonical on-chain reputation)

Postgres (Neon) for durable agent state, tick history, portfolio snapshots, user goals. Redis (Upstash) for in-flight tick locks (NX), MCP OAuth sessions, LLM response cache. ERC-8004 is the canonical reputation layer; everything else lives off-chain.

### ADR-010 — ZeroDev SDK + Pimlico bundler for ERC-4337 on Mantle

ZeroDev SDK is chain-agnostic for the account + permission layer (Kernel v3.1 + permission validator). Pimlico is the verified-Mantle-supported bundler. EOA fallback: Postgres-queued signed-tx pipeline if Day-1 spike on ERC-4337 fails (loses autopilot UX but tick loop survives).

### ADR-011 — MCP server: stdio-first, hosted Cloudflare Worker optional (AMENDED 2026-06-09)

**Original (superseded):** "MCP server on Cloudflare Workers (NOT Vercel functions)."

**Amendment:** Concierge MCP ships as **`@concierge-mantle/mcp`** — a transport-agnostic core with a stdio binary as the default install path (`claude mcp add concierge -- npx -y @concierge-mantle/mcp`). A Cloudflare Worker wrapper at `apps/mcp/` exposes the same core via Streamable HTTP for users who want a URL-paste install. Both consume the same `@concierge-mantle/tools` registry — only transport + auth differ.

**Why stdio is the default:** Verified across pokaldot, kwala, cdr-kit (`07-mcp-server-pattern.md` §3 already specified this; the original ADR-011 collapsed it). Zero infra cost for the consumer, session-key private key never leaves their machine (critical for DeFi), no Vercel 10s SSE limit, universal install across 10+ MCP hosts (Claude Code / Desktop / Cursor / Windsurf / VS Code Copilot / Zed / Cline / Goose / OpenCode / Codex), demoable offline.

**Why hosted remains:** One-line install for users who don't want Node tools, multi-tenant analytics + abuse rate-limit, dramatic demo URL for judges.

**Auth:** Stdio uses the user's local env. Hosted uses bearer-token v0 → OAuth (PKCE) v1 via `mcpAuthRouter`. Server-initiated UI flows (wallet connect, etc.) ride MCP Elicitation `mode: 'url'` per ADR-017.

**Files:** `packages/mcp/src/{server.ts (factory), stdio.ts (bin)}` + `apps/mcp/src/index.ts` (Worker wrapper). All tools sourced from `@concierge-mantle/tools` per ADR-014.

### ADR-012 — Mantle Sepolia mock-deploy for zero-capital judge playground (reuse Patron pattern)

Aave V3 is NOT on Mantle Sepolia. To preserve the public clickable demo experience without forcing real-money Mainnet interaction, deploy `MockAavePool` + `MockSUSDe` + `MockUSDC` + `MockAaveOracle` (pattern reusable from `archive/patron-2026-06-02/docs/stories/story-23-deploy-demo-mocks-sepolia.md`) + Concierge contracts to Sepolia. The same Concierge contract bytecode targets both networks via `HelperConfig.s.sol` chain-id routing.

### ADR-013 — Designer agent owns visual implementation; specs describe component intent

`docs/ux-spec.md` + `research/concierge/08-ux-component-intent.md` describe every component's purpose, states, transitions, streaming behavior, accessibility contract, mobile responsiveness — no framework lock-ins. **2026-06-09 amendment:** components ship in `@concierge-mantle/react-ui` (Radix + shadcn + Tailwind tokens) per ADR-015. Designer owns the visual layer of `@concierge-mantle/react-ui`; Tambo / Crayon dropped (model-driven, contradict per-tool card contract). The agent runtime is invariant; the published component package is the canonical visual implementation.

### ADR-014 — `@concierge-mantle/tools` framework-agnostic tool registry (NEW 2026-06-09)

**Decision:** Concierge action definitions live in ONE source-of-truth package, `@concierge-mantle/tools`, with the shape:

```typescript
export interface ConciergeTool<
  TInputSchema extends z.ZodTypeAny = z.ZodTypeAny,
  TOutputSchema extends z.ZodTypeAny = z.ZodTypeAny,
> {
  name: string;
  description: string;
  inputSchema: TInputSchema;
  outputSchema: TOutputSchema;        // LOAD-BEARING — MCP structuredContent + Vercel AI SDK InferUITools + parse-then-render
  uiCardId?: 'proposal' | 'tick' | 'portfolio' | 'reputation' | 'plan' | 'data-table';
  invoke(args: z.infer<TInputSchema>): Promise<z.infer<TOutputSchema>>;
  supportsNetwork?(chainId: number): boolean;
}

export function tool<TIn extends z.ZodTypeAny, TOut extends z.ZodTypeAny>(
  def: ConciergeTool<TIn, TOut>
): ConciergeTool<TIn, TOut> { return def; }

export function createConciergeTools(agent: ConciergeAgent): ConciergeTool[];
export function toJsonSchema(tool: ConciergeTool): Record<string, unknown>;
```

Plus per-tool `SerializableConciergeXxxSchema` exports (one per `uiCardId`) for parse-then-render in `@concierge-mantle/react-ui`.

**Adapters (each ~15-40 LOC) wrap this single registry for one runtime:**
- `@concierge-mantle/vercel-ai` → `Object.fromEntries(tools.map(t => [t.name, aiTool({ description, inputSchema, execute })]))`
- `@concierge-mantle/openai` → `tools.map(t => ({ type: 'function', function: { name, description, parameters: toJsonSchema(t) } }))` + dispatch (covers Anthropic raw tool-use, same JSON Schema)
- `@concierge-mantle/langchain` → `tools.map(t => lcTool(async args => JSON.stringify(await t.invoke(args)), { name, description, schema }))`
- `@concierge-mantle/agentkit` → `customActionProvider(tools.map(t => ({ name, description, schema, invoke })))` — **factory escape hatch, NOT `@CreateAction` decorator**
- `@concierge-mantle/mcp` → `server.registerTool(name, { description, inputSchema, outputSchema }, async args => ({ content: [...], structuredContent: await t.invoke(args) }))`

**Why:** verified across `cdr-kit` + `Coinbase AgentKit` + `GOAT SDK` (per SDK-DX-STUDY §2, code-cited). Single source eliminates drift; ~20 LOC per adapter keeps maintenance trivial; framework users adopt via one `pnpm add` of their adapter.

**Dropped:** `@concierge-mantle/goat` (GOAT SDK adapters 15 months stale per AUDIT-2026-06-09 §6); `@concierge-mantle/openai-agents` (`@openai/agents` 15 months stale — use Chat Completions direct).

### ADR-015 — Component packaging: `@concierge-mantle/react` headless + `@concierge-mantle/react-ui` styled (NEW 2026-06-09)

**Decision:** Components ship as TWO npm packages:

- **`@concierge-mantle/react`** — headless tool-part components. Each takes a typed `tool-${name}` UI message part as a prop. Renders behavior, ARIA, keyboard nav, state machines. Parse-then-render gated by `safeParseSerializableXxx` from `@concierge-mantle/tools`. Zero CSS. Depends on `react` (peer) + `zod` (peer) + `@concierge-mantle/tools` (runtime).

- **`@concierge-mantle/react-ui`** — styled drop-ins. Re-exports `@concierge-mantle/react` headless components wrapped in Radix + shadcn primitives + Tailwind tokens from `@concierge-mantle/ui`. Cards: `<TickCard>`, `<ProposalCard>`, `<PortfolioCard>`, `<ReputationChart>`, `<EmergencyStop>`, `<GoalInput>`, `<MCPInstallSnippet>`.

**Distribution: Path C (selected 2026-06-09).** Primary = npm (`pnpm add @concierge-mantle/react-ui`). v1.1 stretch = complementary shadcn registry at `concierge.xyz/r/*.json` for copy-paste consumers. **`@assistant-ui/tool-ui` is adopted as DESIGN reference only** — pattern (schema-driven serializable schemas, lifecycle states, mobile-first, parse-then-render), not dependency. Components compose shadcn primitives directly (same building blocks tool-ui uses), MIT.

**Two optional adapter packages** for runtime fan-out:
- **`@concierge-mantle/react-assistant-ui`** — wraps `@concierge-mantle/react` cards as assistant-ui `defineToolkit({ name: { type: 'backend', render } })`. Covers assistant-ui + LangGraph / LangChain users transitively via the lib's own runtime adapters. ~20 LOC.
- **`@concierge-mantle/react-copilotkit`** — exposes `useConciergeActions()` registering each tool via `useCopilotAction({ name, render })`. Covers AG-UI Protocol users transitively: LangGraph + CrewAI + Mastra + Pydantic AI + AutoGen2 + Microsoft Agent Framework. ~25 LOC.

**Dropped:** Tambo (LLM picks component by Zod schema — contradicts our per-tool contract), Crayon/Thesys (couples to C1 hosted backend; also stale).

**Web-app dogfood requirement:** `apps/web/app/app/*` MUST consume `@concierge-mantle/react-ui` directly. No duplication. If a card doesn't fit, fix `@concierge-mantle/react-ui`, don't fork.

### ADR-016 — Model-agnostic SDK via `LanguageModelV2` + env auto-detect + per-call override (NEW 2026-06-09)

**Decision:** `@concierge-mantle/sdk` is model-agnostic. The public surface accepts `model: LanguageModelV2` directly — users bring their provider via `@ai-sdk/openai` / `@ai-sdk/anthropic` / `@ai-sdk/google` / `@ai-sdk/xai`. No provider wrapping.

```typescript
import type { LanguageModelV2 } from '@ai-sdk/provider';

export function createConcierge(opts: {
  model: LanguageModelV2;
  registry: ConciergeRegistry;
  models?: {
    plan?: LanguageModelV2;       // optional per-phase override
    simulate?: LanguageModelV2;
    propose?: LanguageModelV2;
    execute?: LanguageModelV2;
    record?: LanguageModelV2;
  };
}): Concierge;
```

**Env auto-detect** via `defaultModel()` helper (the pokaldot/kwala pattern, validated by SDK-DX-STUDY §B):

```typescript
export function defaultModel(spec = process.env.AI_MODEL): LanguageModelV2 {
  const [provider, model] = (spec ?? 'anthropic:claude-sonnet-4-6').split(':');
  switch (provider) {
    case 'anthropic': return anthropic(model);   // reads ANTHROPIC_API_KEY
    case 'openai':    return openai(model);      // reads OPENAI_API_KEY
    case 'google':    return google(model);      // reads GOOGLE_GENERATIVE_AI_API_KEY
    case 'xai':       return xai(model);         // reads XAI_API_KEY
    default: throw new Error(`Unknown provider: ${provider}`);
  }
}
```

**Per-call model override per tick phase** (NOT sub-clients — see SDK-DX-STUDY §C):

```typescript
const plan    = await generateText({ model: opts.models?.plan    ?? opts.model, ... });
const sim     = await generateText({ model: opts.models?.simulate ?? opts.model, ... });
const record  = await generateText({ model: opts.models?.record   ?? opts.model, ... });
```

**Stays Anthropic-only:** the autonomous tick worker (`apps/worker/`) uses `@anthropic-ai/claude-agent-sdk` for the multi-step tool-use loop with prompt caching. Users don't see this. The PUBLIC SDK / MCP / chat-API surfaces are all model-agnostic.

**Supersedes:** PRD line 54 deferral. Multi-LLM provider abstraction is IN SCOPE v1 — free win via Vercel AI SDK abstraction; cost is zero LOC of wrapping.

### ADR-017 — Three-rail generative UI on structured-JSON `outputSchema` contract (NEW 2026-06-09)

**Decision:** Concierge generative UI ships across THREE rails simultaneously. The load-bearing contract underneath all three is **structured JSON via `outputSchema` per tool** (ADR-014). No rail bets the wedge; if a rail isn't supported on a given host, the structured JSON fallback works.

**Rail 1 — Vercel AI SDK `tool-${name}` UI message parts** (`apps/web/` + any AI SDK consumer):
- Backend: `streamText({ tools: { propose: tool({ inputSchema, outputSchema, execute }), ... } })`
- Client: `messages.parts.map(p => p.type === 'tool-propose' ? <ProposalPart part={p} /> : ...)` with 4 states (`input-streaming` / `input-available` / `output-available` / `output-error`)
- Components from `@concierge-mantle/react-ui` (per ADR-015)

**Rail 2 — MCP Apps (`ui://concierge/*` HTML resources)** rendered as sandboxed iframes by Claude Desktop / ChatGPT / Goose / VS Code Insiders (SEP-1865, merged 2026-01-28):
- Tool def: `{ name, description, inputSchema, _meta: { ui: { resourceUri: "ui://concierge/proposal-card" } } }`
- Server registers HTML via `server.registerResource('ui://concierge/proposal-card', ...)` returning `text/html; profile=mcp-app`
- 4 resources to ship: `tick-card`, `proposal-card`, `portfolio-snapshot`, `reputation-receipt`
- **Draft spec — NOT load-bearing. Treated as opportunistic bonus.** Use `@mcp-ui/server@6.1.0` + `@mcp-ui/client@7.1.1`, audit for staleness at story time.

**Rail 3 — MCP Elicitation** for high-value confirmations + URL-mode handoffs:
- `ctx.mcpReq.elicitInput({ mode: 'form', message, requestedSchema })` — replaces the LLM-asked confirmation for actions exceeding the user-configured $ threshold (per ADR-006-ish risk gating)
- `ctx.mcpReq.elicitInput({ mode: 'url', elicitationId, url, message })` (SEP-1036) — wallet-connect / OAuth / session-key import handoff inside Claude Desktop
- Stable in MCP spec `2025-06-18`. Build against `@modelcontextprotocol/sdk@1.29`.

**The contract:** every Concierge tool ships with (a) `inputSchema` (Zod), (b) `outputSchema` (Zod) feeding MCP `structuredContent`, (c) a Vercel AI SDK tool-part card in `@concierge-mantle/react-ui` (via `uiCardId`), (d) optionally a `ui://` HTML resource for Rail 2.

**Reject:** rich UI types in MCP `content` blocks beyond `text` / `image` / `resource`. The stable MCP spec (`2025-11-25`) has only those. Rail 2 (MCP Apps) is the right venue.

### ADR-018 — Pure ESM, Node ≥ 22, peer-dep contracts, tree-shakeable (NEW 2026-06-09)

**Decision:** Every published package conforms to:

```jsonc
{
  "name": "@concierge-mantle/<package>",
  "type": "module",
  "sideEffects": false,
  "engines": { "node": ">=22" },
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" }
  },
  "files": ["dist", "README.md", "LICENSE"]
}
```

**No CJS dual.** Vercel AI SDK v6's stance — anyone who can't do ESM in 2026 is not our user.

**Peer-dep strategy** (per SDK-DX-STUDY §D):
- `zod` (peer `^3.25.76 || ^4.1.8`) — every package. Matches Vercel AI SDK v6's range.
- `react` (peer `^18 || ^19`) — `@concierge-mantle/react` + `@concierge-mantle/react-ui` + the two react-adapter packages.
- Framework SDK peer per adapter: `ai ^6` (in `@concierge-mantle/vercel-ai`), `@langchain/core ^1` (in `@concierge-mantle/langchain`), `@coinbase/agentkit ^1` (in `@concierge-mantle/agentkit`), `@modelcontextprotocol/sdk ^1.29` (in `@concierge-mantle/mcp`), `@assistant-ui/react ^0.14` (in `@concierge-mantle/react-assistant-ui`), `@copilotkit/react-core ^1.59` (in `@concierge-mantle/react-copilotkit`).
- **Runtime deps only on internal `@concierge-mantle/*` packages** (and `@ai-sdk/provider` for `@concierge-mantle/sdk`).

**Builder:** `tsup` (Vercel AI SDK uses it). Handcrafted `.d.ts` banned.

**Tree-shakeable** via named exports only + `"sideEffects": false`. (LangChain JS lost tree-shakeability for years because of this — don't repeat.)

**Publish CI** (`publish-packages.yml`): provenance enabled, npm tag per package, changesets-driven version bumps.

### ADR-019 — SDK ergonomics: errors, streaming, getting-started (NEW 2026-06-09)

**Errors:** Single base class with `type` discriminator (Stripe + Anthropic blend per SDK-DX-STUDY §F):

```typescript
export class ConciergeError extends Error {
  constructor(
    public readonly type: ConciergeErrorType,
    message: string,
    public readonly cause?: unknown,
  ) { super(message); }
}
export type ConciergeErrorType =
  | 'EModeNotEnabled'        // Aave silent-fail trap (the load-bearing gotcha — see research/concierge/03-providers/aave-v3-mantle.md)
  | 'InsufficientLiquidity'
  | 'OracleUnavailable'
  | 'AttestationFailed'
  | 'UserRejected'
  | 'NetworkUnsupported'
  | 'RpcError';
```

Reject `Result<T, E>` style — no major TS SDK uses it; idiomatic in Rust-shaped TS only; our judges + adopters don't expect it.

**Streaming:** Concierge ticks expose BOTH `for await` AsyncIterable AND `.on()` event emitter (per OpenAI + Anthropic pattern, SDK-DX-STUDY §G):

```typescript
const tick = concierge.tick();

// (1) AsyncIterable — primary surface
for await (const event of tick) {
  if (event.type === 'plan-delta') process.stdout.write(event.text);
  if (event.type === 'proposal') ui.showProposalCard(event.proposal);
  if (event.type === 'execute-done') break;
}

// (2) Event-emitter — sugar for named events
tick.on('proposal',     p => ui.showProposalCard(p));
tick.on('execute-done', r => ui.showReceipt(r));
const final = await tick.finalState();
```

Tick event types: `plan-delta` | `plan-done` | `simulate-done` | `proposal` | `decision` | `execute-start` | `execute-done` | `record-done` | `error`.

**Getting-started DX target** — 5-line minimum, env-auto-detect:

```typescript
import { createConcierge, defaultModel } from '@concierge-mantle/sdk';
import { ConciergeRegistry } from '@concierge-mantle/sdk/registry';

const concierge = createConcierge({
  model: defaultModel(),                   // env: AI_MODEL || ANTHROPIC_API_KEY
  registry: ConciergeRegistry.mainnet(),
});
await concierge.setGoal('Max USDC yield, stay under 70% LTV, keep $50 liquid');
for await (const event of concierge.tick()) { console.log(event); }
```

**`goal` is NOT a constructor arg** — `agent.setGoal(...)` is a separate method. Constructor side-effects = test hell (per SDK-DX-STUDY §I).

**`pnpm dlx` adapter install commands** for the README:

```bash
pnpm add @concierge-mantle/sdk                        # core
pnpm add @concierge-mantle/vercel-ai @concierge-mantle/sdk   # Vercel AI SDK consumers
pnpm add @concierge-mantle/langchain @concierge-mantle/sdk   # LangChain consumers
pnpm add @concierge-mantle/openai @concierge-mantle/sdk      # OpenAI / Anthropic raw tool-use consumers
pnpm add @concierge-mantle/agentkit @concierge-mantle/sdk    # Coinbase AgentKit consumers
pnpm add @concierge-mantle/react-ui                   # Just want our React cards
pnpm add @concierge-mantle/react-assistant-ui         # assistant-ui consumers
pnpm add @concierge-mantle/react-copilotkit           # CopilotKit / AG-UI consumers (LangGraph, CrewAI, Mastra, Pydantic AI)
```

---

## Server-side identity verification (LOCKED — added 2026-06-15, ADR-020)

Every `/api/*` route that touches user-scoped state runs through a single boundary: `verifyPrivyAuth(request)` in `apps/web/app/_lib/privyServer.ts`.

**Mechanism.**
- Client SDK (`@privy-io/react-auth`) issues a short-lived signed access token via `getAccessToken()`.
- Client sends it as `Authorization: Bearer <token>` on every authenticated `fetch`.
- Server verifies the token via `@privy-io/node` (v0.21+): `client.utils().auth().verifyAccessToken(token)` returns claims; the `userId` field is the canonical ownership key.
- Verification happens at the request boundary; downstream code receives a `{ userId }` object and NEVER reads identity from request body, query, or headers.

**Canonical pattern.**

```ts
// apps/web/app/api/<route>/route.ts
import { verifyPrivyAuth } from '../../_lib/privyServer';

export async function GET(request: Request) {
  const user = await verifyPrivyAuth(request);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  // user.userId is the trusted identity. Use it as the WHERE clause
  // for every agent / llm_keys / ticks / proposals read or write.
}
```

**Why not middleware?** Next.js Edge middleware cannot read Privy's client-side session state. The boundary lives in each route handler in the Node runtime; `runtime = 'nodejs'` is mandatory because `@privy-io/node` uses Node crypto primitives.

**Why not row-level security?** Postgres RLS adds an enforcement layer; we may add it later. The API-layer check is the load-bearing boundary today because every route already calls `verifyPrivyAuth` first.

**Env vars.**
- `NEXT_PUBLIC_PRIVY_APP_ID` — public, baked into the bundle.
- `PRIVY_APP_SECRET` — server-only, never sent to the browser. Read from `apps/web/.env.local` (gitignored) for dev; from secret manager in production.

**See also.** `docs/ux-spec.md` § Returning-user gate (the consuming client logic), `/Users/abu/.claude/plans/partitioned-discovering-truffle.md` § D1.

---

## CI requirements

Must pass on every commit:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  typescript:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run check
      - run: pnpm run typecheck
      - run: pnpm run test --reporter=verbose
      - run: pnpm run build
  contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: foundry-rs/foundry-toolchain@v1
      - run: forge install
      - run: forge fmt --check
      - run: forge build
      - run: forge test -vvv
      - run: forge coverage --report summary
  e2e:
    runs-on: ubuntu-latest
    needs: [typescript]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm run e2e
```

**All CI checks must be green before any PR merges. Never merge while CI is red.**

---

## Submission checklist gates (verified by coding agent before PR open)

### No mocks / no slop

- [ ] `grep -rE "(mock|fake|dummy|hardcoded)" apps/ packages/ contracts/src/` returns zero unjustified hits (test mocks + Sepolia playground mocks under `contracts/src/mocks/` are explicit carve-outs)
- [ ] All on-chain integrations hit real Mantle Mainnet or Mantle Sepolia (no localhost-only)
- [ ] No hardcoded rate numbers in components (must fetch from `/api/rates`)

### README shape

- [ ] `README.md` has: title, one-line pitch, demo URL, screenshot/GIF, run-locally steps, deployed contracts table, MCP install snippet, SDK quickstart, license, architecture diagram link, submission metadata
- [ ] `LICENSE` file (MIT) present
- [ ] Demo URL actually loads (not localhost)
- [ ] Multiple commits showing iteration (not one giant "initial commit")
- [ ] `pnpm install && pnpm dev` works in ≤ 10 minutes on a clean clone

### UI structure

- [ ] Header present on every UI surface (per `08-ux-component-intent.md` shared-component contract)
- [ ] Footer present on landing pages
- [ ] No placeholder copy ("John Doe", "lorem ipsum", "$1,234.56")
- [ ] Hover states on all interactive elements
- [ ] Loading + empty states implemented per `08-ux-component-intent.md`
- [ ] Keyboard navigation works end-to-end
- [ ] `prefers-reduced-motion` respected (no transitions when set)

### Smart contracts

- [ ] Mantle Mainnet `ConciergeRegistry` deployed + verified on MantleScan
- [ ] Session-key validator deployed + verified
- [ ] Sepolia playground mocks deployed + verified
- [ ] Foundry fuzz tests pass (≥ 256 runs each)
- [ ] Foundry invariant test passes (`collateral × LTV ≥ debt` always)
- [ ] No-mock checks pass on contract source

### Agent runtime

- [ ] ERC-8004 attestation written per successful Mainnet tick (verifiable on MantleScan)
- [ ] At least 10 attested ticks logged on Sepolia + real Mainnet ticks before submission
- [ ] Emergency Stop revokes session keys + halts cron (verified via test scenario)
- [ ] LLM cost guardrails (per-agent budget) enforced

### MCP server + Agent Skill (post-2026-06-09 rework)

- [ ] **Stdio (default):** `claude mcp add concierge -- npx -y @concierge-mantle/mcp` works from Claude Code / Desktop / Cursor / Windsurf / Goose
- [ ] **Hosted (optional):** `mcp.concierge.xyz/mcp` returns valid MCP handshake when bearer token configured
- [ ] **MCP Apps:** at least 4 `ui://concierge/*` HTML resources registered (tick-card / proposal-card / portfolio-snapshot / reputation-receipt); verified to render in Claude Desktop's MCP Apps iframe
- [ ] **MCP Elicitation:** `mode: 'form'` confirmation for high-value actions; `mode: 'url'` available for wallet-connect / OAuth handoff
- [ ] **Skill:** `npx skills add Blockchain-Oracle/concierge` installs across Claude Code / Codex / Cursor / OpenCode
- [ ] All rails (stdio MCP / hosted MCP / Skill / MCP Apps) documented in `docs` site

### SDK + npm packages (post-2026-06-09 rework — 15 packages total)

- [ ] **Foundation (3):** `@concierge-mantle/shared` + `@concierge-mantle/agent` + `@concierge-mantle/tools` published with full types
- [ ] **Providers (7):** `@concierge-mantle/{aave-v3-mantle, mantle-dex, ethena-susde, ondo-usdy, meth-staking, lifi-bridge, erc8004}` published
- [ ] **Framework adapters (4):** `@concierge-mantle/vercel-ai` + `@concierge-mantle/openai` + `@concierge-mantle/langchain` + `@concierge-mantle/agentkit` published
- [ ] **MCP (1):** `@concierge-mantle/mcp` published with stdio bin entry; `npx -y @concierge-mantle/mcp` runs cleanly
- [ ] **Components (4):** `@concierge-mantle/react` + `@concierge-mantle/react-ui` + `@concierge-mantle/react-assistant-ui` + `@concierge-mantle/react-copilotkit` published
- [ ] **Meta (1):** `@concierge-mantle/sdk` convenience re-export published
- [ ] Every package: ESM-only, Node ≥ 22, `sideEffects: false`, types via `tsup`, peer deps declared
- [ ] Every tool: ships `inputSchema` AND `outputSchema` per ADR-014
- [ ] Each package has a README, types, working 5-line example
- [ ] `pnpm add @concierge-mantle/sdk` from a fresh project + the 5-line `defaultModel()` quickstart works end-to-end
- [ ] At least one adapter verified working: `pnpm add @concierge-mantle/langchain` in an external LangChain app calls a Concierge tool successfully

### Submission deliverables

- [ ] DoraHacks submission filled (tracks nominated, Byreal capability answer, GitHub URL, demo URL, MCP URL, video URL, all contract addresses)
- [ ] Demo video ≥ 2 minutes recorded and hosted
- [ ] X thread tagged `#MantleAIHackathon` posted (or scheduled)
- [ ] Architecture diagram exported (`docs/architecture-diagram.svg` + README embed)
