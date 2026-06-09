# Patron — System Design (v2)

**Project:** Patron (Mantle Turing Test Hackathon 2026 — Phase 2 "AI Awakening")
**Submission deadline:** 2026-06-15 15:59 UTC
**Tracks targeted:** Track 3 (AI × RWA) + Track 6 (Agentic Wallets & Economy) + Grand Champion + Best UI/UX + 20-Project Deployment Award (5 nominations from one project)
**Date:** 2026-06-02 (v2 supersedes v1 — corrected after OpenClaw verification + agent-at-center re-frame)
**Status:** Approved direction; locks before `sahil-spec-writer` produces formal artifacts

---

## 1. What Patron is, in one paragraph

Patron is a buy-now-pay-later product where users **spend without selling their stablecoin savings**. They lock yield-bearing **sUSDe** on Mantle as collateral; an **AI agent owned by the user** (one ERC-8004 Identity NFT per user) makes the real decisions — whether to open the loan, when to repay, whether to trust the merchant, when to rotate if depeg risk rises. The agent borrows USDC against the user's sUSDe via Aave V3 on Mantle (stablecoin E-Mode 1, LTV 90%); the collateral's yield covers the borrow rate (today: sUSDe ~3.8% APY vs USDC borrow ~3.5% APR; spread compressed but structurally non-negative — historically wider). The position has a near-zero cost-of-credit floor: **the sUSDe yield pays the loan interest, not the user's wallet**. Every agent decision is logged via ERC-8004 reputation so the agent has a verifiable on-chain track record the user owns. Merchants integrate via a 1-line embeddable Checkout SDK. Users access via a full web app or a Telegram Mini App and **manage their agent** from a dashboard with permission summaries and a one-tap Emergency Freeze.

**Pitch opener:** *"In May 2026 Klarna had to rehire human disputes agents because their AI hallucinated and they couldn't audit it. Watch what happens when the agent is held accountable on-chain."*

**One-sentence value:** *Buy now, pay later — except your savings keep earning, the AI is held accountable on-chain, and the agent is yours.*

---

## 2. Locked decisions

| Decision | Value | Source |
|---|---|---|
| Product name | **Patron** | Abu approved 2026-06-02 |
| Chain | **Mantle Mainnet (5000)** + **Mantle Sepolia (5003)** | Abu directive + feasibility gate |
| v1 collateral asset | **sUSDe** (Ethena, on Aave Mantle) | Feasibility gate recommendation |
| v1 borrow asset | **USDC** on Aave Mantle | Feasibility gate |
| Lending protocol | **Aave V3 on Mantle** pool `0x458F293454fE0d67EC0655f3672301301DD51422` | Feasibility gate |
| Surfaces | **Web app (full product) + Telegram Mini App (full product)** | Abu directive |
| Scope | **Multi-merchant directory + Checkout SDK + 3 demo merchants** — no MVP trimming | Abu directive |
| Agent decision engine | **Claude Agent SDK** (`@anthropic-ai/sdk`) in our multi-tenant backend | Corrected after OpenClaw verification (OpenClaw is single-user, self-hosted — not suitable) |
| Agent identity | One **ERC-8004 Identity NFT per user**, owned by user's wallet | Agent-at-center re-frame |
| Agent authorization | **EIP-7702 session keys** for on-chain delegation (revocable, scoped) + **scoped API keys** for off-chain access | Subagent research — 2026 consensus stack |
| Byreal integration | **`byreal-cli` invoked as a bash tool call** from Claude Agent SDK in backend (no OpenClaw needed) | Track 6 qualification, simpler integration |
| ERC-8004 usage | Identity + Reputation Registries on Mantle Mainnet (CREATE2 canonical addresses); skip Validation Registry (in flux) | Domain research |
| Repo strategy | **Monorepo** (pnpm workspaces + Turborepo) | Single CI, single 400-LOC enforcement |
| Hard file-size cap | **400 lines per file**, enforced in CI | Abu directive |
| First story | **CI/CD setup** | Abu directive |
| ❌ OpenClaw | **Dropped** — single-user self-hosted runtime, not fit for multi-tenant SaaS | Abu directive after verification |
| ❌ Self-host Patron locally | **Dropped** — out of scope; hosted SaaS only | Abu directive |
| ❌ Cross-chain reputation reads | **v2** — theoretical/demo only in 2026; not a v1 demo claim | Subagent research |

