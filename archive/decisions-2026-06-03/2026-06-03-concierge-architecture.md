# Concierge — Mantle Turing Test 2026 Architecture Brief

**Working name:** Concierge (TBD). Authored 2026-06-03 after Giza-deep-dive research wave.

**One-line pitch:** *"An autonomous AI agent that manages your Mantle wallet — bridges, swaps, lends, borrows, rebalances — on a tick loop you can subscribe to with one click. Every decision is ERC-8004-receipted on-chain, every action streams to you as a Tambo card you can approve or autopilot, and your agent runs from inside Claude Code, OpenClaw, or our web app."*

---

## The strategic moat: MCP server as agent surface

Giza's MCP server at `mcp.gizatech.xyz/api/sse` lets Claude Code / Claude Desktop / OpenClaw drive their agent natively. RealClaw (Byreal's flagship) IS OpenClaw-based. Judges + community users on OpenClaw/RealClaw can interact with Concierge without us shipping a single line of UI for them. Free distribution into the exact audience Mantle is courting.

No other hackathon team will think to ship MCP as a primary surface — they'll all ship web-only.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  USER SURFACES                                                       │
│  · Web app (Next.js + shadcn + Tambo cards)                         │
│  · Claude Code / Desktop / OpenClaw (via MCP server)                │
│  · Telegram Mini App (optional v1.1)                                │
└─────────────────────────────────────────────────────────────────────┘
                          ↓ ↑
┌─────────────────────────────────────────────────────────────────────┐
│  MCP SERVER (Next.js API + OAuth + Redis sessions)                  │
│  · /sse endpoint, Vercel-deployable                                 │
│  · Exposes 12-20 tools: bridge, swap, lend, borrow, LP, withdraw,   │
│    activate_agent, deactivate, get_portfolio, ...                   │
└─────────────────────────────────────────────────────────────────────┘
                          ↓ ↑
┌─────────────────────────────────────────────────────────────────────┐
│  AGENT TICK LOOP (Vercel AI SDK + custom orchestrator)              │
│  · plan() → simulate() → propose() → decide() → execute() → record()│
│  · Runs in Next.js API route (or Cloudflare Durable Object for     │
│    true long-running)                                               │
│  · BullMQ for cron + queue                                          │
└─────────────────────────────────────────────────────────────────────┘
                          ↓ ↑
┌─────────────────────────────────────────────────────────────────────┐
│  TOOL REGISTRY (Coinbase AgentKit's customActionProvider pattern,   │
│  exposed as Vercel AI SDK tool() defs)                              │
│  · Mantle DEX aggregation (Merchant Moe + Agni + FusionX)          │
│  · Aave V3 Mantle (supply, borrow, repay, E-Mode 1)                 │
│  · sUSDe vault (deposit, withdraw)                                  │
│  · ZeroDev session-key (sign + execute)                             │
│  · ERC-8004 (register, attest, read reputation)                     │
└─────────────────────────────────────────────────────────────────────┘
                          ↓ ↑
┌─────────────────────────────────────────────────────────────────────┐
│  ON-CHAIN (Mantle Mainnet 5000 + Sepolia 5003)                      │
│  · ERC-4337 Smart Account per user (ZeroDev validator)              │
│  · ERC-8004 Identity NFT + Reputation registry                      │
│  · Aave V3 Pool, sUSDe, USDY, mETH, Merchant Moe/Agni, USDC         │
└─────────────────────────────────────────────────────────────────────┘
                          ↓ ↑
