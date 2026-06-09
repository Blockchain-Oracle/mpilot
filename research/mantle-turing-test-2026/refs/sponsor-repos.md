# Sponsor Repos — Clone Commands + What to Borrow

Every repo listed has been verified in `phase2-sponsor-docs.md`. For each: clone command, what it provides, and what's worth borrowing.

---

## Mantle Network

### `mantlenetworkio/*` GitHub org
```bash
gh repo list mantlenetworkio --limit 50
```
Generally infrastructure repos (chain ops, indexers, bridge). Not directly useful for an agent build.

---

## Byreal stack

### `byreal-git/byreal-agent-skills` (44 ⭐, MIT)
```bash
gh repo clone byreal-git/byreal-agent-skills
```
**Borrow:** SKILL.md format (YAML frontmatter + markdown body); CLI command shape (`-o json`, `--dry-run`, `--confirm`); capability catalog pattern. **Required if entering Track 6 path A (DeFi Deep Dive).**

### `byreal-git/byreal-perps-cli` (1 ⭐, MIT)
```bash
gh repo clone byreal-git/byreal-perps-cli
```
**Borrow:** Hyperliquid signing flow; account init without private key handoff; TPSL / leverage management UX. **Required if entering Track 6 path A.**

### `byreal-git/byreal-sdk` (3 ⭐, MIT)
```bash
gh repo clone byreal-git/byreal-sdk
```
**Borrow:** TypeScript wrapper pattern around Solana web3.js + signer callback abstraction. Useful if building a frontend that calls Byreal programmatically rather than via CLI.

### `byreal-git/byreal-api-docs`
```bash
gh repo clone byreal-git/byreal-api-docs
```
**Borrow:** `swagger.json` (153KB) + `router.md`. Read these BEFORE building if integrating directly against `api2.byreal.io` REST instead of CLI/SDK.

### `byreal-git/RealClaw-Skills` (3 ⭐, MIT)
```bash
gh repo clone byreal-git/RealClaw-Skills
```
**Borrow:** Currently empty (`.gitignore` + empty `skills/`). Monitor for organizer-blessed skill examples landing here during the hackathon. **Star + watch.**

### `byreal-git/byreal-clmm` (9 ⭐, Anchor program source)
```bash
gh repo clone byreal-git/byreal-clmm
```
**Borrow:** Anchor program structure if you're building a Solana-side companion contract. Mostly read-only reference.

### `byreal-git/byreal-clmm-sdk` (8 ⭐)
```bash
gh repo clone byreal-git/byreal-clmm-sdk
```
**Borrow:** Lower-level Solana CLMM SDK than `byreal-sdk` — useful if you need pool math directly.

### `byreal-git/byreal-jupiter-integration` (3 ⭐)
```bash
gh repo clone byreal-git/byreal-jupiter-integration
```
**Borrow:** Pattern for routing Byreal as a venue inside the Jupiter aggregator. Cross-venue arbitrage primer.

### Community Byreal repos worth knowing

```bash
gh repo clone Stanleylee01/byreal-mcp                  # community MCP server, auto-sign
gh repo clone ggg223399/byreal-agent-skills            # distribution fork
gh repo clone ggg223399/byreal-skills-playbook         # 120 trading strategies inspiration
gh repo clone ggg223399/byreal-dca-skill               # DCA recurring-buy
```

---

## OpenClaw

### `openclaw/openclaw` (~376k ⭐, MIT)
```bash
gh repo clone openclaw/openclaw
```
**Borrow:** Skills registry resolution; SKILL.md schema; runtime architecture (Gateway + sockets). Read the README and skim the Skills section before designing your own skill.

### `openclaw/clawhub` (8.8k ⭐)
```bash
gh repo clone openclaw/clawhub
```
**Borrow:** Patterns from 5,400+ existing skills. Browse for similar skills first to avoid duplicating effort.

### `hesamsheikh/awesome-openclaw-usecases` (31k ⭐)
```bash
gh repo clone hesamsheikh/awesome-openclaw-usecases
```
**Borrow:** Use-case patterns; what people are actually building with OpenClaw.

### `VoltAgent/awesome-openclaw-skills`
```bash
gh repo clone VoltAgent/awesome-openclaw-skills
```
**Borrow:** Curated skill list.

### `BytePioneer-AI/openclaw-china`
```bash
gh repo clone BytePioneer-AI/openclaw-china
```
**Borrow:** Feishu/DingTalk/QQ/WeChat integrations — relevant if pitching to APAC judges.

### `grp06/openclaw-studio`
```bash
gh repo clone grp06/openclaw-studio
```
**Borrow:** Dashboard for managing OpenClaw agents visually — useful frontend reference.

---

## ERC-8004

