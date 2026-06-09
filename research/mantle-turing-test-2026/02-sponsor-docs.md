# 02 — Sponsor Docs & Stack

Distilled from `.raw/phase2-sponsor-docs.md`. Code snippets live in `refs/sdk-snippets.md`. Repo clone commands live in `refs/sponsor-repos.md`.

---

## The stack at a glance

```
                ┌──────────────────────────────────────────┐
                │              Agent runtime               │
                │  Claude Agent SDK / OpenClaw (5,400+     │
                │  skills, MIT)                            │
                └────────────────┬─────────────────────────┘
                                 │ skills via npx skills add
                ┌────────────────┴─────────────────────────┐
                │      Byreal Skills (must use ≥1 for      │
                │      Agentic Economy track)              │
                │  ┌────────────────┐  ┌────────────────┐  │
                │  │ byreal-agent-  │  │ byreal-perps-  │  │
                │  │ skills (CLMM   │  │ cli (Hyperliq) │  │
                │  │ on SOLANA)     │  │                │  │
                │  └────────────────┘  └────────────────┘  │
                └────────────────┬─────────────────────────┘
                                 │
                ┌────────────────┴─────────────────────────┐
                │           Mantle Network (L2)            │
                │  ┌─────────────────┐  ┌───────────────┐  │
                │  │ ERC-8004 reg.   │  │ RWA primitives│  │
                │  │ (Identity +     │  │ USDY mUSD     │  │
                │  │ Reputation live)│  │ mETH MI4 fBTC │  │
                │  └─────────────────┘  └───────────────┘  │
                └──────────────────────────────────────────┘
```

---

## 1. Mantle Network

**Type:** Ethereum L2 on OP Stack + EigenDA. 2026 positioning: "liquidity chain of the future / full-stack on-chain banking" with AI agents + RWA as first-class.

### Chain info

| | Mainnet | Sepolia Testnet |
|---|---|---|
| Chain ID | **5000** (0x1388) | **5003** |
| RPC | `https://rpc.mantle.xyz` | `https://rpc.sepolia.mantle.xyz` |
| Explorer | `https://mantlescan.xyz` | `https://sepolia.mantlescan.xyz` |
| Gas token | **$MNT** | Sepolia $MNT |
| Faucet | n/a | `https://faucets.chain.link/mantle-sepolia` |

2026 mainnet release: **Mantle v2 Arsia**. Sepolia migrated to EigenDA. Hoodi Testnet also announced.

### Ecosystem state (Q2 2026)

- **TVL:** $755M+ in Q1 2026, crossed $1B after Aave V3 integration in March 2026 (one of fastest lending ramps in DeFi history)
- **L2BEAT rank:** top 5–7 by TVL
- **Daily active addresses:** ~2,276 avg, 5,557 peak in Q1 2026 — **low retail count, high $-per-user, "whale chain"**
- **mETH:** $791.7M ETH locked, 4.0% native yield
- **MI4 (Mantle Index Four):** $400M allocated; basket of BTC/ETH/SOL/stables with mETH + bbSOL + sUSDe yield enhancement
- **USDY on Mantle:** ~$29M circulating
- **fBTC:** ~$1.5B TVL cross-chain BTC, 1:1 peg
- **Stablecoins on Mantle:** new ATH in Q2 2026

### Mantle's official AI/agent narrative

Mantle frames itself as the **settlement layer for autonomous agent commerce**:
1. **ERC-8004** identity/reputation (live on mainnet Feb 16 2026)
2. **ERC-8183** Agent Commerce Protocol (co-authored with EF + Virtuals; live March 2026)
3. **X402** micropayments (Questflow integration)
4. RWA primitives as the "real economy" agents transact against
5. Byreal/OpenClaw as the agent dev-experience layer

---

## 2. Byreal stack

> **Critical:** Byreal CLMM is on **Solana**, Byreal Perps routes to **Hyperliquid**. The "Mantle" piece is via RealClaw packaging + ERC-8004 identity + RWA settlement. A Mantle-only DeFi agent does not satisfy the Byreal integration requirement.

### 2.1 `byreal-agent-skills` (CLMM, Solana, 44 ⭐ MIT)

