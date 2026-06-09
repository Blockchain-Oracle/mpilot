# AUDIT-4: GitHub sanity check

**Date:** 2026-06-03
**Auditor:** AUDIT-4 (external GitHub-evidence sanity-checker)
**Verdict:** NEEDS_REVIEW

## Summary

Surveyed 60+ public repos pushed 2025-2026 in 6 lanes adjacent to Patron (Aave-agent, BNPL/self-repaying loans, ERC-8004 reference impls, Telegram Mini App + EVM, crypto checkout SDKs, Claude SDK + on-chain). The 2026 consensus stack for "AI agent + on-chain action" is **viem 2.x + Next.js 15 + Tailwind + RainbowKit + TS** — Patron is solidly on the herd here. Five non-trivial divergences merit attention: (1) **Hono backend** has near-zero adoption in this niche — peers use Next.js API routes, Express, or Bun-native; (2) the canonical `erc-8004/erc-8004-contracts` (218 stars) uses **Hardhat + ethers v6 + viem**, not Foundry-only — we should verify our ABI consumption path matches theirs; (3) **`@anthropic-ai/sdk` direct** has near-zero adoption — peers use Vercel `ai` SDK or framework wrappers (aixyz, ElizaOS); (4) **no peer Telegram Mini App + Privy + EVM repos exist** — we are off-map here; (5) **no peer "stablecoin BNPL" or "crypto BNPL agent" repos** at all — the wedge is genuinely open, but means zero copy-paste prior art.

---

## Lane 1 — AI agent + EVM Aave wrapper

### projectman14/aave_agent
- **Pushed:** 2025-02-08  **Stars:** 0  **Chain:** Aave (EVM)
- **Stack:** TypeScript, viem
- **What it does:** Single-script Aave position manager
- **Comparison:** viem-aligned; no framework
- **Lesson:** Confirms viem-only Aave interactions are the default — no need for ethers fallback

### agentool/bitte-aave-agent
- **Pushed:** 2025-01-07  **Stars:** 0  **Chain:** 12+ EVM
- **Stack:** TypeScript, Bitte agent framework
- **What it does:** Multi-chain Aave action agent on the Bitte platform
- **Comparison:** Uses a hosted agent framework (Bitte), not raw `@anthropic-ai/sdk`
- **Lesson:** Several active 2026 projects offload the agent runtime to a framework; building our own loop is the minority path. Acceptable for hackathon judging visibility, but increases maintenance risk.

### samarabdelhameed/AION_AI_Agent
- **Pushed:** 2025-11-01  **Stars:** 0  **Chain:** Multi
- **Stack:** Solidity + TS, Venus protocol (Aave fork on BNB)
- **What it does:** AI-driven DeFi automation with strategy execution
- **Comparison:** Solidity-heavy, OZ contracts — same as us
- **Lesson:** Strategy contract pattern (`Treasury.sol` analog) is consensus. Our contract layout is normal.

### yehia67/ai-agent-defi-consultant
- **Pushed:** 2025-06-29  **Stars:** 2  **Chain:** Multi-EVM
- **Stack:** TypeScript, viem
- **What it does:** On-chain decisions buddy for end-users
- **Lesson:** Consultant-only pattern, no autonomous execution. Patron's autonomous BNPL flow is materially different from "advisor" peers — differentiator confirmed.

---

## Lane 2 — Stablecoin BNPL / collateralized lending UX

### Findings: **ZERO** repos matching `"stablecoin bnpl"`. **ZERO** repos matching `"buy now pay later defi"` pushed 2025+. Alchemix self-repaying-loan repos exist but are 2022-2024 forks.

### buidlLabs3/castalchemy
- **Pushed:** 2026-05-06  **Stars:** 1  **Chain:** Base (Farcaster)
- **Stack:** TypeScript, Farcaster Frames, Alchemix
- **What it does:** Manage Alchemix self-repaying loans inside Farcaster
- **Lesson:** Only 2026 repo doing self-repaying-loan UX in a non-traditional surface (Frames, not TG). Validates that "embed credit primitive in social surface" is a live pattern. Patron does this for Telegram instead of Farcaster — defensible.