---

## 3. High-level architecture

```
┌─ USER SURFACES ─────────────────────────────────────────────────────┐
│  Web App (Next.js 15)              Telegram Mini App (Next.js 15)   │
│  routes: /, /app, /merchants,      routes: /app, /checkout/:order   │
│          /m/:slug, /checkout/:id   rendered inside TG WebView       │
│  wallet: wagmi v2 + RainbowKit     wallet: Privy (social → EVM)     │
│  "Open in Telegram" CTA → mini     deep-link → web fallback         │
│  ────────────────────────────────────────────────────────────────── │
│  shared/ui · shared/hooks · shared/abi · shared/types               │
└─────────────────────────────────────────────────────────────────────┘
                                  │
┌─ MULTI-TENANT BACKEND (the "always-on agent brain") ────────────────┐
│  Hono on Node 22 · Postgres (Neon serverless) · Drizzle ORM         │
│                                                                     │
│  ┌─ API ─────────────────────────────────────────────────────────┐  │
│  │  /merchants, /users/me, /orders, /webhooks/merchant,         │  │
│  │  /events (indexer ingest), /agent/task, /api-keys, /audit     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─ Decision Engine: Claude Agent SDK ────────────────────────────┐ │
│  │  Tool calls:                                                  │ │
│  │    on-chain: viem reads/writes through agent's session key    │ │
│  │    on-chain prices: Aave Oracle aggregator (per ADR-003)      │ │
│  │    off-chain: Nansen API, Allora inference,                   │ │
│  │               sanction screens, byreal-cli (bash)             │ │
│  │  Per-decision audit log → Postgres + ERC-8004 receipt         │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌─ Scheduler / Keeper ───────────────────────────────────────────┐ │
│  │  cron jobs (BullMQ on Redis OR node-cron for v1):             │ │
│  │    * monitor sUSDe peg + Aave health every 60s                │ │
│  │    * trigger paydown when yield delta crosses threshold       │ │
│  │    * health-factor check on every position every 5m           │ │
│  │  event-driven (from on-chain indexer):                        │ │
│  │    * react to liquidation alerts                              │ │
│  │    * react to depeg signal trips                              │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌─ Indexer ──────────────────────────────────────────────────────┐ │
│  │  Custom Hono service polling Mantlescan API + viem event logs │ │
│  │  Writes events to Postgres for scheduler + dashboard consumption│ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                  │
┌─ ON-CHAIN (Mantle Mainnet 5000 + Sepolia 5003) ─────────────────────┐
│  PatronVault.sol            (lock sUSDe, borrow USDC, repay, pause) │
│  MerchantRegistry.sol       (register, USDC bond, reputation)       │
│  ReputationProxy.sol        (wrap ERC-8004 setMetadata calls)       │
│  AgentAuthorizer.sol        (EIP-7702 session key issuance + revoke)│
│  ─────── External (we don't own these) ─────                        │
│  Aave V3 Pool (Mantle)     0x458F293454fE0d67EC0655f3672301301DD51422│
│  sUSDe (Mantle)            0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2│
│  USDC (Mantle)             0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9│
│  ERC-8004 Identity         0x8004A169FB4a3325136EB29fA0ceB6D2e539a432│
│  ERC-8004 Reputation       0x8004BAa17C55a88189AE136b182e5fdA19dE9b63│
│  ─────────────────────────────────────────────────────────          │
│  Checkout SDK (TS) → embedded by merchants in their storefronts     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Packages in the monorepo

```
patron/
├── apps/
│   ├── web/                    # Next.js 15 — full web product (landing + app)
│   ├── mini/                   # Next.js 15 — Telegram Mini App
│   ├── api/                    # Hono backend (API + scheduler + indexer + agent decision engine)
│   └── docs/                   # Nextra — merchant SDK docs
├── packages/
│   ├── contracts/              # Foundry — Solidity 0.8.26+
│   ├── sdk-js/                 # `@patron/sdk-js` — vanilla JS checkout widget
│   ├── sdk-react/              # `@patron/react` — <PatronButton /> React component
│   ├── shared/                 # Types, ABI bindings, addresses, utilities
│   └── ui/                     # Shared React components (used by web + mini)
├── demo-merchants/
│   ├── threads-by-mara/        # Fashion (Next.js)
│   ├── pixelink/               # Digital goods (Next.js)
│   └── dialer-pro/             # Services (Next.js)
├── .github/workflows/          # CI/CD
├── .changeset/                 # Versioning for sdk-js + sdk-react
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