Repo: `byreal-git/byreal-agent-skills`. Concentrated-liquidity DEX on Solana with JSON-structured CLI output for agent consumption.

Install:
```bash
npx skills add byreal-git/byreal-agent-skills        # into any OpenClaw runtime
# OR
npm install -g @byreal-io/byreal-cli                  # standalone
byreal-cli setup                                      # interactive wallet
```

Capabilities: pools (list, info, klines, analyze) · tokens (list, prices) · swap · positions (open, close, increase, decrease, claim*, analyze, top-positions, **copy**) · wallet · config.

**Auto-Swap (Zap):** single-token LP entry — backend computes optimal split, swap + deposit atomic. Use `--auto-swap`.

**Discovery commands an agent uses:**
```bash
byreal-cli skill                # full doc dump
byreal-cli catalog list         # all capabilities with params
byreal-cli catalog show <id>    # detailed param info
```

Hard constraints worth borrowing in any agent design:
- `-o json` only for parsing — never re-render charts yourself
- Never truncate on-chain addresses / signatures
- Keys at `~/.config/byreal/keys/` mode 0600 — never transmitted
- `--dry-run` first, `--confirm` second
- >$1000 needs explicit user confirm; >200bps slippage must warn

### 2.2 `byreal-perps-cli` (Hyperliquid, 1 ⭐ MIT)

Repo: `byreal-git/byreal-perps-cli`. AI-native CLI for Hyperliquid perpetual futures.

Install:
```bash
npx skills add byreal-git/byreal-perps-cli
# OR
npm install -g @byreal-io/byreal-perps-cli
byreal-perps-cli account init    # no private key needed
```

Capabilities: account · order (market/limit + cancel) · position (list/tpsl/close-market/close-limit/close-all/margin/leverage) · signal (scan, detail) · catalog.

### 2.3 `byreal-sdk` (TypeScript, 3 ⭐ MIT)

Repo: `byreal-git/byreal-sdk`. Programmatic interface to Byreal CLMM via Solana web3.js.

```bash
npm install @byreal-io/byreal-sdk
```

Surfaces: pools, swap (quote + execute), positions (open with USD amount), copyFarmer (top positions + copy). Low-level: `ApiClient` against `https://api2.byreal.io`.

### 2.4 `byreal-api-docs` — Swagger / REST

Repo: `byreal-git/byreal-api-docs`. `swagger.json` (153KB) + `router.md` (8KB). Base URL `https://api2.byreal.io`.

### 2.5 `RealClaw-Skills` (Mantle-side packaging, 3 ⭐)

Repo: `byreal-git/RealClaw-Skills`. **Currently nearly empty** — just `.gitignore` + empty `skills/` dir. "RealClaw" is best read as a packaging concept: OpenClaw + pre-installed Byreal Skills. Functional code lives in `byreal-agent-skills` and `byreal-perps-cli`.

Community fork: `ggg223399/byreal-agent-skills` (public distribution).
Strategy library: `ggg223399/byreal-skills-playbook` — **120 trading strategies** across spot/LP/perp/cross-venue. Inspiration material.

### 2.6 Other Byreal repos

- `byreal-git/byreal-clmm` (Anchor program, 9 ⭐)
- `byreal-git/byreal-clmm-sdk` (8 ⭐)
- `byreal-git/byreal-jupiter-integration` (Jupiter aggregator)
- `Stanleylee01/byreal-mcp` (community MCP server, auto-sign wallet)
- `ggg223399/byreal-dca-skill` (DCA recurring-buy)

---

## 3. OpenClaw

**What:** open-source agent runtime wrapping the Anthropic API (and other LLM providers) into a personal assistant that listens on Telegram/Discord/Slack/WhatsApp/Signal/iMessage. Repo `openclaw/openclaw` (~376k ⭐ MIT). Tagline: *"Your own personal AI assistant. Any OS. Any Platform. The lobster way."*

### Relation to Claude Code / Anthropic SDK