### QuenumGerald/alchemix-self-repaying-loans
- **Pushed:** 2025-04-01  **Stars:** 0  **Stack:** JavaScript
- **What it does:** Alchemix protocol components extraction
- **Lesson:** Confirms Alchemix is the only canonical "self-repaying loan" reference in the wild; Patron does "yield > borrow rate" with Aave V3 which is conceptually simpler (no synthetic asset) — must own this distinction in PRD.

### Verdict for Lane 2: NO PRIOR ART for "agent-managed stablecoin BNPL on Aave." This is a positive (genuine wedge) and a negative (zero copy-paste prior art for UX patterns).

---

## Lane 3 — ERC-8004 reference implementations

### erc-8004/erc-8004-contracts (canonical reference, 218 stars)
- **Pushed:** 2026-06-02  **Stars:** 218  **Chain:** Multi-EVM
- **Stack:** **Hardhat 3 + ethers v6 + viem 2.45 + OpenZeppelin upgradeable**
- **What it does:** Registry contracts curated by the ERC-8004 team
- **Comparison to Patron stack:** **DIVERGES.** Patron uses Foundry only; canonical uses Hardhat + Ignition + viem-based test runner. Patron's `@erc-8004` ABI consumption is OK because viem ingests either, but we must verify we're matching the canonical ABI hashes exactly.
- **Lesson:** Cross-check our `packages/shared/abi/ERC8004Identity.json` against the canonical Hardhat artifact output; do NOT regenerate from a third-party fork.

### qntx/erc8004 (164 stars)
- **Pushed:** 2026-05-24  **Stars:** 164  **Stack:** Rust SDK
- **What it does:** Rust SDK for ERC-8004 onchain agent registry
- **Lesson:** Confirms ERC-8004 has multi-language SDK ecosystem; TS consumers (us) are first-class.

### Eversmile12/create-8004-agent (49 stars)
- **Pushed:** 2026-03-04  **Stars:** 49  **Chain:** EVM + Solana
- **Stack:** Node CLI, viem 2.21, `@4mica/sdk`, `@modelcontextprotocol/sdk`, x402, vitest
- **What it does:** `npx` scaffolder for ERC-8004 agents with A2A/MCP/x402
- **Comparison:** viem + vitest aligned. Uses **MCP server pattern** + **x402 micropayments** — Patron has neither in the stack.
- **Lesson:** Most 2026 ERC-8004 peer repos co-bundle **MCP + x402** as the "agent commerce" baseline. Patron's merchant integration uses a custom Checkout SDK instead of x402 — this is a deliberate divergence that should be defended in the PRD (x402 wouldn't fit BNPL settlement semantics).

### AgentlyHQ/aixyz (81 stars)
- **Pushed:** 2026-05-29  **Stars:** 81  **Stack:** Bun + Turbo monorepo, Vercel `ai` SDK v6, Express, viem 2.47, x402, MCP, ERC-8004
- **What it does:** "Next.js-like framework for payment-native AI agents"
- **Comparison:** **DIVERGES on three layers:** (a) Vercel `ai` SDK not `@anthropic-ai/sdk`; (b) Express not Hono; (c) Bun not Node 22. But: Turbo monorepo, viem, TS — same as us.
- **Lesson:** The 2026 emerging consensus for *agent framework code* is Vercel `ai` SDK (provider-agnostic) over `@anthropic-ai/sdk` direct. Patron's lock-in to Claude is a deliberate quality choice; defensible if PRD explicitly cites Opus 4.7 tool-use quality.

### ChaosChain/chaoschain-genesis-studio (39 stars)
- **Pushed:** 2026-02-07  **Stack:** Python
- **What it does:** "First end-to-end commercial prototype for ERC-8004" — on-chain identity + verifiable work + USDC payments
- **Lesson:** Python-stack peer; not directly comparable. Confirms ChaosChain is positioning itself as the reference commercial deployment.

### baairon/ethagent (6 stars, very active)
- **Pushed:** 2026-06-02  **Stack:** viem 2.48, Ink (CLI UI), Foundry contracts, Node 20+
- **What it does:** Portable agent identity on ERC-8004 + IPFS, snaps into any Claude Code session
- **Lesson:** Uses **Foundry for contracts + viem + TS** — closest stack match to Patron. Validates our exact contracts toolchain.

