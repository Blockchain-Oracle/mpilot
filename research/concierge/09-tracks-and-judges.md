# Concierge — Tracks & Judges

## Prize tracks (Mantle Turing Test 2026 — AI Awakening Phase 2)

Total prize pool: **$100K cash + ~$110K credits.** Submission deadline: **2026-06-15 15:59 UTC**.

### Primary track: Agentic Economy (Byreal-sponsored)

**Path:** DeFi Deep Dive — *"Use Byreal Agent Skills / Byreal Perps CLI / RealClaw to explore advanced on-chain trading strategies."*

**How Concierge qualifies:** RealClaw skill packaging (NOT Byreal Skills CLI which is Solana-only, NOT Byreal Perps CLI which is Hyperliquid-only). Concierge ships as `npx skills add @concierge-mantle/mantle-agent` — a TypeScript skill installable into Claude Code / Claude Desktop / OpenClaw / RealClaw. Pattern verified via `byreal-git/byreal-agent-skills` itself (TS MIT, distributable via `npx skills add`) and `Magicianhax/mantle-active-trader` (Python RealClaw skill for Mantle).

**Scoring (this track):**
- General (70%): Byreal integration depth · Agent autonomy · Technical completeness · Sustainability
- Track-specific Strategy Alpha (30%): Strategy complexity + verifiability (backtesting / live trading / on-chain records)

**Concierge's strengths in this track:**
- **Byreal integration depth** = RealClaw skill packaging (the canonical distribution channel)
- **Agent autonomy** = tick loop running 24/7 with session-key auto-execute (autopilot mode per category)
- **Technical completeness** = 7 action providers + smart account + ERC-8004 attestation + MCP server + SDK + web app (full stack)
- **Sustainability** = open-source MIT, 7 published npm packages, MCP-discoverable, public infra primitive for future Mantle builders
- **Strategy Alpha** = autonomous yield optimization with verifiable on-chain track record (every tick = ERC-8004 attestation = backtestable forever)

**Submission answer to "Which Byreal on-chain capabilities does your project use?":**
> *"Concierge ships as a RealClaw-compatible skill installable via `npx skills add @concierge-mantle/mantle-agent` — packaging Concierge's autonomous DeFi agent into the official Byreal/RealClaw distribution channel. The skill exposes 7 Mantle-native action providers (Aave V3, Mantle DEX aggregation, Ethena sUSDe, Ondo USDY, mETH staking, Li.Fi bridging, ERC-8004 identity/reputation) callable from any RealClaw-compatible client. Every action the agent takes is signed via an ERC-4337 session key the user controls and recorded as a permanent ERC-8004 reputation attestation on Mantle."*

### Stacked track: Grand Champion (any track, weighted across dimensions)

**Scoring weights:**
| Dimension | Weight | Concierge score (self-estimate) |
|---|---|---|
| Technical Depth (AI × on-chain integration, architecture completeness, code quality) | 30% | **9/10** — full agent runtime, smart account layer, 7 providers, MCP server, on-chain attestation per tick, comprehensive test suite |
| Innovation (originality, new AI × Web3 paradigm) | 25% | **8/10** — first AgentKit-equivalent for Mantle, first ERC-8004 native consumer agent, MCP distribution into Mantle's emerging power-user surface |
| Mantle Ecosystem Contribution (substantive use of Mantle, long-term value) | 25% | **10/10** — composes 6 Mantle protocols, uses ERC-8004 verbatim, publishes 7 npm packages other Mantle devs reuse, ships infrastructure not just an app |
| Product Completeness (runnable demo, UX, scalability) | 20% | **8/10** — web app + SDK + MCP server + skill all live by Day 12; Mainnet deploy + Sepolia playground for zero-capital judge access |

Estimated weighted: **8.85 / 10.** Strong Grand Champion candidate.

### Stacked track: Alpha & Data (Mirana Ventures)

**Path:** Trading Strategy [AI-Driven] — *"Build executable AI trading agents that generate verifiable on-chain Alpha."*

**How Concierge could also qualify:** The agent's `plan()` step can optionally consume Nansen smart-money labels + Allora depeg-probability signals (v1.1 providers) and generate trading strategies. The verifiability requirement is satisfied by ERC-8004 attestation per action (permanent on-chain record).

**Caveat:** v1 focus is yield-optimization not aggressive trading. We can pitch Alpha & Data secondary but Agentic Economy is the primary slot.

### Stacked track: Best UI/UX

**Scoring weights:**
| Dimension | Weight | Concierge approach |
|---|---|---|
| Visual Design (30%) | Designer-agent handles · brand tokens + cohesive design system across landing + app + docs |
| Interaction & Flow (30%) | Onboarding flow → goal-set → activate → live tick stream → approval/autopilot UX → ERC-8004 receipt viewer |
| AI Interaction Design (25%) | Live tick cards stream reasoning text + status pill transitions + nested simulation/execution cards — "the AI is visibly thinking" |
| Accessibility (15%) | Keyboard nav, screen reader, motion-reduce, light/dark, mobile-responsive |

