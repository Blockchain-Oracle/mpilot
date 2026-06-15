<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner-dark.svg">
    <img alt="mPilot" src="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner.svg" width="100%">
  </picture>
</p>

<h1 align="center">mPilot</h1>

<p align="center">
  <b>An autonomous agent that manages DeFi yield on Mantle — continuously, on-chain, and verifiable.</b><br/>
  You set a goal in plain English. The agent plans, executes, and proves every move on-chain.
</p>

<p align="center">
  <a href="https://mpilot.xyz">Website</a> ·
  <a href="https://www.npmjs.com/org/mpilot">npm</a> ·
  <a href="https://github.com/Blockchain-Oracle/mpilot">Source</a> ·
  <a href="https://mantlescan.xyz/address/0xE54B60382bC85C14abc15A20a0fB90d6FAea8025">Mainnet contract</a> ·
  <a href="https://mantlescan.xyz/tx/0x5d0fcdd38f44b1a07e279562587cf03a655eeb3cf2ba3cc1e5e9dc7022cb80ed">Live transaction</a>
</p>

---

## The problem

Earning yield in DeFi is a full-time job. Rates move every block, positions drift out of balance, and a single missed liquidation can wipe out a position. Few people can watch it around the clock, so they either leave yield on the table or take on silent risk. And when an automated strategy does act on their behalf, there is usually no way to audit what it did or whether it was any good.

## What mPilot does

You give mPilot a goal — for example, *"earn safe yield on my ETH"* — and it runs a continuous loop on Mantle:

1. **Plan** — reads the goal and live on-chain state, then selects the best action.
2. **Simulate** — dry-runs the candidate action first: expected yield change, resulting health factor, and risk flags.
3. **Propose** — surfaces the action with a plain-English rationale, for auto-approval or manual confirmation.
4. **Execute** — signs and submits the transaction through an ERC-4337 session key.
5. **Record** — writes an ERC-8004 reputation attestation on-chain, building a permanent, auditable track record.

It is not a chatbot with a wallet. It takes real actions across seven Mantle protocols — Aave V3, Mantle DEXes, Ethena sUSDe, Ondo USDY, mETH staking, Li.Fi, and ERC-8004 — and every action is verifiable on-chain.

## Architecture

<p align="center">
  <img alt="mPilot architecture" src="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/architecture.svg" width="92%">
</p>

## Real-world-asset yield

mPilot acts on two real-world-asset yield sources already tokenized on Mantle:

- **Ondo USDY** — tokenized US Treasuries. mPilot reads USDY's on-chain redemption-price oracle to track real Treasury yield (around 5%).
- **mETH** — ETH staking yield. mPilot reads the mETH exchange rate, where staking rewards accrue block by block, and can enter and exit an mETH position via DEX swap on Mantle.

Risk management is built in throughout: simulate-before-execute, spending caps, health-factor checks, and a one-tap emergency stop.

## One core, four surfaces

Most agents ship as a single web application. mPilot's core is a composable primitive — the same agent is usable from anywhere, and every layer is published on npm:

| Surface | Usage |
|---------|-------|
| Web app | The reference dashboard. |
| MCP server | `npx -y @mpilot/mcp` — runs inside Claude Desktop and any MCP host. |
| npm SDK | `pnpm add @mpilot/sdk` — drop mPilot's Mantle DeFi tools into any agent. |
| Agent skill | `npx skills add Blockchain-Oracle/mpilot` — installs into agent hosts. |

All four hang off one framework-agnostic tool registry, so each additional surface is roughly 30 lines of adapter code. Twenty-two packages are published under [`@mpilot/*`](https://www.npmjs.com/org/mpilot).

## Live on Mantle mainnet

<p align="center">
  <img alt="mPilot mainnet deployment" src="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/mainnet-card.svg" width="68%">
</p>

| | Address |
|---|---|
| Registry (UUPS proxy) | [`0xE54B…8025`](https://mantlescan.xyz/address/0xE54B60382bC85C14abc15A20a0fB90d6FAea8025) |
| Implementation | [`0xc784…4761`](https://mantlescan.xyz/address/0xc784362387E1DCD2A99D1000d9c852F4EA244761) |

The agent registered its own ERC-8004 identity (agent #133) on mainnet — [view the transaction](https://mantlescan.xyz/tx/0x5d0fcdd38f44b1a07e279562587cf03a655eeb3cf2ba3cc1e5e9dc7022cb80ed).

## Quickstart

Use mPilot's tools in your own agent:

```bash
pnpm add @mpilot/sdk @mpilot/agent
```

```ts
import { createConciergeClient } from '@mpilot/sdk';

const mpilot = createConciergeClient({ agentId: '133', baseUrl: 'https://mpilot.xyz' });
const reputation = await mpilot.getReputation('133'); // the agent's on-chain track record
```

Plug the agent into Claude Desktop:

```bash
npx -y @mpilot/mcp
```

Run the monorepo locally:

```bash
git clone https://github.com/Blockchain-Oracle/mpilot.git
cd mpilot
pnpm install
pnpm -r build
pnpm --filter @mpilot/web dev   # http://localhost:3000
```

Requires Node 22+ and pnpm. Foundry is needed only for the `contracts/` package.

## Limitations and roadmap

- **USDY is monitoring-focused today.** Its on-chain yield is read live, but USDY's DEX liquidity on Mantle is currently thin, so mPilot surfaces the opportunity rather than forcing a low-liquidity swap. mETH entry and exit are live.
- **mETH `acquire` is implemented and unit-tested but not yet wired into the live agent loop or dashboard.** It works at the provider level; end-to-end integration is the next step.
- **Roadmap:** wire mETH acquire into the agent and dashboard, deepen USDY routing as liquidity grows, and ship a public hosted deployment.

## Built with

Mantle · ERC-8004 (on-chain agent identity and reputation) · ERC-4337 session keys · Aave V3 · Mantle DEXes (Merchant Moe, Agni, FusionX) · Ethena sUSDe · Ondo USDY · mETH · Li.Fi · TypeScript · Foundry · Vercel AI SDK · Model Context Protocol.

## Repository layout

```
packages/    22 published @mpilot/* libraries — agent core, tools, 7 providers, 4 adapters, MCP, SDK, UI
apps/        web (Next.js dashboard) and worker (autonomous tick loop)
contracts/   Foundry — the registry deployed to Mantle mainnet
assets/      brand kit, architecture diagram, deployment cards
docs/        architecture, PRD, UX spec
```

## License

MIT © [Blockchain-Oracle](https://github.com/Blockchain-Oracle)