---

## 5. Stack (best-practices justified)

| Layer | Choice | Justification |
|---|---|---|
| **Contracts** | Foundry (Solidity 0.8.26+) | Industry default 2026 · faster tests than Hardhat · matches Mantle dev guide |
| **Frontend** | Next.js 15 App Router · TypeScript · Tailwind v4 | RSC keeps client bundle small (matters for TG WebView) · same codebase serves web + mini |
| **Component library** | shadcn/ui base + 21st.dev / Aceternity / Magic UI (via `premium-ui` skill) | Best UI/UX prize edge · avoids generic-shadcn slop |
| **Wallet (web)** | wagmi v2 + viem v2 + RainbowKit | Standard EVM stack |
| **Wallet (mini)** | Privy (social/email → embedded EVM) | wagmi struggles in TG WebView; Privy is the proven path |
| **Backend** | Hono on Node 22 | Lightweight · runs on Node + CF Workers · TypeScript-first |
| **Database** | Postgres (Neon serverless) + Drizzle ORM | Zero-config Postgres · type-safe schema · branching for testing |
| **Decision engine** | Claude Agent SDK (`@anthropic-ai/sdk`) | Multi-tenant SaaS-friendly · stateless per request · we own the orchestration |
| **Scheduler** | BullMQ on Redis (Upstash serverless) OR node-cron in api process for v1 | Persistent scheduled jobs for depeg monitoring + auto-paydown |
| **Indexer** | Custom Hono service polling Mantlescan API + viem event logs | Lighter than The Graph for 13-day window |
| **Bash tool calls from agent** | `byreal-cli` (`@byreal-io/byreal-cli`) invoked via Node `child_process` | Track 6 qualification; no OpenClaw runtime needed |
| **Hosting (web/mini)** | Vercel | Best Next.js path · preview-per-PR |
| **Hosting (api)** | Railway | Postgres-adjacent · simple env vars |
| **Tests (contracts)** | Foundry (unit + fuzz + invariant) | Same toolchain as build |
| **Tests (TS)** | Vitest | Fastest 2026 JS test runner |
| **Tests (e2e)** | Playwright | TG WebView test mode support |
| **Lint** | Biome (single tool for lint + format + `max-lines: 400`) | 10× faster than ESLint+Prettier · TypeScript-native |
| **CI** | GitHub Actions | Free for public repos |
| **Security scanners** | Slither + Aderyn (Solidity) in CI | Industry standard 2026 |
| **Pre-commit** | Husky + lint-staged + Biome | Catches 400-LOC + formatting before push |
| **Versioning (SDKs)** | Changesets | npm monorepo standard |
| **Monorepo** | pnpm workspaces + Turborepo | Fastest install · Turbo cache · industry default |

---

## 6. The agent's real decisions (not button-clicks)

Each user owns one ERC-8004 Identity NFT — their personal financial agent. The agent's brain runs in our backend (Claude Agent SDK), but the decisions are signed by an EIP-7702 session key the user delegates to the agent (revocable at any time via Emergency Freeze).

| Decision | What the agent does | Trigger |
|---|---|---|
| **OpenLoan(merchant, amount)** | Assesses merchant trust (registry + bond + reputation), checks user health factor + Aave borrow rate vs sUSDe yield, decides approve / decline / suggest different amount. Logs ERC-8004 reputation entry. | User clicks "Pay with Patron" on a checkout |
| **RepayPosition(positionId)** | Computes optimal moment (gas window + yield accrued), executes repayment to Aave. Updates ERC-8004 reputation. | Scheduled (BullMQ cron) when yield-delta threshold trips |
| **MonitorDepeg()** | Checks Aave Oracle sUSDe reading (Capped sUSDe/USDT/USD composite, per ADR-003) + Allora depeg-probability inference + Aave V3 health. If risk trips, **autonomously rotates user out** per user-set policy. | Scheduled every 60s |
| **VerifyMerchant(merchantId)** | Cross-checks reputation, bond status, on-chain history, sanction screen (Nansen API). Approves or flags. | First time agent sees a new merchant |
| **PersonalizeLimits(userId)** | Based on user history, suggests spending caps + merchant whitelist + repayment cadence. User accepts / overrides. | Weekly batch job |
| **HandleDispute(positionId, claim)** | Collects evidence, posts ERC-8004 attestation, can mediate between user + merchant | User raises a dispute |

