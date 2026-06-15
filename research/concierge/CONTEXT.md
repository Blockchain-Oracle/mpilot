# mPilot — Domain Knowledge Folder

**Status:** Active — locked wedge as of 2026-06-03. Spec mode (sahil-spec-writer consumes this folder to produce `docs/PRD.md`, `docs/architecture.md`, `docs/ux-spec.md`, `docs/epics.md`, `docs/stories/`).

## What mPilot is (60 seconds)

mPilot is an **autonomous DeFi agent for Mantle** built for the Mantle Turing Test 2026 hackathon ($100K cash + ~$110K credits prize pool). The user sets a financial goal in plain English (*"maximize my stablecoin yield, stay under 70% Aave LTV"*); mPilot runs a continuous tick loop that plans → simulates → proposes → executes → attests each action on-chain via ERC-8004. The user watches the agent work in real time via streaming generative-UI cards, approves manually or grants autopilot per category, and can hit Emergency Stop at any moment.

**Four surfaces, one core:**
1. **Web app** (`mpilot.xyz/app`) — consumer-facing agent control + live tick stream
2. **npm SDK** (`@mpilot/sdk` + 7 `@mpilot/<provider>` packages) — "AgentKit for Mantle" — other Mantle devs install our action providers
3. **MCP server** (`mcp.mpilot.xyz/api/sse`) — Claude Code / OpenClaw / RealClaw can drive mPilot natively
4. **RealClaw skill** (`npx skills add @mpilot/mantle-agent`) — satisfies Mantle Turing Test Track 6 (Agentic Economy) "must use core capabilities of RealClaw" requirement

**Locked architecture:** TypeScript monorepo (Bun) · Next.js 15 app · Vercel AI SDK foundation · viem + ZeroDev ERC-4337 smart accounts · Foundry contracts · Postgres (Neon) + Redis (Upstash) · Claude Sonnet 4.6 (default LLM) · Anthropic SDK · MCP TypeScript SDK · Tambo or assistant-ui or custom shadcn (designer's call).

**Track strategy:** Agentic Economy (Byreal) primary via RealClaw skill packaging · Grand Champion · Best UI/UX · Community Voting (Sepolia playground for zero-capital judge access) · 20-Project Deployment Award.

## How to use this folder

Read in this order if you're an AI agent or new contributor:

| # | File | Purpose |
|---|---|---|
| 1 | `01-wedge-locked.md` | The product, the user, the pitch (one-pager) |
| 2 | `02-architecture.md` | Stack + ADRs (locked decisions with reasoning) |
| 3 | `03-providers/*.md` | Deep per-tool domain knowledge (one file per locked action provider) — addresses, ABIs, mechanics, integration pattern, risks |
| 4 | `04-agent-runtime.md` | Vercel AI SDK + Claude Agent SDK + tick loop pattern |
| 5 | `05-zerodev-erc4337.md` | Smart account + session keys |
| 6 | `06-realclaw-skill-pkg.md` | How to ship as a RealClaw skill (Track 6 qualifier) |
| 7 | `07-mcp-server-pattern.md` | MCP server as distribution channel |
| 8 | `08-ux-component-intent.md` | Every UI component: purpose, states, flows, transitions, accessibility (designer's brief) |
| 9 | `09-tracks-and-judges.md` | Prize tracks + judge thesis matching |
| 10 | `10-constraints.md` | Deadline, deliverables, submission requirements |

## Locked action providers (7)

| Provider | Mantle protocol | Source-of-truth file |
|---|---|---|
| `@mpilot/aave-v3-mantle` | Aave V3 (Pool `0x458F…1422`) | `03-providers/aave-v3-mantle.md` |
| `@mpilot/mantle-dex` | Merchant Moe + Agni + FusionX + WOOFi aggregator | `03-providers/mantle-dex.md` |
| `@mpilot/ethena-susde` | sUSDe (`0x211C…E5d2`) | `03-providers/ethena-susde.md` |
| `@mpilot/ondo-usdy` | USDY (bridged from Ethereum) | `03-providers/ondo-usdy.md` |
| `@mpilot/meth-staking` | mETH (Mantle's LST) | `03-providers/meth-staking.md` |
| `@mpilot/lifi-bridge` | Li.Fi multi-route bridging | `03-providers/lifi-bridge.md` |
| `@mpilot/erc8004` | Identity `0x8004…a432` + Reputation `0x8004…9b63` | `03-providers/erc8004.md` |

## What this folder is NOT

- Not a build plan (that's `docs/epics.md` + `docs/stories/` after sahil-spec-writer)
- Not visual design references (the designer doesn't need them — they're experts)
- Not conversation logs / decision history (clean domain knowledge only)
- Not the spec set itself (that's `docs/` after sahil-spec-writer fires)

## Status table

| File | Status | Owner |
|---|---|---|
| CONTEXT.md | ✅ done | direct |
| 01-wedge-locked.md | ✅ done | direct |
| 02-architecture.md | ✅ done | direct |
| 03-providers/aave-v3-mantle.md | ✅ done (1907w) | provider-research agent |
| 03-providers/mantle-dex.md | ✅ done (1820w) | provider-research agent |
| 03-providers/ethena-susde.md | ✅ done (1750w) | provider-research agent |
| 03-providers/ondo-usdy.md | ✅ done (1480w) | provider-research agent |
| 03-providers/meth-staking.md | ✅ done (1530w) | provider-research agent |
| 03-providers/lifi-bridge.md | ✅ done (Context7 + verified Diamond) | direct (overwrote agent version) |
| 03-providers/erc8004.md | ✅ done (Context7 + canonical ABIs) | direct (overwrote agent version) |
| 03-providers/_SUMMARY.md | ✅ done | direct |
| 04-agent-runtime.md | ✅ done (1907w) | runtime-research agent |
| 05-zerodev-erc4337.md | ✅ done (1857w) | runtime-research agent |
| 06-realclaw-skill-pkg.md | ✅ done (2200w) | runtime-research agent |
| 07-mcp-server-pattern.md | ✅ done (2055w) | runtime-research agent |
| _RUNTIME_SUMMARY.md | ✅ done | runtime-research agent |
| 08-ux-component-intent.md | 🛠️ in progress | direct write (this turn) |
| 09-tracks-and-judges.md | ✅ done | direct |
| 10-constraints.md | ✅ done | direct |

## Cross-references

- Active wedge brief (workspace, will be subsumed into 01 + 02): `workspace/candidates/2026-06-03-concierge-architecture.md`
- Archived Patron context (kept for reusable Mantle facts): `archive/patron-2026-06-02/`
- General Mantle research (transferable): `research/mantle-turing-test-2026/`