- Uses Anthropic API / Claude Agent SDK under the hood (pluggable providers: Claude, ChatGPT, Gemini, DeepSeek, Doubao, Grok, Qwen, Kimi)
- **From Jun 15, 2026:** Claude Agent SDK usage no longer draws from interactive Claude.ai/Code/Cowork limits — Pro/Max/Team/Enterprise users get a separate monthly Agent SDK credit. **This is the same day as the submission deadline.** Plan API spend accordingly.
- Claude Code = dev-focused (terminal/IDE). OpenClaw = **always-on agent on sockets**, runs continuously.

### Skills ecosystem

5,400+ skills in **ClawHub** registry (`openclaw/clawhub`, 8.8k ⭐). YAML-frontmatter `SKILL.md` format — same shape as Claude Code Skills. Example header:

```yaml
---
name: byreal-cli
description: "Byreal DEX (Solana) all-in-one CLI: ..."
metadata:
  openclaw:
    homepage: https://github.com/byreal-git/byreal-agent-skills
    requires:
      bins: [byreal-cli]
      config: [~/.config/byreal/keys/]
    install:
      - kind: node
        package: "@byreal-io/byreal-cli"
        global: true
---
# Skill body in markdown, with agent instructions
```

Install pattern: `npx skills add <github-owner>/<repo>`

### Architecture for on-chain transactions

OpenClaw skills typically wrap CLI binaries (byreal-cli, byreal-perps-cli) rather than calling RPC directly. CLI holds the key locally (`~/.config/<tool>/keys/` mode 0600), builds tx, signs locally, submits. Agent supplies params, calls CLI, parses JSON output.

### Discord / community

- Discord — https://discord.gg/clawd
- Awesome lists — `VoltAgent/awesome-openclaw-skills`, `hesamsheikh/awesome-openclaw-usecases` (31k ⭐)
- China integration — `BytePioneer-AI/openclaw-china` (Feishu/DingTalk/QQ/WeChat)
- Studio dashboard — `grp06/openclaw-studio`

---

## 4. ERC-8004 (Trustless Agents) — DEPLOYED ON MANTLE

### Spec status

- **Authors:** Marco De Rossi (MetaMask) · Davide Crapis (EF) · Jordan Ellis (Google) · Erik Reppel (Coinbase)
- **Core team:** Leonard Tan (MetaMask) · Vitto Rivabella + Isha Sangani (EF)
- **License:** CC0
- **Website:** https://www.8004.org
- **Contact:** team@8004.org
- **Canonical repo:** https://github.com/erc-8004/erc-8004-contracts (218 ⭐)

### Deployed addresses (same across 25+ EVM chains via CREATE2)