These decisions are what make Patron an agentic product. Smart contracts handle execution; the agent decides whether to execute, when, and how.

---

## 7. User-facing agent dashboard

Per subagent research — patterns proven in Cobo / Openfort / Privy / Anthropic Console / Replit Agent / Devin / Lindy:

| Element | Purpose |
|---|---|
| **Reputation score + history** | Lifetime ERC-8004 reputation; on-chain receipt links per action |
| **Plain-language permission summary** | *"Patron can spend up to $200 USDC per 24h on whitelisted merchants until Aug 1."* Translates EIP-7702 session-key bytecode to English |
| **Emergency Freeze (one tap)** | Revokes all delegated session keys immediately. Prominent — the panic button most LLM dashboards don't have. Direct answer to the Klarna failure mode in user-visible form |
| **Activity feed with sub-agent tree** | Multi-step decisions shown as a tree, not flat log (Replit Agent / Devin pattern) |
| **Position list with live tickers** | Each open position shows: collateral, loan balance, yield-vs-interest delta, projected paydown date |
| **Merchant directory + favorites** | Browse + search registered merchants; favorite frequently-used ones |
| **Settings: caps + whitelist + auto-rotate policy** | User-configurable limits; agent honors them |
| **Export: scoped API key issuance** | Issue API keys for third-party tools to call Patron's API on the user's behalf |

---

## 8. Data model (Postgres)

```
users
  id uuid pk
  evm_address citext unique
  erc8004_agent_id bigint        # on-chain agent ID (one per user)
  session_key_address citext      # EIP-7702 session key (rotatable)
  permission_summary text         # plain-language version
  frozen boolean default false   # Emergency Freeze flag
  created_at timestamptz
  metadata jsonb

merchants
  id uuid pk
  slug citext unique             # /m/:slug
  display_name text
  description text
  evm_address citext unique      # USDC disbursement
  bond_tx_hash text              # USDC bond proof
  erc8004_agent_id bigint        # merchant's on-chain agent ID
  category text                  # 'fashion' | 'digital' | 'services'
  status text                    # 'pending' | 'active' | 'suspended'
  reputation_score numeric
  created_at timestamptz

orders
  id uuid pk
  user_id uuid fk users
  merchant_id uuid fk merchants
  amount_usdc numeric
  collateral_amount numeric
  position_id bigint
  status text                    # 'intent'|'opened'|'disbursed'|'repaid'|'liquidated'|'refunded'
  receipt_uri text               # ERC-8004 receipt
  open_tx_hash text
  repay_tx_hash text
  created_at timestamptz
  updated_at timestamptz

events
  id bigserial pk
  block_number bigint
  tx_hash text
  contract_address citext
  event_name text
  payload jsonb
  indexed_at timestamptz

agent_tasks
  id uuid pk
  user_id uuid fk users
  intent text                    # 'open' | 'repay' | 'audit' | 'verify' | 'monitor' | 'rotate' | 'dispute'
  status text                    # 'queued' | 'running' | 'done' | 'failed'
  input jsonb
  result jsonb
  agent_log_uri text             # LLM trace
  erc8004_receipt_uri text       # on-chain receipt
  created_at timestamptz
  finished_at timestamptz

api_keys
  id uuid pk
  user_id uuid fk users
  key_hash text                  # never store plaintext
  scope text                     # 'read-position' | 'open-loan' | etc.
  expires_at timestamptz
  revoked_at timestamptz
```

---

## 9. Security posture

