# Phase 2: Sponsor Docs + SDK Pass
**Captured:** 2026-06-02
**Subagent:** sponsor-docs
**Hackathon:** Mantle Turing Test Hackathon 2026 — Phase 2 "AI Awakening" ($100k pool across 6 tracks)

---

## 1. Mantle Network

### What it is
Mantle is an **Ethereum L2** built on the **OP Stack** with **EigenDA / Mantle DA** as its data-availability layer. Tagline in 2026 is "the liquidity chain of the future" / "full-stack on-chain banking infrastructure." Mantle officially calls itself a Layer 2 with a modular DA module.

The big 2026 positioning shift: **Mantle is doubling down on AI agents + RWA as its first-class use case**, not as edge-case experiments. They co-authored ERC-8183 (Agent Commerce Protocol) and deployed ERC-8004 (Trustless Agents) on mainnet Feb 16 2026.

### Chain info (verified)

| Field | Mainnet | Sepolia Testnet |
|---|---|---|
| Chain ID | **5000** (0x1388) | **5003** |
| RPC | `https://rpc.mantle.xyz` | `https://rpc.sepolia.mantle.xyz` (Chainlink-supported) |
| Explorer | `https://mantlescan.xyz` and `https://explorer.mantle.xyz` | `https://sepolia.mantlescan.xyz` |
| Native gas token | **$MNT** | Sepolia $MNT |
| Faucet | n/a | `https://faucets.chain.link/mantle-sepolia` + Mantle docs faucet |

Note: Mantle migrated **Sepolia testnet to EigenDA** in mid-2026 (referenced in docs.mantle.xyz). The 2026 mainnet release is called **"Mantle v2 Arsia"** with new **Hoodi Testnet** also announced.

Sources:
- https://chainlist.org/chain/5000
- https://chainlist.org/chain/5003
- https://docs.mantle.xyz (root)
- https://www.mantle.xyz/blog/developers/getting-onboarded-to-mantle-mainnet

### Ecosystem state (Q2 2026)
- TVL: **$755M+** in Q1 2026 (Nansen Q1 2026 report). Mantle Vault alone reached $200M TVL. Stablecoins on Mantle hit new ATH in Q2 2026.
- mETH (liquid-staked ETH): **$791.7M** in ETH locked, 4.0% APY native yield
- USDY (Ondo): **~$29M** tokenized on Mantle
- fBTC (Function): ~$1.5B TVL (cross-chain BTC, 1:1 peg)
- MI4 (Mantle Index Four fund): $400M allocated, BTC/ETH/SOL/stablecoins basket with DeFi-native yield strategies (uses mETH, bbSOL, sUSDe under the hood)
- "Mantle AI Agent Skills" and "Agent Scaffold" announced live in 2026
- X402 protocol integration (with Questflow) — micropayments for agent-to-agent commerce

Sources:
- https://nansen.ai/post/mantle-q1-2026-report
- https://app.rwa.xyz/networks/mantle
- https://www.mantle.xyz/dapp
- https://blockchainreporter.net/mantle-integrates-x402-protocol-to-power-web3-automation-in-collaboration-with-questflow/

### Mantle's AI/agent narrative
Mantle is positioning itself as the **settlement layer for autonomous agent commerce**. The stack:
1. ERC-8004 identity/reputation/validation (deployed mainnet Feb 2026)
2. ERC-8183 (Agent Commerce Protocol, co-authored with EF + Virtuals)
3. X402 micropayments
4. Native RWA primitives (USDY, mETH, fBTC, MI4) as the "real economy" agents transact against
5. Bybit's Byreal/OpenClaw stack as the agent dev-experience layer

This is why the hackathon emphasizes "AI agents as sovereign economic participants." The infra is in place.

---

## 2. Byreal (Agent Skills / Perps CLI / RealClaw)

