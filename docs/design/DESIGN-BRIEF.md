# Concierge — Design Brief (Hackathon Submission Assets)

> For: Designer. All deliverables in **SVG**. Brand colors are already known to you — not repeated here.
> Prepared from verified codebase data (contract addresses, repo, deploy state) on 2026-06-15.

---

## 0. Shared facts (use these EXACT strings everywhere — do not retype from memory)

| Field | Value |
|---|---|
| **Product name** | Concierge |
| **Tagline** | Autonomous AI agent for Mantle DeFi |
| **One-liner** | Set a plain-English goal; the agent runs `plan → simulate → propose → execute → record` across 7 Mantle DeFi protocols, with reputation attested on-chain every tick. |
| **Website / QR target** | `https://concierge.xyz` |
| **MCP server endpoint** | `mcp.concierge.xyz/mcp` (hosted) — install: `npx -y @mpilot/mcp` (stdio) |
| **Skill install** | `npx skills add Blockchain-Oracle/concierge` |
| **npm SDK** | `npm i @mpilot/sdk` |
| **GitHub repo** | `https://github.com/Blockchain-Oracle/concierge` |
| **Network (mainnet)** | Mantle Mainnet — chain id `5000` |
| **Network (testnet)** | Mantle Sepolia — chain id `5003` |
| **Mainnet contract (ConciergeRegistry)** | `0xE54B60382bC85C14abc15A20a0fB90d6FAea8025` |
| **Testnet contract (ConciergeRegistry)** | `0x5e73931A99E1D6868F60e4dCCd3774655EFeB7dD` |

**Critical:** blockchain addresses are unforgiving — a single wrong character points to a different contract. Copy/paste the 42-character hex strings above; never hand-type them. Render addresses in a **monospace** font so each character is unambiguous.

---

## Deliverables overview (6 assets, all SVG)

1. **Logo** (new — we have none yet)
2. **README banner** (horizontal)
3. **Architecture diagram**
4. **Mainnet info card** (with QR code)
5. **Testnet info card** (no QR)
6. *(Optional but recommended)* **Social/OG preview card** — see §6

---

## 1. Logo (NEW — design from scratch)

We do not currently have a real logo. There is a **placeholder** SVG icon at `packages/skill-mantle-agent/assets/icon.svg` (plus a `preview.png`) used by the Agent Skill listing — your new logomark should **replace** both. Create the logo fresh; don't treat the placeholder as a starting point.

- **Concept:** "Concierge" = a trusted, white-glove assistant that acts on your behalf. Evoke *guidance / orchestration / trust*, fused with an on-chain/agentic feel. Think a concierge bell, a key, a compass, or an abstract "agent node" routing to many protocols — your call. Avoid generic robot heads.
- **Deliverables (separate SVG files):**
  - **Logomark** (icon only, square-safe) — must read clearly at 32×32 px (favicon) and 512×512 px.
  - **Logotype** (wordmark "Concierge" set in type).
  - **Horizontal lockup** (mark + wordmark side by side).
  - **Stacked lockup** (mark above wordmark).
- **Variants for each:** full-color on light, full-color on dark, monochrome (single-color), and knockout/white. We deploy on both light and dark surfaces.
- **Constraints:** vector only, no raster effects baked in; keep paths clean and named; safe-area padding around the mark; works in 1-color print.

---

## 2. README banner (horizontal)

The first image a visitor sees at the top of the GitHub README — so it must communicate what the project is in 2 seconds. **Wide and short** (it is NOT a vertical poster).

- **Aspect ratio:** ~ **3.5:1 to 4:1** (e.g. 1280×360 or 1600×400 in SVG viewBox units). Must not be tall — README images that are too tall push the content down and annoy readers.
- **Must contain:**
  - Logo lockup (horizontal variant) — prominent, left or center.
  - Product name **Concierge** + tagline *"Autonomous AI agent for Mantle DeFi"*.
  - A short value line: *"plan → simulate → propose → execute → record across 7 Mantle protocols"*.
  - Subtle "Built on Mantle" cue and a hint of the protocol set (Aave V3 · Mantle DEX · Ethena · Ondo · mETH · Li.Fi · ERC-8004) — small, secondary; don't clutter.
  - Optional small badges row vibe (open-source, MCP, npm SDK) — visual only, not real shields.
- **Style:** clean, premium, developer-tool aesthetic (think a polished OSS hero banner). Legible at GitHub's rendered width (~850px) and on mobile.
- **Top-right corner:** small logomark watermark (consistent with the architecture diagram, see §3) is welcome but optional here since the main logo already appears.

---

## 3. Architecture diagram

A clear system diagram a technical judge can read. **Logo + name "Concierge" in the TOP-RIGHT corner** (as a small lockup/watermark).

**What Concierge IS (so you can structure the diagram):** a composable agent primitive — one core, consumable from any AI agent runtime, shipped across 4 surfaces, acting on 7 Mantle DeFi protocols. Here is the full structure to lay out:

### Layer A — User goal (top)
- A user sets a **plain-English goal** (e.g. "earn safe yield on my idle USDC"). Show a person / chat bubble entering the system.

### Layer B — Surfaces (4 entry points)
The product ships across **4 surfaces**, all hanging off the same core:
1. **Web app** (Next.js) — `concierge.xyz`
2. **MCP server** (stdio-first; optional hosted Cloudflare Worker at `mcp.concierge.xyz`)
3. **Agent Skill** (installable via `npx skills add`)
4. **npm SDK** ("AgentKit for Mantle")

### Layer C — Runtime adapters (model/framework-agnostic)
The core plugs into any agent runtime via thin adapters:
- **Vercel AI SDK**, **OpenAI**, **LangChain**, **Coinbase AgentKit**, **MCP**.
- Model-agnostic: works with Claude / GPT / Gemini / Grok (show as interchangeable "LLM" slot).