- **Oracle:** Aave Oracle aggregator on Mantle (`0x47a063CfDa980532267970d478EC340C0F80E8df`) for sUSDe + USDC prices, per ADR-003 — no direct Chainlink sUSDe/USD feed exists on Mantle; the Aave Oracle routes internally to the "Capped sUSDe/USDT/USD" composite, which is the same source Aave's own liquidation math reads (so our health-factor checks cannot diverge from Aave's). Never internal AMM oracles — per security domain, internal-orderbook oracles caused USDe Oct 11 2025 cascade.
- **Reentrancy:** OpenZeppelin `ReentrancyGuard` on all state-changing functions
- **Access control:** OpenZeppelin `AccessControl` for admin roles
- **Pause:** Pausable by 2-of-3 multi-sig for emergency
- **Agent authorization:** EIP-7702 session keys with hard limits (spend cap, contract allowlist, time window). Every key revocable by user via Emergency Freeze.
- **Merchant Sybil resistance:** Merchants post a refundable USDC bond to register; bad merchants forfeit
- **Liquidation:** Aave V3's built-in liquidation flow; our vault is just a borrower wrapper
- **Frontend signing:** Calldata translated to plain English in confirm modals (per security domain: blind-signing was Bybit's $1.5B + WazirX's $235M root cause)
- **Agent constraints:** Per-action ceiling ($50 default, configurable up to a per-user max); explicit user confirmation for first action; rate limits
- **CI security:** Slither + Aderyn on every PR; Renovate auto-updates; daily dependency audit
- **No external audit in 13 days** — security-conscious patterns + tooling in CI substitute

---

## 10. Testing strategy

| Surface | Tooling | Target |
|---|---|---|
| Contracts | Foundry unit + fuzz + invariant | 90%+ branch coverage; invariant `collateral × LTV ≥ debt` always holds |
| Agent | Vitest + mocked `@anthropic-ai/sdk` + recorded tool-call fixtures | All 6 intents; happy + 3 failure paths each |
| API | Vitest + ephemeral Postgres + Anvil-forked Mantle | All endpoints; webhook delivery; indexer correctness |
| Web | Vitest + Playwright e2e on Chromium | Connect → browse → checkout → repay; 60%+ coverage |
| Mini | Playwright with TG WebView test mode | Same flows in TG shell |
| SDK (js + react) | Vitest unit + Playwright integration on each demo merchant | Widget loads, opens modal, posts intent, returns to merchant |
| Demo Day rehearsal | Live Mainnet dry-run on Jun 12-13 | Full end-to-end without crash; backup paths rehearsed |

---

## 11. Build phasing (Days 1-13)

| Phase | Days | Output |
|---|---|---|
| **0 — Foundation** | 1-2 | Monorepo · CI/CD with 400-LOC + Slither · all package scaffolds · ENV/secrets · branch protection |
| **1 — Smart Contracts** | 2-4 | `PatronVault` + `MerchantRegistry` + `ReputationProxy` + `AgentAuthorizer` · Foundry tests · Sepolia deploy + verify |
| **2 — Backend foundation** | 3-5 | Hono + Postgres + Drizzle · schema migrations · indexer skeleton · scheduler skeleton · agent task queue |
| **3 — Agent decision engine** | 4-7 | Claude Agent SDK in backend · 6 intent handlers · `byreal-cli` tool integration · ERC-8004 receipt logging · agent tests |
| **4 — Web App** | 5-9 | Landing (premium-ui) · agent management dashboard (with Emergency Freeze) · merchant directory · checkout flow · wagmi + RainbowKit · "Open in Telegram" CTA |
| **5 — Telegram Mini App** | 7-10 | TG shell · Privy wallet (social → EVM) · reused dashboard + checkout · TG Pay fallback |
| **6 — Checkout SDKs** | 8-11 | `@patron/sdk-js` (vanilla) · `@patron/react` (component package) · hosted modal variant · README + integration guide |
| **7 — Demo Merchants** | 10-12 | 3 storefronts (fashion / digital / services) · each deployed publicly · each registered in MerchantRegistry on testnet |
| **8 — Polish + Submit** | 12-13 | Mainnet deploy · contract verification · demo video · X thread · DoraHacks submission · live dry-run |

Phases overlap aggressively — agentic coding parallelizes streams.

---

## 12. Out of scope (deliberately)