**Mantle Mainnet:**
- IdentityRegistry — `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- ReputationRegistry — `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`

**Mantle Sepolia:**
- IdentityRegistry — `0x8004A818BFB912233c491871b3d84c89A494BD9e`
- ReputationRegistry — `0x8004B663056A597Dffe9eCcC1965A193B7388713`

**Cross-chain portability is real:** an agent registered on Ethereum or Base can present the same reputation on Mantle.

Mantle mainnet deployment: **Feb 16, 2026**.

### Three on-chain registries

**Identity Registry (ERC-721 upgradeable)**
- `register()` → mints agent NFT, returns `agentId`
- `setAgentURI(agentId, ...)` → `tokenURI` to registration file (ipfs:// or https://)
- `setAgentWallet(...)` → EIP-712/ERC-1271 proven receiving wallet (cleared on transfer)
- `getMetadata(agentId, key)` / `setMetadata(...)` → on-chain KV

Registration file schema: `type`, `name`, `description`, `image`, `services[]` (A2A card URL, MCP endpoint, OASF manifest, ENS, email), `registrations[]` ({agentRegistry, agentId}), `supportedTrust[]` (reputation, crypto-economic, tee-attestation).

**Reputation Registry**
- `giveFeedback(agentId, value: int128, valueDecimals: uint8, tag1, tag2, ...)` — value+decimals encode any signed decimal (e.g., 9977 + 2 = 99.77)
- Anti-Sybil: no self-feedback from owner/operator; `getSummary` requires non-empty `clientAddresses` list
- `revokeFeedback`, `appendResponse` supported
- Read: `readFeedback`, `readAllFeedback`, `getSummary` → `(count, summaryValue, summaryValueDecimals)`

**Validation Registry** ⚠️ **IN FLUX (TEE-community spec update mid-2026)**
- `validationRequest(validatorAddress, agentId, requestURI, requestHash)` — owner/operator only
- `validationResponse(...)` — only the requested validator
- Reads: `getValidationStatus`, `getSummary`, `getAgentValidations`, `getValidatorRequests`
- **Don't build validation-dependent logic here.** Identity + Reputation are stable.

### Reference implementations (cherry-pick for the build)

- **Rust SDK:** `qntx/erc8004` (164 ⭐)
- **TypeScript SDK:** `agent0lab/agent0-ts` (67 ⭐)
- **Subgraph:** `agent0lab/subgraph` (26 ⭐)
- **TEE-enabled (Phala):** `Phala-Network/erc-8004-tee-agent` (14 ⭐)
- **CLI scaffolder:** `Eversmile12/create-8004-agent` (49 ⭐) — `npx create-8004-agent <name>` scaffolds A2A + MCP + USDC payments (EVM + Solana)
- **Demo agent:** `Eversmile12/erc-8004-demo-agent` (16 ⭐)
- **Payment-native framework:** `AgentlyHQ/aixyz` (81 ⭐) — Next.js-like for agents w/ A2A + MCP + x402 + ERC-8004
- **Reference impl:** `ChaosChain/trustless-agents-erc-ri` (51 ⭐)
- **Commercial prototype:** `ChaosChain/chaoschain-genesis-studio` (39 ⭐) — identity + USDC + IP monetization
- **Identity-minting UI:** `Sperax/erc8004-agents` (7 ⭐) — standalone any-EVM mint UI
- **x402 combined stack:** `Trustdev-eth/x402-erc8004-agent` (12 ⭐)
- **Awesome list:** `sudeepb02/awesome-erc8004` (74 ⭐)

---

## 5. Bybit V5 API

### Endpoints

| | Mainnet | Testnet |
|---|---|---|
| REST | `https://api.bybit.com` (alt `https://api.bytick.com`) | `https://api-testnet.bybit.com` |
| WS public spot | `wss://stream.bybit.com/v5/public/spot` | `wss://stream-testnet.bybit.com/v5/public/spot` |
| WS public linear | `wss://stream.bybit.com/v5/public/linear` | (testnet equivalent) |
| WS private | `wss://stream.bybit.com/v5/private` | (testnet equivalent) |

### Auth

HMAC-SHA256, lowercase hex. String to sign: `timestamp + API_key + recv_window + request_parameters`

Required headers:
- `X-BAPI-API-KEY`
- `X-BAPI-TIMESTAMP` (UTC ms)
- `X-BAPI-SIGN`
- `X-BAPI-RECV-WINDOW` (default 5000ms)

Timestamp rule: `server_time - recv_window <= timestamp < server_time + 1000`

### SDKs

- Python: `pip install pybit` (official)
- Node: `npm install bybit-api` (community)
- Go / Java / .NET officially supported
- Docs: https://bybit-exchange.github.io/docs/v5/intro

Testnet keys: self-service at testnet.bybit.com. Mainnet: self-service + KYC + geo restrictions.

---

## 6. Mantle RWA primitives

| Asset | Contract (Mantle Mainnet) | Notes |
|---|---|---|
| **USDY** (Ondo) | `0x5bE26527e817998A7206475496fDE1E68957c5A6` | US treasuries + demand deposits backing; transfer restrictions |
| **mUSD** (rebasing USDY) | `0xab575258d37EaA5C8956EfABe71F4eE8F6397cF3` | Calls `RWADynamicRateOracle.sol` for price; same restrictions as USDY |
| **Redemption Oracle** | `0xA96abbe61AfEdEB0D14a20440Ae7100D9aB4882f` | Source-of-truth for USDY/mUSD price |
| **mETH** | L1 (Ethereum): `0xd5f7838f5c461feff7fe49ea5ebaf7728bb0adfa` | $791.7M TVL, 4.0% native yield |
| **fBTC** | not surfaced in research — check `mantlescan.xyz` | ~$1.5B TVL cross-chain BTC |
| **MI4** | not surfaced (RWA.xyz lists fund only) | $400M index fund |
| **Mantle Treasury** | L1 multisig: `0x78605Df79524164911C144801f41e9811B7DB73D` | for completeness |