### Layer D — Core (the keystone)
Core packages — this is the heart of the diagram:
- **`@mpilot/tools`** — framework-agnostic tool registry (every tool has input + output schema). THE architectural keystone everything hangs off.
- **`@mpilot/agent`** — the agent loop.
- **`@mpilot/llm`** — model-agnostic LLM client (Claude / GPT / Gemini / Grok, interchangeable).
- **`@mpilot/sdk`** — the meta/distribution package.
- Show the **tick loop** prominently as a cycle: **plan → simulate → propose → execute → record**.
- Background **tick worker** (`apps/worker`) drives the loop on a schedule; state persists in a **DB** (`@mpilot/db`). A small "control plane" of user tools sits alongside: **get state · get reputation · get attestation · pause · resume · revoke session key** (the human override surface).

### Layer D2 — Execution via smart accounts (the trust/safety layer — DON'T omit)
The agent does not hold your keys. Execution runs through **account abstraction** (`@mpilot/smart-account`):
- **ZeroDev** smart account + **Pimlico** bundler/paymaster → **gasless UserOps**.
- **Session keys** with scoped permissions (the agent can only do what you granted; revocable on-chain).
- **Emergency stop** + EOA fallback.
Show this as a guarded gate between the core and the protocols — it's the "you stay in control" story judges care about.

### Layer E — Protocol providers (7 Mantle DeFi integrations)
The agent acts on 7 protocols (show as a fan-out from core):
1. **Aave V3** (lending/borrowing)
2. **Mantle DEXes** (Merchant Moe / Agni / FusionX / WOOFi — swaps)
3. **Ethena sUSDe** (staked yield)
4. **Ondo USDY** (tokenized treasuries)
5. **mETH staking** (liquid staking)
6. **Li.Fi** (cross-chain bridging)
7. **ERC-8004** (on-chain reputation / identity)

### Layer F — Chain (bottom)
- **Mantle Mainnet (5000)** and **Mantle Sepolia (5003)** — same provider code runs on both (real protocols on mainnet; our own mocks on Sepolia so judges can click through with zero capital).
- **Verifiability claim:** every successful mainnet `execute()` is followed by `record()` writing an **ERC-8004 reputation attestation** (canonicalized + hashed on-chain, full envelope pinned to **IPFS**) — show this as a feedback arrow back up. This is the trust/proof story; make it visible.

**Diagram style notes:** top-to-bottom or left-to-right flow; clear layer labels A–F (you don't need to print the letters — just group visually); the tick-loop cycle and the ERC-8004 attestation arrow are the two "hero" details worth emphasizing. Keep it legible when embedded in a README (it will be viewed ~850px wide).

---

## 4. Mainnet info card (WITH QR code)

A shareable "deployment card" for the submission — proves we're live on Mantle Mainnet.

- **Header:** logo lockup + "Concierge" + a "MAINNET" badge/pill. Make "Mainnet" visually distinct (e.g. a solid/primary treatment) so it's never confused with the testnet card.
- **Contents (label → value, value in monospace):**
  - **Network:** Mantle Mainnet (chain `5000`)
  - **ConciergeRegistry:** `0xE54B60382bC85C14abc15A20a0fB90d6FAea8025`
  - **GitHub:** `github.com/Blockchain-Oracle/concierge`
  - **Website:** `concierge.xyz`
- **QR code (THIS CARD ONLY):** encodes **`https://concierge.xyz`**. Place it prominently (e.g. right side or bottom-right) with a small "Scan to try" caption. Render the QR as crisp vector SVG (not an embedded raster) with a quiet zone/margin so it scans reliably. Test-scan it with a phone before final export.
- **Format:** card/poster proportions are fine here (this one is allowed to be more square/portrait than the banner) — e.g. 1200×675 (16:9) or a square 1080×1080 both work; pick what looks best.

---

## 5. Testnet info card (NO QR code)

Same template/visual system as the mainnet card, but for the Sepolia playground.

- **Header:** logo lockup + "Concierge" + a "TESTNET" badge/pill, visually differentiated from mainnet (e.g. an outlined/secondary treatment).
- **Contents (label → value, value in monospace):**
  - **Network:** Mantle Sepolia (chain `5003`)
  - **ConciergeRegistry:** `0x5e73931A99E1D6868F60e4dCCd3774655EFeB7dD`
  - **GitHub:** `github.com/Blockchain-Oracle/concierge`
  - Optional note: *"Judges can try every protocol on Sepolia with zero capital — our own on-chain mocks mirror the mainnet contracts."*
- **NO QR code** on this card (per request — QR is mainnet-only).
- **Format:** identical to the mainnet card so the two read as a matched pair.

---

## 6. (Optional, recommended) Social / OG preview card

If time allows — a 1200×630 Open Graph image (logo + name + tagline + "Built on Mantle") so the repo/site link unfurls nicely when shared on X / Telegram / Discord. Same brand system. SVG.

---

## Consistency checklist (applies to all assets)

- [ ] Logomark used consistently across banner, architecture diagram (top-right), and both cards.
- [ ] All hex addresses in **monospace**, copy-pasted from §0 (not hand-typed), 42 chars each, `0x`-prefixed.
- [ ] Mainnet vs Testnet cards are visually distinct but clearly a matched set.
- [ ] QR appears on the **mainnet card only**, encodes `https://concierge.xyz`, vector, scan-tested.
- [ ] README banner is **wide/short** (≤ ~4:1), legible at ~850px and on mobile.
- [ ] Architecture diagram readable when embedded at README width; tick-loop + ERC-8004 attestation arrow emphasized.
- [ ] Every asset delivered as clean SVG with named layers; light + dark variants where relevant.
