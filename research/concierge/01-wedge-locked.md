# mPilot — Locked Wedge

## One-line pitch

*"mPilot is an autonomous AI agent for Mantle that runs your DeFi strategy 24/7 — set a plain-English goal, watch it bridge, swap, lend, borrow and rebalance in real time, and approve or autopilot every move with on-chain ERC-8004 receipts you can audit forever."*

## The product

A user lands on `mpilot.xyz`, signs in with their wallet, sets a financial goal in plain English (e.g., *"max stablecoin yield, never breach 70% Aave LTV, keep ~$200 USDC liquid"*), and grants mPilot a scoped session key. From that moment, an agent owned by the user (one ERC-8004 Identity NFT per user) runs a continuous tick loop every N minutes:

1. **`plan()`** — Claude Sonnet 4.6 picks the next action from the user's available 7 action-provider tool surface, given current portfolio state + goal + policy
2. **`simulate()`** — viem dry-runs the transaction, checks health-factor / slippage / exposure constraints
3. **`propose()`** — streams an "action card" to the user's web app + MCP-connected clients (Claude Code / OpenClaw / RealClaw)
4. **`decide()`** — user approves manually OR a session key auto-signs (per-category autopilot policy)
5. **`execute()`** — ERC-4337 UserOperation via ZeroDev kernel sends the on-chain tx
6. **`record()`** — Postgres history row + on-chain ERC-8004 reputation attestation (`giveFeedback` to the agent's own identity NFT)

The user sees the tick cards stream in real time: status pill animates `pending → planning → simulating → proposing → awaiting approval → executing → confirmed → attested`. Reasoning text streams *inside* each card character-by-character. The on-chain tx hash links to MantleScan once confirmed. The ERC-8004 reputation attestation is verifiable forever.

## The user

- Mantle/Bybit-adjacent DeFi user holding stablecoins (USDC), staking assets (mETH), or RWA yield tokens (sUSDe, USDY)
- Wants the yield + flexibility of active DeFi management without spending hours per week on it
- Wants an audit trail (ERC-8004 reputation) — not a black-box yield optimizer
- Knows what BNPL / autotrading / robo-advisors are; wants the agent-economy version
- Comfortable with Claude Code / Claude Desktop / OpenClaw / RealClaw clients (Mantle's emerging power-user surface)

## Why this wedge wins

1. **Mantle's stated thesis is "Agents as Interface."** The Turing Test hackathon literally exists to seed agent-economy products on Mantle. mPilot is the canonical reference of that thesis — multi-tool, autonomous, ERC-8004-attested, Byreal/RealClaw-distributable. Hit the bullseye of Mantle Ecosystem Contribution (25% Grand Champion weight).

2. **ERC-8004 has no flagship consumer surface yet.** Mantle deployed canonical contracts in Feb 2026 but no downstream dApps consume them as a primitive. mPilot makes the registry visible — every user has an agent NFT, every action has a reputation receipt. Allora (judge) cares about verifiable inference; ERC-8004 attestation per action is the right answer for a hackathon (zkML adds weeks for marginal score gain).

3. **MCP server distribution moat.** mPilot ships its tool surface via MCP — drivable from Claude Code / Claude Desktop / OpenClaw / RealClaw natively. Judges and community users on those clients drive mPilot without us shipping any extra UI for them. Free distribution into the exact audience Mantle is courting.

4. **SDK positioning ("AgentKit for Mantle").** Other Mantle developers `npm install @mpilot/sdk` and drop our 7 action providers into their own agents. Becomes infrastructure other builders compose against. Coinbase AgentKit's playbook, ported.

5. **Multi-track stacking.** Agentic Economy (Byreal) qualifies via RealClaw skill packaging (verified pattern). Grand Champion via full-stack execution. Best UI/UX via the live tick-card stream. Community Voting via Sepolia playground (mock-deploy pattern from archived Patron is reusable). 20-Project Deployment Award via Mainnet contract + verified frontend + ≥2 min demo.

## Why this beats the alternatives

- **vs `AgentArena` (Kuest fork)** — Higher Tech Depth ceiling, MCP-server moat is unique, Mantle Ecosystem Contribution unbeatable. AgentArena is plan B if Day-1 spikes fail (kept warm in `workspace/candidates/2026-06-03-concept-pool.md`).
- **vs `ClanArena` (Clan World refactor)** — mPilot is broader-utility (finance agent > game agent), bigger TAM, better SDK positioning. ClanArena's polish is gorgeous but wedge is narrower.
- **vs original Patron (BNPL)** — mPilot isn't yield-spread-dependent (Patron died on sUSDe yield compression); mPilot's value prop is *agent autonomy + auditability*, not a carry trade.

## What we are NOT building (explicit scope cuts)

- ❌ Cross-chain agent execution beyond Li.Fi bridging (no Solana, no L1, no non-EVM)
- ❌ zkML / verifiable inference proofs (ERC-8004 attestation is the verifiability claim; zkML adds weeks for marginal gain)
- ❌ Perps trading in v1 (defer to v1.1 — Byreal Perps CLI is Hyperliquid-only anyway)
- ❌ NFT trading (Mantle has near-zero NFT culture; weak ROI)
- ❌ Custom prediction markets (that's AgentArena's wedge, plan B)
- ❌ Multi-agent swarms / committees (one agent per user, simpler ship)
- ❌ Pre-built canned strategies UI (we describe goals, agent picks actions — orthogonal value)

## Naming

Working name: **mPilot** (clean, explains itself in 5 seconds, sets the user-as-principal / agent-as-steward frame). Designer may iterate; if rebrand happens, it's a find/replace on `@mpilot/*` packages + domain. Final name lock by Day 2.

## Pitch openers (verbatim use)

- **30s pitch (for judges + X thread):** *"mPilot is an autonomous AI agent for Mantle. You tell it your DeFi goal in plain English; it bridges, swaps, lends, borrows and rebalances 24/7. Every action it takes is signed by a session key you control and recorded on-chain via ERC-8004 — so you have a verifiable, permanent receipt of every move your agent made and why. Like a robo-advisor that you actually own, on the chain Mantle built for agents."*

- **1-sentence X-thread opener:** *"Mantle gave us ERC-8004 in February. Six months later, nobody's actually composed against it as a primitive — until now."*

- **Demo opener (judge walkthrough):** *"This is mPilot. The agent in front of you isn't running locally — it lives at mpilot.xyz/app, and it's also installable in your Claude Code right now via `npx skills add @mpilot/mantle-agent`. I'm about to set a goal in English. Watch what happens."*

## Definition of done (what "shipped" means)

- Mantle Mainnet contracts deployed + verified on MantleScan: `ConciergeRegistry`, agent session-key validator
- 7 npm packages published: `@mpilot/sdk` + 7 providers (`@mpilot/aave-v3-mantle`, `@mpilot/mantle-dex`, `@mpilot/ethena-susde`, `@mpilot/ondo-usdy`, `@mpilot/meth-staking`, `@mpilot/lifi-bridge`, `@mpilot/erc8004`)
- Web app live at `mpilot.xyz` with full landing + `/app` + `/docs`
- MCP server live at `mcp.mpilot.xyz/api/sse`, drivable from Claude Code / Claude Desktop / OpenClaw / RealClaw
- RealClaw skill installable via `npx skills add @mpilot/mantle-agent`
- Real Mainnet ticks logged (real capital under management — proves it actually runs, not a demo-mode stub)
- ≥ 2 min demo video walking through goal-set → tick stream → approval → execution → ERC-8004 receipt → /agent/:id reputation page
- X thread tagged `#MantleAIHackathon` with verified Mainnet addresses
- DoraHacks submission with everything linked
- Every quality standard from `10-constraints.md` cleared