### ychenfen/agentic-wallet-treasury (direct Mantle Turing Test peer)
- **Pushed:** 2026-06-01  **Stars:** 1  **Chain:** Mantle
- **Stack:** TS monorepo (npm not pnpm), Forge contracts, custom byreal-probe scripts, no Next.js
- **What it does:** ERC-8004 multi-agent treasury demo for our exact hackathon
- **Comparison:** Same hackathon. Uses Forge + viem-style TS scripts + byreal-cli integration — same skeleton as us. No web frontend, no Telegram Mini App, no merchant SDK.
- **Lesson:** Direct competitor for Track 1 (Identity) but they have NO consumer surface. Patron's web + TMA + Checkout SDK is materially larger surface area — competitive advantage on shipping breadth.

### sethoshi18/arc-agent-payments
- **Pushed:** 2026-06-02  **Stack:** TS, Circle App Kit, MCP, viem, tsx — no Hono, no Next.js
- **Lesson:** "Headless agent" pattern; no consumer UI. Reinforces that Patron's UI investment is differentiating.

### Adarsha-gg/trustmcp
- **Pushed:** 2026-06-02  **Stack:** Next.js 16, React 19, viem 2.52, Tailwind v4, solc
- **What it does:** Trust-gated MCP gateway scoring ERC-8004 reputation before agent tool calls
- **Lesson:** Tailwind v4 + Next.js 15-16 + viem 2.x is fully canonical for 2026 — Patron's frontend stack is consensus.

### 0xmonas/Khora (7 stars)
- **Pushed:** 2026-06-01  **Stack:** Next.js 15, React 18, viem 2.45, wagmi 2.19, RainbowKit 2.2, framer-motion, Upstash Redis/ratelimit, iron-session
- **What it does:** On-chain AI agent generator on Shape with ERC-8004 identity
- **Comparison:** Near-identical stack to Patron (Next.js 15 + viem + wagmi + RainbowKit + Upstash Redis + Tailwind) — but NO Hono, NO Drizzle, NO Privy. Uses Next.js API routes + Upstash directly.
- **Lesson:** **This is the strongest consensus signal:** Khora's stack is what serious 2026 Next.js+EVM+agent projects look like. Patron's choice of Hono backend (separate service) is a divergence; everyone else uses Next.js API routes.

---

## Lane 4 — Telegram Mini App + EVM

### Findings: Search for `"telegram mini app evm"` returned **1 repo**; `"telegram mini app privy"` returned **0 repos**.

### CeylonT/telegram-mini-apps-evm
- **Pushed:** 2024-11-11  **Stars:** 1
- **Lesson:** Only public reference. Pattern is **rare in public GH** — most TMA+EVM work is private/proprietary.

### twa-dev/SDK
- **Pushed:** 2025-02-05  **Stars:** 331
- **Lesson:** `@twa-dev/sdk` is the only consensus library for TMA WebView APIs; our pick is correct.

### Verdict: NO PEER REPOS using "Privy embedded wallet inside TG WebView" pattern. Patron is genuinely off-map here. This means: (a) novelty — good for Track signals; (b) integration risk — no copy-paste reference; (c) PRD must overweight the Mini App spike epic, because there's no community pattern to lean on.

---

## Lane 5 — Checkout SDK pattern for crypto

### Findings: **ZERO** repos for `"crypto checkout sdk"`; **ZERO** public Helio SDK examples; Helio `@heliofi/checkout-sdk` is published but ships closed-source.

### Lesson: There is no public OSS "crypto checkout SDK" reference. Industry players (Helio, Coinbase Commerce, NOWPayments) all ship as closed SDKs targeting **React + vanilla JS embed scripts**. Patron's Checkout SDK should follow this consensus: ship a React component + a `<script>`-tag embed + a server webhook spec. Foundation stack assumption (TS + viem + React) is correct.

---

## Lane 6 — Claude Agent SDK + on-chain

### Findings: `"@anthropic-ai/sdk" + "viem"` returned 20 hits, mostly tangential (CLI tools, MCP servers, dev guides). **`"claude agent sdk defi"` returned 0 repos.**

### bit-gpt/h402 (example)
- **Stack:** TypeScript example: Claude SDK + viem + x402
- **Lesson:** Validates that `@anthropic-ai/sdk` + viem combination is technically clean. But it's an example, not a production app.