**Byreal is the GitHub org `byreal-git`** (not byreal.io, though that's the website). Built/sponsored by Bybit. Surprisingly, **Byreal's CLMM DEX is on SOLANA, not Mantle** — this is critical. Perps trade on **Hyperliquid**. The Mantle connection is via the **RealClaw** packaging and the broader "Agentic Economy" track positioning.

### 2.1 `byreal-git/byreal-agent-skills` — CLMM Skill (44 stars, MIT)
https://github.com/byreal-git/byreal-agent-skills

> "byreal-cli for AI agent" — Agent skills for Byreal, a concentrated liquidity (CLMM) DEX on Solana. Every command supports structured JSON output, and the built-in skill system lets AI agents discover and use all capabilities automatically.

**Install as OpenClaw Skill:**
```bash
npx skills add byreal-git/byreal-agent-skills
```

**Install CLI only:**
```bash
npm install -g @byreal-io/byreal-cli
```

**Quickstart:**
```bash
byreal-cli setup                              # interactive wallet setup
byreal-cli pools list --sort-field apr24h     # top pools by APR
byreal-cli pools analyze <pool-address>       # APR/risk/range
byreal-cli swap execute \
  --input-mint So11111111111111111111111111111111111111112 \
  --output-mint EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v \
  --amount 0.1 --dry-run                      # SOL → USDC preview
byreal-cli positions copy --position <addr> --amount-usd 100 --confirm
```

**Auto-Swap (Zap)** — single-token LP entry: backend computes optimal split, swap + deposit atomic. Use `--auto-swap` on `positions open/increase/decrease/close`. Quotes HMAC-signed, 30s TTL, auto-retry.

**Capabilities:** pools (list, info, klines, analyze), tokens (list, prices), swap, positions (open, close, increase, decrease, claim, claim-rewards, claim-bonus, analyze, top-positions, copy), wallet, config.

Capability discovery commands an agent uses:
```bash
byreal-cli skill                # complete documentation
byreal-cli catalog list         # all capabilities with params
byreal-cli catalog show <id>    # detailed param info
```

Hard constraints from the skill manifest (relevant for AI agents):
- Use `-o json` only for parsing — never re-render charts yourself
- Never truncate on-chain addresses / signatures
- Private keys stored at `~/.config/byreal/keys/` mode 0600 — never transmitted
- `--dry-run` first, `--confirm` second
- >$1000 needs explicit user confirm; >200bps slippage must warn

### 2.2 `byreal-git/byreal-perps-cli` — Hyperliquid Perps Skill (1 star, MIT)
https://github.com/byreal-git/byreal-perps-cli

> "AI-native CLI for Byreal Hyperliquid perpetual futures trading"

**Install as Skill:**
```bash
npx skills add byreal-git/byreal-perps-cli
```

**Install CLI only:**
```bash
npm install -g @byreal-io/byreal-perps-cli
```

**Quickstart:**
```bash
byreal-perps-cli account init                            # no private key needed
byreal-perps-cli account info
byreal-perps-cli position leverage BTC 10
byreal-perps-cli order market buy 0.01 BTC --tp 110000 --sl 90000
byreal-perps-cli order limit sell 1 ETH 4000
byreal-perps-cli position list
byreal-perps-cli position tpsl BTC --tp 110000 --sl 90000
byreal-perps-cli position close-market BTC
byreal-perps-cli position margin BTC add 100
byreal-perps-cli position close-all -y
byreal-perps-cli signal scan                             # market signals
byreal-perps-cli signal detail BTC                       # TA per coin
```

**Capabilities:** account (init, info, history), order (market, limit, list, cancel, cancel-all), position (list, tpsl, close-market, close-limit, close-all, margin, leverage), signal (scan, detail), catalog (list, search, show).

### 2.3 `byreal-git/byreal-sdk` — TypeScript SDK (3 stars, MIT)
https://github.com/byreal-git/byreal-sdk

```bash
npm install @byreal-io/byreal-sdk
```

```typescript
import { Connection } from "@solana/web3.js";
import { ByrealSDK } from "@byreal-io/byreal-sdk";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const sdk = new ByrealSDK({ connection });

// List pools
const poolsResult = await sdk.pools.list({ pageSize: 10, sortField: "tvl", sortType: "desc" });

// Swap quote
const quote = await sdk.swap.getQuote({
  inputMint: "So11111111111111111111111111111111111111112",
  outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  amount: "1000000000", swapMode: "in", slippageBps: 200,
  userPublicKey: wallet.publicKey.toBase58(),
});

// Execute swap
const swapResult = await sdk.swap.executeSwap({
  /* same params */ signerCallback: async (tx) => { tx.sign([wallet]); return tx; },
});

// Open CLMM position with USD amount
const openResult = await sdk.positions.openPosition({
  poolAddress: "pool-address",
  priceLower: "0.998", priceUpper: "1.002",
  amountUsd: 1000,
  userAddress: wallet.publicKey.toBase58(),
  signerCallback: async (tx) => { tx.sign([wallet]); return tx; },
});

// Top positions + copy farming
const topPositions = await sdk.copyFarmer.getTopPositions({
  poolAddress: "pool-address", sortField: "liquidity", sortType: "desc", pageSize: 10,
});
const copyResult = await sdk.copyFarmer.copyPosition({
  sourcePositionAddress: "position-address", amountUsd: 500,
  userAddress: wallet.publicKey.toBase58(),
  signerCallback: async (tx) => { tx.sign([wallet]); return tx; },
});
```

Low-level API client:
```typescript
import { ApiClient, API_ENDPOINTS } from "@byreal-io/byreal-sdk/api";
const client = new ApiClient({ baseUrl: "https://api2.byreal.io" });
```

### 2.4 `byreal-git/byreal-api-docs` — Swagger / REST docs
https://github.com/byreal-git/byreal-api-docs

Repo contains `swagger.json` (153KB) and `router.md` (8KB). Base URL is `https://api2.byreal.io`. Router service docs cover quote/swap routing endpoints.

### 2.5 `byreal-git/RealClaw-Skills` — Mantle-side packaging (3 stars)
https://github.com/byreal-git/RealClaw-Skills

Currently nearly empty: `.gitignore` + empty `skills/` directory. **The "RealClaw" brand appears to be an OpenClaw distribution with Byreal skills pre-installed**, but the public repo is still being populated. Brief description "OpenClaw-based Agent with Byreal Skills pre-installed" comes from the hackathon docs — but the **executable code lives in the byreal-agent-skills and byreal-perps-cli repos**, which install into any OpenClaw runtime via `npx skills add`.

A community fork exists: https://github.com/ggg223399/byreal-agent-skills (described as "RealClaw Agent skills — public distribution repo").

There's also a `byreal-skills-playbook` (https://github.com/ggg223399/byreal-skills-playbook) with **120 trading strategies** across Spot, LP, Perp, and cross-venue combinations — likely useful inspiration material for the trading-strategy track.

### 2.6 Related Byreal repos worth knowing
- `byreal-git/byreal-clmm` (Anchor program source for the CLMM, 9 stars)
- `byreal-git/byreal-clmm-sdk` (8 stars, Solana CLMM SDK)
- `byreal-git/byreal-jupiter-integration` (3 stars, Jupiter aggregator integration)
- `Stanleylee01/byreal-mcp` (community MCP server for Byreal DEX with auto-sign wallet)
- `ggg223399/byreal-dca-skill` (DCA recurring-buy skill)

---

## 3. OpenClaw

### What it is
**OpenClaw is an open-source agent runtime** that wraps Anthropic API (and other LLM providers) into a full-featured personal AI assistant. Repo: https://github.com/openclaw/openclaw (~376k stars in 2026, MIT). Tagline: "Your own personal AI assistant. Any OS. Any Platform. The lobster way."

### Relation to Claude Code / Anthropic SDK
- OpenClaw uses the **Anthropic API / Claude Agent SDK** under the hood (with pluggable model providers — Claude, ChatGPT, Gemini, DeepSeek, Doubao, Grok, Qwen, Kimi)
- Starting **June 15, 2026**, Claude Agent SDK / `claude -p` usage no longer draws from interactive Claude.ai/Code/Cowork limits. Pro/Max/Team/Enterprise users get a separate monthly Agent SDK credit. This matters for any hackathon project that bills against Claude API for agent loops.
- Whereas Claude Code is dev-focused (terminal/IDE), **OpenClaw is the "always-on agent on sockets" runtime** — listens on Telegram, Discord, Slack, WhatsApp, Signal, iMessage, etc., and runs continuously. The Gateway is just the control plane.

### Skills
OpenClaw has a **massive Skills ecosystem** (5,400+ in registry; "ClawHub" is the registry at https://github.com/openclaw/clawhub, 8.8k stars). Skills follow a YAML-frontmatter `SKILL.md` format — same shape as Claude Code Skills. Example (from byreal-cli):

```yaml
---
name: byreal-cli
description: "Byreal DEX (Solana) all-in-one CLI: ..."
metadata:
  openclaw:
    homepage: https://github.com/byreal-git/byreal-agent-skills
    requires:
      bins:
        - byreal-cli
      config:
        - ~/.config/byreal/keys/
    install:
      - kind: node
        package: "@byreal-io/byreal-cli"
        global: true
---
# Skill body in markdown, with instructions for the agent
```

Install via:
```bash
npx skills add <github-owner>/<repo>
```

### Architecture for on-chain transactions
OpenClaw skills typically wrap **CLI binaries** (like byreal-cli, byreal-perps-cli) rather than calling RPC directly. The CLI:
1. Holds the wallet/key locally (`~/.config/<tool>/keys/` mode 0600)
2. Builds the transaction
3. Signs locally
4. Submits via the appropriate RPC
The agent supplies parameters, calls the CLI, parses JSON output.

### Discord / docs
- Discord: https://discord.gg/clawd
- Awesome lists: https://github.com/VoltAgent/awesome-openclaw-skills, https://github.com/hesamsheikh/awesome-openclaw-usecases (31k stars)
- China integration: https://github.com/BytePioneer-AI/openclaw-china (Feishu/DingTalk/QQ/WeChat)
- Studio dashboard: https://github.com/grp06/openclaw-studio

---

## 4. ERC-8004 (Trustless Agents) — DEPLOYED ON MANTLE

### Spec status
- Authors: **Marco De Rossi (MetaMask)**, **Davide Crapis (EF)**, **Jordan Ellis (Google)**, **Erik Reppel (Coinbase)**
- Core team: Leonard Tan (MetaMask), Vitto Rivabella (EF), Isha Sangani (EF)
- Website: https://www.8004.org
- Contact: team@8004.org
- License: CC0
- Spec source-of-truth: `ERC8004SPEC.md` in the canonical repo

### Canonical repo
https://github.com/erc-8004/erc-8004-contracts (218 stars)

### Deployed contract addresses (Mantle)
**Mantle Mainnet:**
- IdentityRegistry: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` (https://mantlescan.xyz/address/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432)
- ReputationRegistry: `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`

**Mantle Sepolia:**
- IdentityRegistry: `0x8004A818BFB912233c491871b3d84c89A494BD9e`
- ReputationRegistry: `0x8004B663056A597Dffe9eCcC1965A193B7388713`

**Important:** These are the **SAME addresses across 25+ EVM chains** (Ethereum, Base, Arbitrum, Optimism, Polygon, BSC, Avalanche, Linea, Scroll, Mantle, Monad, Celo, Gnosis, Soneium, Injective, Hedera, Arc Testnet, etc.) — CREATE2-deployed canonical addresses. An agent registered on one chain can theoretically port reputation across chains.

Mantle mainnet deployment: **Feb 16, 2026** (per official press release).

### What it specifies
Three on-chain registries:

**1. Identity Registry (ERC-721 upgradeable)**
- `register()` mints agent NFT, returns `agentId`
- `setAgentURI(agentId, ...)` sets `tokenURI` → registration file (ipfs:// or https://)
- `setAgentWallet(...)` — EIP-712/ERC-1271 proven receiving wallet, cleared on transfer
- `getMetadata(agentId, key)` / `setMetadata(agentId, key, value)` — on-chain KV
- Registration file schema includes: `type`, `name`, `description`, `image`, `services[]` (A2A card URL, MCP endpoint, OASF manifest, ENS, email), `registrations[]` ({agentRegistry, agentId}), `supportedTrust[]` (reputation, crypto-economic, tee-attestation)

**2. Reputation Registry**
- `giveFeedback(agentId, value: int128, valueDecimals: uint8, tag1, tag2, ...)` — value+decimals encode any signed decimal (e.g., 9977 + 2 = 99.77)
- Anti-Sybil: no self-feedback from owner/operator, `getSummary` requires non-empty `clientAddresses` list
- `revokeFeedback`, `appendResponse` supported
- Read: `readFeedback`, `readAllFeedback`, `getSummary` → `(count, summaryValue, summaryValueDecimals)`

**3. Validation Registry** (UNDER ACTIVE UPDATE — TEE-community discussion)
- `validationRequest(validatorAddress, agentId, requestURI, requestHash)` — owner/operator only
- `validationResponse(...)` — only the requested validator
- Reads: `getValidationStatus`, `getSummary`, `getAgentValidations`, `getValidatorRequests`

### Why Mantle cares
Mantle's official framing: ERC-8004 turns AI agents from "isolated scripts into sovereign economic participants" — unlocks (1) **Financial Strategy Agents** (yield/trading with auditable history), (2) **RWA Coordination Agents** (compliance/custody/settlement for tokenized assets), (3) **Cross-Market Bridges** (verifiable TradFi↔DeFi intermediaries).

Source: https://www.prnewswire.com/in/news-releases/mantle-unlocks-autonomous-economy-with-erc-8004-deployment-302688553.html

### Reference implementations and SDKs (use these in your hackathon project)
- **Rust SDK**: `qntx/erc8004` (164 stars) https://github.com/qntx/erc8004
- **TypeScript SDK**: `agent0lab/agent0-ts` (67 stars) https://github.com/agent0lab/agent0-ts
- **Subgraph**: `agent0lab/subgraph` (26 stars)
- **TEE-enabled (Phala)**: `Phala-Network/erc-8004-tee-agent` (14 stars)
- **CLI scaffolder**: `Eversmile12/create-8004-agent` (49 stars) — `npx create-8004-agent` — scaffolds agent with A2A + MCP + USDC payments (EVM + Solana)
- **Demo agent**: `Eversmile12/erc-8004-demo-agent` (16 stars)
- **AgentlyHQ/aixyz** (81 stars) — "Next.js-like framework for payment-native AI Agents" with A2A, MCP, x402, ERC-8004
- **ChaosChain/trustless-agents-erc-ri** (51 stars) — reference implementation
- **ChaosChain/chaoschain-genesis-studio** (39 stars) — end-to-end commercial prototype (identity + USDC payments + IP monetization)
- **Sperax/erc8004-agents** (7 stars) — standalone UI to mint ERC-721 agent identities across any EVM (Ethereum, BNB, Base, Arbitrum, Optimism, Polygon)
- **Trustdev-eth/x402-erc8004-agent** (12 stars) — A2A + x402 + ERC-8004 combined stack
- **awesome list**: `sudeepb02/awesome-erc8004` (74 stars)

---

## 5. Bybit API

### Endpoints

| | Mainnet | Testnet |
|---|---|---|
| REST | `https://api.bybit.com` (alt: `https://api.bytick.com`) | `https://api-testnet.bybit.com` |
| WS public spot | `wss://stream.bybit.com/v5/public/spot` | `wss://stream-testnet.bybit.com/v5/public/spot` |
| WS public linear | `wss://stream.bybit.com/v5/public/linear` | `wss://stream-testnet.bybit.com/v5/public/linear` |
| WS private | `wss://stream.bybit.com/v5/private` | `wss://stream-testnet.bybit.com/v5/private` |

Regional REST endpoints also exist for NL, TR, KZ, GE, UAE, EEA, ID.

### Authentication
HMAC-SHA256, lowercase hex. String to sign:
```
timestamp + API_key + recv_window + request_parameters
```
Required headers:
- `X-BAPI-API-KEY`
- `X-BAPI-TIMESTAMP` (UTC ms)
- `X-BAPI-SIGN`
- `X-BAPI-RECV-WINDOW` (default 5000ms)

Timestamp rule: `server_time - recv_window <= timestamp < server_time + 1000`

### SDKs
- **Python (official)**: `pip install pybit`
- **Node.js (community)**: `npm install bybit-api`
- Official Go, Java, .NET also available
- Docs: https://bybit-exchange.github.io/docs/v5/intro

### Testnet keys
Free signup at testnet.bybit.com — testnet API keys self-service. Mainnet keys also self-service but require KYC and have geographic restrictions.

### Hackathon-specific
No public hackathon-specific endpoints surfaced. Use V5 Unified Trading endpoints (spot + linear perps + inverse + options under one account).

---

## 6. Mantle RWA Primitives

### USDY (Ondo, on Mantle)
- USDY token on Mantle: **`0x5bE26527e817998A7206475496fDE1E68957c5A6`**
- mUSD (rebasing variant of USDY on Mantle): **`0xab575258d37EaA5C8956EfABe71F4eE8F6397cF3`**
- Redemption Price Oracle: **`0xA96abbe61AfEdEB0D14a20440Ae7100D9aB4882f`**
- Backed by short-term US treasuries + bank demand deposits
- mUSD calls `RWADynamicRateOracle.sol` to fetch current price
- Same transfer restrictions on USDY apply to mUSD
- Ondo docs: https://docs.ondo.finance/addresses
- Integration guide: https://docs.ondo.finance/developer-guides/mantle-integration-guidelines

### mETH (Mantle's liquid-staked ETH)
- L1 contract (Ethereum mainnet): `0xd5f7838f5c461feff7fe49ea5ebaf7728bb0adfa`
- TVL: $791.7M; APY 4.0% native yield
- Source-of-truth: mantle.xyz blog announcement on native yield

### fBTC (Function)
- Cross-chain BTC, 1:1 peg
- TVL ~$1.5B as of Q2 2025
- Whitepaper: https://fbtc.com/home/FBTC-Whitepaper.pdf
- Listed on Mantle's dApp index https://www.mantle.xyz/dapp

### MI4 (Mantle Index Four)
- $400M allocated institutional crypto fund
- Basket: BTC, ETH, SOL, stablecoins, dynamic rebalancing
- Yield-enhanced via mETH, bbSOL, sUSDe
- RWA.xyz page: https://app.rwa.xyz/assets/MI4

### Mantle Treasury
- L1 multisig: `0x78605Df79524164911C144801f41e9811B7DB73D`

### Aggregator / RWA SDK
No single official "Mantle RWA SDK" exists. The primitives are individual contracts. RWA.xyz is the third-party aggregator (https://app.rwa.xyz/networks/mantle).

---

## 7. Sponsor + partner snapshots

### BGA (Blockchain for Good Alliance)
Global nonprofit founded by **Bybit** to advance blockchain for social good. Runs the **BGA Web3Key Fund** with strategic sponsorships for projects, startups, nonprofits, social enterprises, and research institutions using Web3 for impact. Both early-stage and scaling projects welcome. Eval criteria: mission alignment, impact potential, feasibility. Application review within 2 weeks; only successful apps notified. Geographic: global with regional focus per partner program. Website: https://chainforgood.org. In Feb 2026 they released a Global Report setting direction for impact-driven blockchain.

### Mirana Ventures
Bybit's investment arm. Anchor capital from Bybit co-founders. Deal size **$200k–$20M** ($1M–$40M ticket on co-invests), Pre-Seed through Series C. Thesis: **strategic relevance to Bybit + BitDAO, longer-term horizon, biased toward innovative business models / tech differentiation, founders with grit**. Synergies: Bybit (CEX distribution), BitDAO (DAO treasury), Windranger Labs (co-dev), in-house experts. Notable on-chain behavior: routinely DCAs into ETH via OTC. For trading-strategy hackathons they care about novel quant strategies, market-microstructure innovations, and anything that drives derivatives volume to Bybit. Website: https://www.mirana.xyz.

### Allora Network
Decentralized AI inference network (sovereign Cosmos SDK chain, EVM-compatible). Coordinates 288k+ active workers across 55+ live Topics. **692M+ inferences processed as of Feb 2026**. ALLO token: 1B max supply, ~20% circulating. Use case: AI-powered prediction signals for DeFi protocols and AI agents. **Cobot** — their first AI trading tool — launched May 18, 2026. For the hackathon, projects can integrate Allora topics to get on-chain ML predictions (price forecasts, volatility, etc.) without running their own models. Website: https://www.allora.network.

### Nansen
Wallet-labeling and on-chain intelligence platform. **500M+ labeled wallets** across 18+ chains. **Smart Money** labels Ethereum/EVM wallets by historical PnL, holding patterns, on-chain behavior. **Nansen API**: full programmatic access to Smart Money, Token God Mode, Profiler, etc. via REST/CLI/MCP. **Free credits for core endpoints; Pro tier for proprietary data.** API docs: https://docs.nansen.ai. Already battle-tested in hackathons (e.g., March 2026 Nansen CLI Hackathon produced a Smart Developer Leaderboard from Smart Money wallets).

### Z.ai (GLM models)
Chinese LLM provider (Zhipu AI). Models: **GLM-5.1** ($0.45/$1.80 to $0.98/$3.08 per MTok depending on tier), **GLM-4.5** ($0.60/$2.20), **GLM-4.7-Flash** ($0.06/MTok input — cheapest tier), **GLM-4.5-Air** (free on OpenRouter). **Free tier: 1000 requests/day, no card required**. Strong on Chinese-language tasks and coding. GLM Coding Plan competes with Claude Code. Docs: https://docs.z.ai.

### Virtuals Protocol
Largest AI agent economy: **18,000+ agents, $4M+ revenue settlements**. Powers the **Agent Commerce Protocol (ACP)** — live since March 2026 with **ERC-8183** (co-authored with EF dAI team). ACP lets agents hire, deliver, settle payments via on-chain escrow on any chain. Originally on Base; **Mantle integration** = Virtuals serves as the distribution layer connecting Virtuals-powered agents to Mantle RWA infra. Mantle adopted ERC-8183 formally — first-class AI commerce. Website: https://www.virtuals.io.

### Four Pillars
Korean crypto research firm. Strong distribution into the Korean retail and dev community. Writes deep technical reports. For hackathons they typically judge on novelty + technical depth + thesis alignment.

### Animoca Brands
Web3 gaming / consumer conglomerate ($5B+ portfolio). Sponsoring track is "Animoca Minds." Looks for: consumer apps with viral mechanics, AI agents that touch gaming/identity/social, anything that could plug into Animoca's massive portfolio (The Sandbox, Mocaverse, Yuga, etc.).

### Hashed
Korea-based crypto VC. Korean retail distribution. Active in DeFi, infra, AI/agents. Portfolio includes Aptos, Klaytn, dYdX, Sui, etc. Korean accelerator track.

### Caladan
Crypto-native market maker. Hackathon angle: they want trading-infra projects that could become MM tooling, novel execution strategies, anything that improves liquidity provisioning.

### Tencent Cloud
Cloud infra sponsor. Provides **compute credits, LLM API credits (likely Hunyuan), GPU access, and hosting**. The press release doesn't specify exact credit amounts — assume hackathon-specific allocations announced at kickoff. Expect Tencent Cloud APIs to be a soft preference for the AI-DevTools track.

### Orbit AI, Open Check, Elfa AI, Surf AI
Smaller partner mentions in the press release. Specific roles not detailed publicly — likely API/data partners for AI-Alpha or Consumer tracks. Worth asking the organizers directly at kickoff.

### Other community partners
Merchant Moe (Mantle DEX — useful for AMM/LP track), Z.ai (covered above), Cornell Blockchain (judging/mentorship), HKUST Crypto-Fintech Lab (academic credibility, Asian student outreach).

---

## Code snippets that downstream agents should reuse

### Install RealClaw stack (Byreal Skills inside OpenClaw)
```bash
# Install the two Byreal skills into any OpenClaw runtime
npx skills add byreal-git/byreal-agent-skills
npx skills add byreal-git/byreal-perps-cli

# Or install standalone CLIs
npm install -g @byreal-io/byreal-cli
npm install -g @byreal-io/byreal-perps-cli

# First-time setup (interactive wallet config)
byreal-cli setup
byreal-perps-cli account init
```

### Mint an ERC-8004 agent identity on Mantle (using create-8004-agent)
```bash
npx create-8004-agent my-mantle-agent
cd my-mantle-agent
# Configure for Mantle mainnet:
#   IDENTITY_REGISTRY=0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
#   REPUTATION_REGISTRY=0x8004BAa17C55a88189AE136b182e5fdA19dE9b63
#   RPC_URL=https://rpc.mantle.xyz
#   CHAIN_ID=5000
```

### Add Mantle to viem
```typescript
import { defineChain } from 'viem';
export const mantle = defineChain({
  id: 5000,
  name: 'Mantle',
  nativeCurrency: { name: 'Mantle', symbol: 'MNT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mantle.xyz'] } },
  blockExplorers: { default: { name: 'Mantlescan', url: 'https://mantlescan.xyz' } },
});
export const mantleSepolia = defineChain({
  id: 5003,
  name: 'Mantle Sepolia',
  nativeCurrency: { name: 'Mantle', symbol: 'MNT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.sepolia.mantle.xyz'] } },
  blockExplorers: { default: { name: 'Mantlescan Sepolia', url: 'https://sepolia.mantlescan.xyz' } },
});
```

### USDY on Mantle interaction (ethers v6)
```typescript
import { Contract, JsonRpcProvider } from 'ethers';
const provider = new JsonRpcProvider('https://rpc.mantle.xyz');
const USDY_MANTLE = '0x5bE26527e817998A7206475496fDE1E68957c5A6';
const MUSD_MANTLE = '0xab575258d37EaA5C8956EfABe71F4eE8F6397cF3';
const REDEMPTION_ORACLE = '0xA96abbe61AfEdEB0D14a20440Ae7100D9aB4882f';
const erc20Abi = ['function balanceOf(address) view returns (uint256)'];
const usdy = new Contract(USDY_MANTLE, erc20Abi, provider);
const bal = await usdy.balanceOf('<user>');
```

### ERC-8004 register agent (sketch — pull full ABI from canonical repo)
```typescript
import { createWalletClient, http } from 'viem';
import { mantle } from './chains';
const wallet = createWalletClient({ chain: mantle, transport: http('https://rpc.mantle.xyz') });
// Identity Registry on Mantle mainnet
const IDENTITY_REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
// register(string tokenURI) -> agentId
await wallet.writeContract({
  address: IDENTITY_REGISTRY,
  abi: [/* fetch from https://github.com/erc-8004/erc-8004-contracts/blob/main/abis/ */],
  functionName: 'register',
  args: ['ipfs://<agent-registration-file-cid>'],
});
```

### Bybit V5 (Python, signed request)
```python
import time, hmac, hashlib, requests
API_KEY = '...'; SECRET = '...'
ts = str(int(time.time() * 1000))
recv = '5000'
params = 'category=linear&symbol=BTCUSDT'
sign_str = ts + API_KEY + recv + params
sig = hmac.new(SECRET.encode(), sign_str.encode(), hashlib.sha256).hexdigest()
headers = {
  'X-BAPI-API-KEY': API_KEY,
  'X-BAPI-TIMESTAMP': ts,
  'X-BAPI-SIGN': sig,
  'X-BAPI-RECV-WINDOW': recv,
}
r = requests.get(f'https://api.bybit.com/v5/market/tickers?{params}', headers=headers)
# Or use pybit:
# from pybit.unified_trading import HTTP
# session = HTTP(testnet=False, api_key=API_KEY, api_secret=SECRET)
# session.get_tickers(category='linear', symbol='BTCUSDT')
```

---

## Unverifiable / open questions

1. **Phase 2 exact start/end dates** — press release only confirms "Phase 1 launched April 15, concluded April 30, 2026; Phase 2 dates not explicitly stated." Need to check the official hackathon site / brief.
2. **Tencent Cloud credit allocation** — no public number on exact compute / API credits provided. Ask at kickoff.
3. **Mirana Ventures hackathon-specific prize** — typical for them to extend follow-on funding to standout teams but the public release doesn't itemize.
4. **Validation Registry final spec** — explicitly under active TEE-community update. Don't ship validation-dependent logic without checking the latest spec revision; Identity + Reputation registries are stable.
5. **RealClaw repo `byreal-git/RealClaw-Skills` is empty.** The "RealClaw" brand appears to be a packaging concept (OpenClaw + pre-installed Byreal skills) rather than a separate executable. Confirm with organizers whether contestants are expected to start from a specific RealClaw distribution or simply install the two skills into vanilla OpenClaw.
6. **byreal.io website docs / quickstart URL** — separate from `byreal-git` GitHub org. Did not surface a public docs.byreal.io site beyond the API swagger repo.
7. **Z.ai hackathon credits** — no public hackathon-credit program; only the standard 1000 req/day free tier was found. Ask organizers.
8. **Orbit AI, Open Check, Elfa AI, Surf AI** — these smaller AI partners' specific contributions are not publicly documented. Likely API/data partners.
9. **fBTC contract address on Mantle** — not surfaced in research; whitepaper exists but address requires checking mantlescan or the Function project repo directly.
10. **MI4 contract address** — RWA.xyz lists the fund but no on-chain address surfaced cleanly.

---

## Master URL ledger

- Mantle docs: https://docs.mantle.xyz
- Mantle blog/announcements: https://www.mantle.xyz/blog
- Mantle dApp index: https://www.mantle.xyz/dapp
- Mantlescan: https://mantlescan.xyz | https://sepolia.mantlescan.xyz
- Byreal GitHub org: https://github.com/byreal-git
- Byreal API base: https://api2.byreal.io
- OpenClaw repo: https://github.com/openclaw/openclaw | Discord https://discord.gg/clawd
- ClawHub (skills registry): https://github.com/openclaw/clawhub
- ERC-8004 website: https://www.8004.org
- ERC-8004 canonical repo: https://github.com/erc-8004/erc-8004-contracts
- Awesome ERC-8004: https://github.com/sudeepb02/awesome-erc8004
- Bybit V5 API: https://bybit-exchange.github.io/docs/v5/intro
- Ondo Finance addresses: https://docs.ondo.finance/addresses
- Ondo Mantle integration: https://docs.ondo.finance/developer-guides/mantle-integration-guidelines
- RWA.xyz Mantle: https://app.rwa.xyz/networks/mantle
- Nansen API docs: https://docs.nansen.ai
- Allora: https://www.allora.network
- Z.ai docs: https://docs.z.ai
- Virtuals: https://www.virtuals.io
- BGA: https://chainforgood.org
- Mirana: https://www.mirana.xyz
- Mantle ERC-8004 deployment release: https://www.prnewswire.com/in/news-releases/mantle-unlocks-autonomous-economy-with-erc-8004-deployment-302688553.html
- Hackathon announcement: https://www.prnewswire.com/news-releases/mantle-unites-global-ai-tech-and-youth-communities-for-its-largest-ai-hackathon-backed-by-tencent-cloud-bybit-byreal-and-blockchain-for-good-alliance-302750420.html
- Mantle Q1 2026 report: https://nansen.ai/post/mantle-q1-2026-report