Docs:
- Ondo addresses — https://docs.ondo.finance/addresses
- Ondo Mantle integration guide — https://docs.ondo.finance/developer-guides/mantle-integration-guidelines
- RWA.xyz Mantle dashboard — https://app.rwa.xyz/networks/mantle

No single official "Mantle RWA SDK" exists — primitives are individual contracts. Use viem/ethers + standard ERC-20 ABIs.

---

## 7. Sponsor + partner one-paragraph snapshots

| Org | Role | What they actually want |
|---|---|---|
| **BGA** | Track 1 sponsor (AI Trading) | Social-good narrative attached even to trading ("agent gives retail the edge institutions have"). https://chainforgood.org |
| **Mirana Ventures** | Track 2 sponsor (AI Alpha) | Bybit's investment arm; bias toward novel quant strategies + Bybit derivatives volume. Deal size $200K–$20M. https://www.mirana.xyz |
| **Allora Network** | Judge | $35M raised (Polychain/Framework/Delphi); decentralized AI inference; favors projects consuming verifiable ML predictions via their MDK. https://www.allora.network |
| **Nansen** | Judge + credit sponsor | $7K credits; smart-money labels; recently shipped Nansen AI agent on Base/Solana; favors projects consuming their API. https://docs.nansen.ai |
| **Z.ai** | Credit sponsor | Chinese LLM (Zhipu rebrand); 1000 req/day free tier; GLM-4.7-Flash $0.06/MTok input cheapest. https://docs.z.ai |
| **Virtuals Protocol** | Judge | Tokenized AI agent launchpad on Base ($13B+ monthly vol, 18,000+ agents); ACP w/ ERC-8183 co-authored with EF; ⚠️ **direct competitor** — pitch as cross-chain complement, not alternative. https://www.virtuals.io |
| **Four Pillars** | Judge | Korean Web3 research; judges novelty + technical depth + thesis alignment. APAC distribution. |
| **Animoca Brands** | Track 4 sponsor (Consumer) | $5B portfolio; **Minds platform + $10M dev investment program** = real upside; favors consumer/viral/gamified projects that plug into their portfolio. |
| **Hashed** | Judge | Korean VC; 2026 thesis = **stablecoins + AI agents** as dual macro themes. Stamp this pairing. |
| **Caladan** | Judge | Crypto-native MM; favors trading-infra plays with measurable on-chain metrics. https://caladan.xyz |
| **DoraHacks** | Judge | Platform operator; favors process hygiene (deployed contracts, README, complete demos). |
| **Tencent Cloud** | Track 5 sponsor (DevTools) | Cloud-first; favors projects consuming cloud LLM APIs + enterprise readiness. |
| **Elfa AI** | Credit sponsor ($36K) + judge | Inference infrastructure; favors projects using their platform. |
| **Surf AI · Orbit AI · AltLLM · Open Check** | Credit sponsors | Smaller AI partners; specific roles undocumented; likely API/data partners. |
| **HKU (Jack Poon)** | Judge | Honorary Prof. of Practice; favors regulatory savvy + institutional defensibility + clear pitch articulation. |
| **Merchant Moe** | Phase 1 partner DEX | 71.1% of Mantle DEX volume per TheSpotLite; AMM/LP integration point. |
| **Cornell Blockchain · Blockchain at Berkeley · HKUST Crypto-Fintech Lab** | Community partners | Academic credibility + student outreach. |

---

## Open questions

1. **Tencent Cloud credit allocation** — exact compute/API credits not public. Ask at kickoff.
2. **Mirana hackathon-specific prize** — typical follow-on funding extended to standout teams but not itemized.
3. **Validation Registry final spec** — under active TEE-community update; **identity + reputation are stable**.
4. **`byreal-git/RealClaw-Skills` is empty.** Confirm with organizers whether to start from a specific RealClaw distribution or vanilla OpenClaw + Byreal skills.
5. **`docs.byreal.io`** — separate from `byreal-git` GitHub org; no public docs site surfaced.
6. **fBTC + MI4 contract addresses on Mantle** — verify via mantlescan or project repos.
7. **Z.ai hackathon credits** — only standard 1000 req/day free tier surfaced; ask organizers.