### `erc-8004/erc-8004-contracts` (218 ⭐, canonical)
```bash
gh repo clone erc-8004/erc-8004-contracts
```
**Borrow:** Full ABIs (in `abis/` directory); `ERC8004SPEC.md` (source of truth for the spec); test fixtures; deployment scripts.

### Reference implementations & SDKs

```bash
# Rust SDK (164 ⭐)
gh repo clone qntx/erc8004

# TypeScript SDK (67 ⭐)
gh repo clone agent0lab/agent0-ts

# Subgraph (26 ⭐)
gh repo clone agent0lab/subgraph

# TEE-enabled (Phala, 14 ⭐)
gh repo clone Phala-Network/erc-8004-tee-agent

# CLI scaffolder (49 ⭐) — `npx create-8004-agent <name>`
gh repo clone Eversmile12/create-8004-agent

# Demo agent (16 ⭐)
gh repo clone Eversmile12/erc-8004-demo-agent

# Next.js-like framework for payment-native agents (81 ⭐)
gh repo clone AgentlyHQ/aixyz

# Reference implementation (51 ⭐)
gh repo clone ChaosChain/trustless-agents-erc-ri

# End-to-end commercial prototype (39 ⭐)
gh repo clone ChaosChain/chaoschain-genesis-studio

# Standalone any-EVM mint UI (7 ⭐)
gh repo clone Sperax/erc8004-agents

# A2A + x402 + ERC-8004 combined (12 ⭐)
gh repo clone Trustdev-eth/x402-erc8004-agent

# Awesome list (74 ⭐)
gh repo clone sudeepb02/awesome-erc8004
```

**Borrow ranked by usefulness for this hackathon:**

1. **`Eversmile12/create-8004-agent`** — fastest path to a working ERC-8004 + A2A + MCP + USDC payment scaffolded project. Start here unless you need something specific.
2. **`AgentlyHQ/aixyz`** — if your project needs payment-native + Next.js frontend out of the box.
3. **`agent0lab/agent0-ts`** — pure TypeScript SDK if you want to bring your own framework.
4. **`Trustdev-eth/x402-erc8004-agent`** — if combining with x402 micropayments (relevant for Track 6 Agentic Economy + the Mantle/Questflow narrative).
5. **`ChaosChain/chaoschain-genesis-studio`** — if you want a commercial-shape prototype to derive from.
6. **`erc-8004/erc-8004-contracts`** — for the canonical ABIs you'll always need.

---

## Bybit

No specific hackathon repo. Use:

```bash
# Python SDK (official)
pip install pybit

# Node SDK (community)
npm install bybit-api
```

Docs: https://bybit-exchange.github.io/docs/v5/intro

---

## Mantle RWA — Ondo Finance

### Ondo's developer guide (read, don't clone)
https://docs.ondo.finance/developer-guides/mantle-integration-guidelines
https://docs.ondo.finance/addresses

No specific Ondo SDK repo surfaced — use viem/ethers + ERC-20 ABI.

### Function (fBTC) — whitepaper only
https://fbtc.com/home/FBTC-Whitepaper.pdf

---

## Allora Network

```bash
gh repo clone allora-network/allora-chain        # Cosmos chain
gh repo clone allora-network/allora-offchain-node # worker / inference node
```

Live Topics catalog: https://www.allora.network — browse topics, pick one your agent consumes.

---

## Virtuals Protocol

Largely closed-source product on Base; reference:
https://www.virtuals.io
https://github.com/Virtual-Protocol (if public org exists)

ERC-8183 Agent Commerce Protocol spec: search GitHub for "ERC-8183" since release in March 2026.

---

## Nansen

API integration only — no need to clone. Get API key, hit endpoints.

```bash
# When sahil-x is fixed, sentiment about Nansen:
python3 ~/.claude/skills/sahil-x/scripts/search.py --query "Nansen AI agent" --product Latest --n 30
```

---

## Combined "fast clone everything for the build" command

```bash
mkdir -p ~/dev/hackathon/mantel/refs && cd ~/dev/hackathon/mantel/refs

gh repo clone byreal-git/byreal-agent-skills
gh repo clone byreal-git/byreal-perps-cli
gh repo clone byreal-git/byreal-sdk
gh repo clone byreal-git/RealClaw-Skills
gh repo clone byreal-git/byreal-skills-playbook
gh repo clone openclaw/openclaw
gh repo clone openclaw/clawhub
gh repo clone erc-8004/erc-8004-contracts
gh repo clone Eversmile12/create-8004-agent
gh repo clone AgentlyHQ/aixyz
gh repo clone agent0lab/agent0-ts
gh repo clone sudeepb02/awesome-erc8004
```

Disk budget: ~500MB-1.5GB across all of these. Per `sahil-vps-coding-hygiene`, keep refs out of the active project subdir to avoid accidentally vendoring them.