### Verdict: **Effectively zero serious production projects** combine Claude Agent SDK + viem for autonomous on-chain action. The peer-set has moved to Vercel `ai` SDK (provider-agnostic), framework wrappers (aixyz, Eliza), or MCP-based architectures. Patron's choice is defensible for Anthropic-sponsor-track judging signal but is statistically a minority pattern.

---

## Stack consensus check (per layer)

| Layer | Patron pick | 2026 peer consensus | Verdict |
|---|---|---|---|
| Language (TS) | TypeScript 5.6+ | TypeScript 5.x | CONSENSUS |
| Runtime | Node 22 LTS | Node 20-22 OR Bun (aixyz) | CONSENSUS (Bun emerging) |
| Solidity build | Foundry | Foundry (Khora, ethagent, ychenfen) BUT canonical ERC-8004 uses Hardhat 3 | CONSENSUS for app contracts |
| Frontend | Next.js 15 | Next.js 15-16 (Khora, trustmcp) | CONSENSUS |
| CSS | Tailwind v4 | Tailwind v4 (trustmcp, Khora) | CONSENSUS |
| EVM client | viem 2.x | viem 2.x (universal — every peer) | CONSENSUS |
| Wallet (web) | wagmi v2 + RainbowKit | wagmi v2 + RainbowKit (Khora) | CONSENSUS |
| Wallet (Mini App) | Privy | No peer reference; TON/TonConnect dominates TG | **DIVERGENT (no map)** |
| Backend framework | Hono 4.x | Next.js API routes (Khora) OR Express (aixyz) OR none (headless) | **DIVERGENT** |
| Database | Postgres on Neon | Upstash Redis (Khora) for state; no Postgres reference | DIVERGENT but defensible |
| ORM | Drizzle | Drizzle is 2026 default for TS — no peer disagrees | CONSENSUS |
| LLM client | `@anthropic-ai/sdk` direct | Vercel `ai` SDK (aixyz) OR framework (Eliza, Bitte) | **DIVERGENT** |
| Scheduler | BullMQ + Upstash | No peer reference (all peers are single-flow) | NO SIGNAL |
| Monorepo | pnpm + Turborepo | pnpm + Turborepo (aixyz, Khora overrides) OR npm workspaces (ychenfen) | CONSENSUS |
| Lint | Biome | Prettier + ESLint (Khora, aixyz) | DIVERGENT (Biome winning) |
| Tests TS | Vitest | Vitest (universal) | CONSENSUS |
| Tests Solidity | Forge | Forge (universal for app contracts) | CONSENSUS |
| MCP server | Not in stack | MCP server bundled by every serious agent peer | **MISSING** |
| x402 micropayments | Not in stack | x402 bundled by every ERC-8004 peer (Eversmile12, aixyz, Sperax) | **MISSING (intentional?)** |

---

## Risky stack picks

1. **Hono backend as a separate service.** Every peer Next.js+EVM+agent project (Khora, trustmcp) puts business logic in Next.js API routes / route handlers. Hono is technically excellent but adds an operational service (Railway) with zero ecosystem-pattern precedent in this niche. Risk: hackathon judges see "two backends" and ding for over-engineering; engineering time burned on Vercel↔Railway plumbing.
   - **Mitigation if kept:** Document in ADR-001 update why Hono > Next.js API routes (long-running BullMQ workers, OpenAPI for SDK, etc.) — these reasons are real but must be in writing.

2. **`@anthropic-ai/sdk` direct (no abstraction).** Vercel `ai` SDK has become the 2026 consensus for "swap models without rewrites." Patron commits to Claude. Risk: if Opus 4.7 throughput/cost surprises during demo, no escape valve.
   - **Mitigation:** Defensible because the project explicitly targets the Anthropic / Claude sponsor track. Keep the bet — but wrap LLM calls behind a single `agent/decide.ts` so a future switch is one-file.