| Excluded | Why |
|---|---|
| **OpenClaw integration** | Single-user self-hosted; doesn't fit multi-tenant SaaS; replaced by Claude Agent SDK in our backend |
| **Self-host Patron locally** | Out of scope; hosted SaaS only |
| Custom L2 / app-chain | Mantle works |
| Native iOS / Android apps | Web + Mini App covers reach |
| Built-by-us fiat off-ramp | Merchants use their own rails |
| KYC for v1 | sUSDe permissionless; agent reputation handles trust |
| External security audit | Slither + Aderyn + careful patterns substitute |
| Multi-collateral asset support | sUSDe is v1; USDY/mUSD are v2 |
| Cross-chain ERC-8004 reputation reads | THEORETICAL in 2026; v2 |
| Solana CLMM-side execution as default | `byreal-cli` is wired as optional Source-Funds path |
| ERC-8004 Validation Registry | In flux per TEE community update |

---

## 13. Track placement justification

| Track | How Patron qualifies |
|---|---|
| Track 3 — AI × RWA | sUSDe is yield-bearing T-bill-correlated stablecoin; "Real-World Validity" path |
| Track 6 — Agentic Wallets & Economy | `byreal-cli` (Byreal Agent Skills) invoked from backend agent satisfies "use ≥1 of Byreal Agent Skills / Byreal Perps CLI / RealClaw" |
| Grand Champion | Tech depth (4 contracts + agent + 2 frontends + 2 SDKs + 3 merchants) + innovation (negative-cost-of-funds BNPL) + Mantle ecosystem contribution (drives Aave + ERC-8004 volume) + product completeness |
| Best UI/UX | premium-ui components + dashboard with Emergency Freeze + plain-language permissions + ERC-8004 receipt UI |
| 20-Project Deployment Award | Mainnet verified · frontend public · AI-callable on-chain function · ≥2 min demo video · README with addresses |

---

## 14. Submission checklist (Day 13)

- [ ] Public GitHub repo with MIT license
- [ ] README with setup + architecture + deployed contract addresses
- [ ] Smart contracts deployed Mantle Mainnet + verified on `mantlescan.xyz`
- [ ] ≥1 AI-callable on-chain function (`PatronVault.openLoan` triggered from agent task)
- [ ] Frontend publicly accessible
- [ ] Demo video ≥ 2 min, ≤ 5 min — screencast with audio narration
- [ ] X thread tagged `#MantleAIHackathon` (pitch + demo + repo + addresses)
- [ ] DoraHacks submission filed with all deployment addresses
- [ ] `byreal-cli` integration demonstrated in agent's tool calls (Track 6 qualification)
- [ ] Track 3 + Track 6 nominations selected
- [ ] Architecture diagram visual asset
- [ ] Accuracy report (self-assessment)

---

## 15. Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Yield-spread compression / inversion (today: ~+50 bps, down from ~+700 bps early 2026) | **Medium-high (already realized)** | Pre-flight rate-spread check before each new position via Aave Oracle + `getReserveData`; user-configurable minimum spread (default 0 bps); agent refuses new positions if spread fails check, existing positions mature naturally; demo copy reframes as "cost-of-credit floor" rather than "yield carry"; consider Merkl-loop strategy in v1.1 for +1.96pp on sUSDe leg |
| sUSDe depeg event during demo week | Low-medium | Agent monitors Aave Oracle (Capped sUSDe/USDT/USD composite per ADR-003) + on-chain liquidity; auto-pauses new positions on signal trip |
| TG Mini App + EVM wallet integration issues | Medium | Privy is well-trodden in TG WebView; fallback to "Open in browser" deep-link if integration fails |
| LLM hallucinated transactions | High | Tool calls return structured output; first-action + > $50 confirmation required; ERC-8004 audit trail; Emergency Freeze recoverable |
| Live demo crash on Demo Day | Low | Mainnet deploy on Day 12; dry-run Day 13; backup video; graceful degradation |
| Orbit Finance ships competing v1 before us | Low-medium | Orbit's RWA integrations are scaffolding; we differentiate on ERC-8004 receipts + multi-merchant SDK + Emergency Freeze |
| Aave Mantle liquidation cascade | Low | Aave circuit breakers + Mantle gas keep cascades small; positions individually small |
| EIP-7702 session key complexity slips schedule | Medium | Start with scoped API keys for v1; EIP-7702 for v2 if time allows. Either way, Emergency Freeze concept works. |

---

*End of design v2. Next: `sahil-spec-writer` produces formal artifacts (PRD, architecture, ux-spec, epics, stories).*