┌─────────────────────────────────────────────────────────────────────┐
│  STATE                                                               │
│  · Postgres (Neon)    — agent state, tick history, action log       │
│  · Redis (Upstash)    — tick-in-flight locks, MCP OAuth sessions    │
│  · ERC-8004 on-chain  — canonical reputation track record           │
└─────────────────────────────────────────────────────────────────────┘
```

### The tick loop (unit of work)

Each tick (every N minutes, or triggered by a price/health event):

```typescript
async function tick(agentId: string) {
  const state = await loadAgentState(agentId);
  const lock = await redis.acquireLock(`tick:${agentId}`, 30_000);
  if (!lock) return; // another tick in flight

  try {
    const proposal = await plan(state);              // LLM picks next action
    const sim = await simulate(proposal, state);     // dry-run via viem
    if (sim.violatesConstraints) return;             // skip if outside guardrails
    await postProposalCard(agentId, proposal, sim);  // stream Tambo card

    const decision = await awaitDecision(proposal, {
      autopilot: state.autopilotEnabled,
      timeoutSec: 300,
    });
    if (decision !== 'approved') return;

    const tx = await execute(proposal, state);       // viem + ZeroDev
    await recordOnChain(agentId, tx);                // ERC-8004 attestation
    await recordOffChain(agentId, tx, proposal, sim);// Postgres history
  } finally {
    await lock.release();
  }
}
```

User flow: pick a goal (*"maximize stablecoin yield, stay within 70% Aave LTV"*) → hit Activate → Tambo cards stream in as the agent ticks → approve/reject/edit each one (or set autopilot per category) → history is a permanent ERC-8004 receipt train.

---

## Tech stack

| Layer | Choice | Repo · Stars |
|---|---|---|
| Frontend | Next.js 15 + shadcn/ui + Tailwind + **Tambo** for cards | tambo-ai/tambo · 11.2K★ |
| Agent runtime | **Vercel AI SDK** + Bun monorepo | vercel/ai · 24.6K★ |
| Tool pattern | **Coinbase AgentKit's `customActionProvider`** exposed as Vercel AI `tool()` defs | coinbase/agentkit · 1.2K★ |
| MCP server | Next.js + `@modelcontextprotocol/sdk` + OAuth + Redis sessions (clone giza-hub/packages/mcp-server shape) | gizatechxyz/giza-hub · 3★ (pattern reference) |
| Backend | Hono (or Next.js API routes) + Drizzle ORM + Postgres (Neon) + BullMQ on Redis (Upstash) | — |
| Smart account | **ZeroDev SDK** ERC-4337 + session keys (Mantle support claimed) | — |
| On-chain reads/writes | viem 2.x | — |
| Smart contracts | Solidity 0.8.26 + Foundry + OpenZeppelin v5; light layer over ERC-8004 + a small `ConciergeRegistry` for goal/policy storage | — |
| LLM | Claude Sonnet 4.6 or Opus 4.7 (Anthropic SDK) | — |
| Generative UI | Tambo primary, Assistant-UI fallback (assistant-ui/assistant-ui · 10.4K★) | — |
| Testing | Vitest + Playwright + Foundry fuzz/invariant | — |

---

## Track + judge alignment

**Primary tracks:**
- **Agentic Economy (Byreal)** — DeFi Deep Dive path: agent is packaged as a RealClaw-compatible skill (`npx skills add @mpilot/mantle-agent`) that runs Mantle DeFi strategies; satisfies "must use core capabilities of RealClaw" requirement without using Byreal Skills CLI (Solana-only) or Perps CLI (Hyperliquid-only)
- **Grand Champion** — high scores across all four dimensions (Tech Depth 30%, Innovation 25%, Mantle Ecosystem 25%, Product Completeness 20%)

**Secondary tracks stacked:**
- **Alpha & Data (Mirana)** — agent uses Nansen smart-money feed + Allora depeg signals as input to `plan()`; verifiable via ERC-8004 attestation trail
- **Best UI/UX** — Tambo card surface + onboarding flow + Claude Code MCP integration
- **Community Voting** — clickable testnet demo (deploy mocks on Mantle Sepolia like the prior Patron plan)
- **20-Project Deployment Award** — Mantle Mainnet smart contracts verified on MantleScan; ≥2 min demo video; public frontend; deployment addresses in DoraHacks submission

**Judge alignment matrix:**
| Judge | Thesis match |
|---|---|
| Allora | Verifiable inference output → ERC-8004 attestation per tick |
| Virtuals Protocol | Agent commerce protocol → MCP server + tool registry |
| Nansen | Smart money feed as `plan()` input (v1.1 provider) |
| Animoca | Consumer UX via Tambo cards |
| Z.ai | LLM as the planner |
| Byreal | RealClaw-skill packaging = official Byreal distribution channel |
| Mantle team | "Agents as Interface" thesis match; SDK = "AgentKit for Mantle" |
| BGA | Public good — open-source SDK + MCP server other Mantle agents can compose against |

---

## Risk register (Day 1 spikes)

1. **ERC-8004 contract addresses on Mantle.** Press releases confirm deployment but devhub docs don't surface ABIs. **Day 1:** verify on MantleScan + canonical `erc-8004/erc-8004-contracts` repo; stub `IAgentRegistry` shim if missing.

2. **ZeroDev ERC-4337 + session keys on Mantle.** ZeroDev claims support but untested at Mantle's gas/precompile semantics. **Day 1:** spike on Sepolia; fallback = EOA + signed-tx queue (less elegant but demo-safe).

3. **Tambo `TamboProvider` flexibility.** If too opinionated, ship-slop risk. **Day 1-2:** prototype card hierarchy with both Tambo AND Vercel AI SDK + custom shadcn cards; pick survivor.

4. **MCP server SSE-over-Vercel.** Vercel functions have execution limits; long-lived SSE may need Cloudflare Workers or Fly.io instead. **Day 2:** validate against actual long-running tick stream.

5. **Demo reliability.** Agent demos crash hard when LLMs hallucinate. **Day 8+:** record backup video; rehearse on presentation device.

---

## 12-day plan skeleton (refined in plan mode)

| Day | Focus | Deliverable |
|---|---|---|
| 1 | Spike all 5 risks; lock architecture or pivot to AgentArena (Kuest fork) | Risk register cleared |
| 2 | Monorepo scaffold (Bun + Next.js + Tambo + Vercel AI SDK + viem + Foundry) | `bun create` ships, CI green |
| 3 | Mantle Sepolia: deploy mock Aave + mock sUSDe + mock USDC + MockAaveOracle (reuse Patron pattern) + `ConciergeRegistry` contract | Sepolia mocks live + verified |
| 4 | First 4 tools: bridge (Li.Fi), swap (Merchant Moe + Agni aggregation), supply (Aave V3), withdraw | Tools callable via Vercel AI SDK |
| 5 | Tick loop + Postgres + Redis + plan/simulate/propose | Agent ticks once end-to-end |
| 6 | Tambo cards + approval UX + autopilot per-category | First card stream demo |
| 7 | MCP server + OAuth + 12-20 tools exposed | Concierge callable from Claude Code |
| 8 | ERC-8004 attestation per tick + reputation read SDK | On-chain reputation visible on MantleScan |
| 9 | Web app polish: onboarding, goal-setting, history, settings | Polished web UI |
| 10 | Mainnet deploy (real Aave + real sUSDe + real Merchant Moe/Agni); E-Mode 1 setup; RealClaw skill manifest published; live tick loop | Mainnet end-to-end + skill installable via `npx skills add` |
| 11 | Demo video (≥ 2 min); X thread; DoraHacks submission draft | Submission assets |
| 12 | Live demo rehearsal × 3; submit | Submitted |
| 13–15 | Buffer / Community Voting push | — |

---

## Why this beats the alternatives

- vs **AgentArena (Kuest fork)** — higher Tech Depth ceiling, MCP distribution moat, Mantle thesis match is unbeatable. AgentArena stays as plan B if Day-1 spikes blow up.
- vs **ClanArena (Clan World refactor)** — Concierge is broader-utility; agent that does *finance* is a bigger market than agent that plays *games*. ClanArena's Pixi.js polish is gorgeous but the wedge is narrower.
- vs **Original WalletConcierge (Morphic fork)** — Morphic is research, not execution. Concierge is the execution architecture you actually want.

## Locked v1 action providers (2026-06-03)

Seven providers, each ships as a separate `npm` package under the `@mpilot/*` namespace, all pre-registered in the main SDK:

1. **`@mpilot/aave-v3-mantle`** — `supply`, `borrow`, `repay`, `withdraw`, `set_e_mode`, `claim_rewards`, `get_health_factor` (Pool `0x458F293454fE0d67EC0655f3672301301DD51422`)
2. **`@mpilot/mantle-dex`** — `swap`, `quote`, `add_liquidity`, `remove_liquidity`, `collect_fees` (routes across Merchant Moe + Agni + FusionX; WOOFi aggregator as price-improvement layer)
3. **`@mpilot/ethena-susde`** — `deposit_susde`, `withdraw_susde`, `read_yield` (sUSDe `0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2`)
4. **`@mpilot/ondo-usdy`** — `mint_usdy`, `redeem_usdy`, `read_rate`
5. **`@mpilot/meth-staking`** — `stake_eth`, `unstake_eth`, `claim_restaking_rewards`
6. **`@mpilot/lifi-bridge`** — `bridge_in`, `bridge_out`, `quote_route` (Mantle ↔ Ethereum / Base / Arbitrum / Polygon)
7. **`@mpilot/erc8004`** — `register_agent`, `attest_action`, `read_reputation`, `give_feedback`, `read_all_feedback` (Identity Registry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`, Reputation Registry `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`)

**v1.1 add-ons (post-hackathon or stretch):** `@mpilot/byreal-perps` (if Hyperliquid bridge exists), `@mpilot/pendle` (fixed yield), `@mpilot/nansen-signal` (smart money input), `@mpilot/allora-inference` (depeg probability input).

**Track 6 qualification:** Concierge ships as a RealClaw-compatible skill installable via `npx skills add @mpilot/mantle-agent` — TypeScript, MIT, same pattern as `byreal-git/byreal-agent-skills` (verified 2026-06-03). The skill loads our 7 providers + tick loop + ERC-8004 attestation into Claude Code / OpenClaw / RealClaw. This satisfies "must use core capabilities of RealClaw" without depending on Byreal Skills CLI (Solana-only) or Perps CLI (Hyperliquid-only).

## Open questions before plan mode

- Name? (Concierge / Steward / Helm / Pilot / Skiff — TBD)
- Autopilot default — opt-in or opt-out?
- v1 scope: which 12-20 tools make the first cut?
- Sepolia mock-deploy: same as Patron pattern or trim?
- LLM choice: Sonnet 4.6 (faster, cheaper) or Opus 4.7 (smarter)?