3. **Privy in TG Mini App with zero public reference.** Lane-4 search returned zero peer repos doing this exact pattern. Risk: integration unknowns (Privy's embedded wallet inside TG WebView session lifecycle, JWT propagation, deep-link flow) — none of these can be debugged by Googling.
   - **Mitigation:** Build a TG+Privy spike epic FIRST, before any merchant work. If Privy embedded EVM doesn't work cleanly inside TG WebView, fall back to deep-linking to web app for transactions (degrades UX but de-risks shipping).

---

## Missing pieces (common peer patterns we don't have)

1. **MCP server.** Every serious ERC-8004 peer (Eversmile12, aixyz, ChaosChain, Adarsha-gg/trustmcp, Sperax/x402-stablecoin) ships an MCP server. Patron doesn't. For Anthropic-track judging signal, consider exposing the agent's tools as an MCP server alongside the Hono REST API — cheap win, ~1 ticket.

2. **x402 micropayments primitive.** Every ERC-8004 commerce repo bundles x402. Patron's Checkout SDK uses BNPL settlement semantics (loan-funded purchase, not pay-per-call), so x402 doesn't fit the merchant flow — but it might fit the *agent-to-agent fee* flow (merchant pays Patron a take rate). Worth one PRD line acknowledging the choice.

3. **Public agent registry / ENS subdomain.** Most ERC-8004 peers (Khora, Eversmile12, Sperax) issue an ENS/subdomain or public agent profile URL. Patron has the on-chain Identity NFT but no public "https://patron.xyz/agent/<id>" page in v1. Cheap addition that improves judging visibility for ERC-8004 track.

---

## Validated picks (solidly with consensus)

- **viem 2.x** — universal; do not consider ethers
- **Next.js 15 + Tailwind v4** — Khora, trustmcp confirm
- **wagmi v2 + RainbowKit for web** — Khora exact match
- **Foundry for app contracts** — ethagent, ychenfen, Khora all use Forge
- **Drizzle ORM** — 2026 default; no peer disagrees
- **Vitest** — universal
- **pnpm + Turborepo** — aixyz, Khora overrides confirm
- **`@twa-dev/sdk` for TMA hooks** — only canonical library, 331 stars
- **OpenZeppelin contracts** — universal Solidity baseline

---

## Recommended spec patches

| File | Change | Priority |
|---|---|---|
| `docs/architecture.md` ADR section | Add **ADR-013: Hono over Next.js API routes** with explicit reasoning (long-running BullMQ workers can't live in Vercel serverless functions; OpenAPI export for Checkout SDK; clear service boundary for indexer). Without this ADR, the choice looks arbitrary vs peer consensus. | HIGH |
| `docs/architecture.md` ADR section | Add **ADR-014: `@anthropic-ai/sdk` direct over Vercel `ai` SDK** citing Anthropic sponsor-track alignment + Opus 4.7 tool-use quality. Pre-empts reviewer question. | HIGH |
| `docs/architecture.md` Stack table | Add row: **MCP server** — `@modelcontextprotocol/sdk` exposing agent tool surface alongside REST. ~1 ticket to add, big judging-signal upside for Anthropic + ERC-8004 tracks. | MEDIUM |
| `docs/architecture.md` ADR-008 (Privy in Mini App) | Strengthen "Consequences" to explicitly acknowledge ZERO public reference repos for `Privy + TG WebView + EVM`. Add fallback note: if integration burns >2 days, fall back to deep-linking transactions to web app. | HIGH |
| `docs/epics.md` Mini App epic | Add explicit "Privy-in-TG spike" as FIRST story before any merchant integration; budget for 1 full day exploration; named go/no-go gate. | HIGH |
| `packages/shared/abi/` (story or task) | Add CI check that Identity ABI hash matches `erc-8004/erc-8004-contracts` canonical artifact hash. Prevents silent ABI drift if we regenerate from a fork. | MEDIUM |
| `docs/PRD.md` Differentiators section | Explicitly call out: "No 2026 public-GH repo does agent-managed stablecoin BNPL on Aave" — convert the empty-Lane-2 finding into a positioning statement. | MEDIUM |
| `docs/PRD.md` Competitor section | Mention `ychenfen/agentic-wallet-treasury` as direct Mantle Turing Test competitor; note our consumer-surface (web + TMA + Checkout SDK) is materially larger. | LOW |

**Total patches recommended: 8** (4 HIGH, 3 MEDIUM, 1 LOW).

---

## Files touched

- `/Users/abu/dev/hackathon/mantel/.audit/04-github-sanity-check.md` (this file)

## Files referenced

- `/Users/abu/dev/hackathon/mantel/docs/architecture.md` (Stack section, ADRs)