The "live agent thinking visible" pattern (status pill animations + streaming reasoning + nested confirmation cards) is the demo wow factor. Best UI/UX is a stackable win if the designer delivers.

### Stacked track: Community Voting

**What wins here:** clear/compelling demo, real pain point, shareability.

**Concierge approach:** Sepolia playground (mock-deploy pattern reused from archived Patron — `MockAavePool`, `MockSUSDe`, `MockUSDC`, `MockAaveOracle`) + faucet so anyone can click-through the full agent flow with zero capital. The demo video + X thread + clickable testnet experience = viral asset. The pitch resonates: *"a robo-advisor you actually own, that proves itself on-chain."*

### Stacked track: 20-Project Deployment Award

**Requirements (must hit all):**
- ✅ Smart contract on Mantle Mainnet, verified on MantleScan (`ConciergeRegistry` + session-key validator by Day 10)
- ✅ AI-powered function callable on-chain (`giveFeedback` attestation triggered by agent tick = AI-powered function on-chain)
- ✅ Public frontend (`concierge.xyz/app` on Vercel)
- ✅ Deployment address in DoraHacks submission
- ✅ ≥ 2 min demo video walking through core use case
- ✅ Open-source GitHub repo with comprehensive README

First-come-first-served, 20 spots — submission timing matters because the award is awarded to the first 20 projects that hit deployment milestones. Submit when quality is met; the window is the prize-doc's documented cutoff.

### What we are NOT pursuing

- ❌ **AI × RWA Track** — Mantle's stated thesis matches, but Abu has fatigue on RWA-shaped wedges (lost Patron there). USDY/sUSDe show up as *positions* in Concierge, not the pitch. Skip primary qualification.
- ❌ **AI Trading & Strategy** track separately — overlapping with Alpha & Data; we don't need to chase both.

## Judges (confirmed panel)

| Judge | Org | Thesis match for Concierge | Surface to emphasize |
|---|---|---|---|
| **Allora** | Decentralized AI inference | Verifiable agent output via ERC-8004 attestation; future Allora signal as plan() input | ERC-8004 reputation page |
| **BGA (Blockchain for Good Alliance)** | Crypto-for-good | Open-source SDK + MCP server = public good for Mantle ecosystem | MIT license, npm packages |
| **Nansen** | On-chain analytics | Smart-money labels as future plan() input (v1.1); Mantle on-chain Verifiability | Live tick stream + tx history |
| **Z.ai** | AI infrastructure | LLM-as-planner pattern; Claude Sonnet 4.6 + Opus 4.7 routing | Architecture story |
| **Four Pillar** | Web3 research | Multi-surface play (consumer + dev SDK + MCP) shows market understanding | SDK + MCP server pitch |
| **Animoca Brands** | Consumer/gaming | Tambo-style live agent visibility UX | Web app demo |
| **DoraHacks** | Hackathon platform | Submission completeness + verified addresses + demo video | Submission checklist hit |
| **Elfa AI** | AI agent infrastructure | Mantle-native action providers; SDK positioning | npm packages + provider docs |
| **Virtuals Protocol** | Agent commerce | MCP-server distribution + ERC-8004 identity per agent | MCP + identity story |
| **Hashed** | VC | Long-term value of "AgentKit for Mantle" positioning | SDK roadmap |
| **Caladan** | Market making | Agent autonomy + on-chain track record | Tick stream + reputation page |
| **University of Hong Kong** | Academic | Architecture rigor + open-source contribution | Codebase quality + docs |

## What each judge sees on Demo Day

A judge clicks `concierge.xyz` → sees the landing → clicks "Try on Sepolia" → lands in `/app` → faucet mints them mock sUSDe + USDC → they set a goal → click activate → watch the agent tick → approve actions → see ERC-8004 receipts on Sepolia → can `npx skills add @concierge-mantle/mantle-agent` in their own Claude Code → drive the same agent from there. They `npm install @concierge-mantle/sdk` in a sample app → build their own agent in 5 minutes. They visit `concierge.xyz/agent/:id` and see a public reputation page for a real-money Mainnet agent.

Every judge thesis touched. Every track requirement hit. Every demo step is clickable.

## What we tell judges in the DoraHacks submission

1. **One-line pitch** (verbatim from `01-wedge-locked.md`)
2. **Which Byreal capabilities** — RealClaw skill packaging answer
3. **What role AI plays** — Claude Sonnet/Opus as the agent planner; ERC-8004 attestation as verifiability; tick loop autonomy
4. **How it's realized on Mantle** — 7 protocol integrations, ERC-8004 + ERC-4337 native, mainnet-verified contracts, 7 npm packages other Mantle devs compose against
5. **Open-source repo** — link
6. **Live demo URLs** — `concierge.xyz`, `concierge.xyz/app`, `mcp.concierge.xyz`, RealClaw skill install command
7. **Mainnet contract addresses** — verified on MantleScan
8. **Demo video** — ≥ 2 min walkthrough
