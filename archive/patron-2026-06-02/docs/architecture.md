# Patron — Architecture

**Status:** Locked. Every story's file modification map derives from this document. No story may introduce a stack choice not listed here without an ADR amendment.

---

## Stack (exact versions)

| Layer | Choice | Version |
|---|---|---|
| Language (TS) | TypeScript | 5.6+ |
| Runtime (TS) | Node | 22 LTS |
| Language (Solidity) | Solidity | 0.8.26+ |
| Build (Solidity) | Foundry (forge, cast, anvil) | latest stable |
| Frontend framework | Next.js | 15 (App Router, React Server Components) |
| CSS | Tailwind | v4 |
| Component lib base | shadcn/ui | latest |
| Premium components | 21st.dev + Aceternity + Magic UI (via `premium-ui` skill) | latest |
| EVM client | viem | 2.x |
| Wallet (web) | wagmi v2 + RainbowKit | latest |
| Wallet (Mini App) | Privy (social/email → embedded EVM) | latest SDK |
| Backend framework | Hono | 4.x |
| Database | PostgreSQL | 16 (via Neon serverless) |
| ORM | Drizzle | latest |
| LLM client | `@anthropic-ai/sdk` (Claude Agent SDK) | latest |
| LLM model | `claude-opus-4-7` for agent decisions; `claude-sonnet-4-6` for batch / lower-stakes | — |
| Scheduler | BullMQ on Redis (Upstash serverless) | latest |
| Indexer | Custom Hono service + viem event logs | — |
| External CLI tool | `@byreal-io/byreal-cli` (Byreal Agent Skills) | latest |
| Tests (Solidity) | Foundry (unit + fuzz + invariant) | latest |
| Tests (TS) | Vitest | latest |
| Tests (e2e) | Playwright | latest |
| Lint + format | Biome | latest |
| Pre-commit | Husky + lint-staged | latest |
| Monorepo | pnpm workspaces + Turborepo | latest |
| CI | GitHub Actions | — |
| Security scanners | Slither + Aderyn | latest |
| Hosting (frontends) | Vercel | — |
| Hosting (backend) | Railway | — |
| Versioning (SDKs) | Changesets | latest |

---

## Key libraries (use these — do not reinvent)

### Contracts
- **OpenZeppelin Contracts** — `ReentrancyGuard`, `AccessControl`, `Pausable`, `ERC721`, `SafeERC20`. Don't roll our own.
- **Aave V3 Periphery** — `IPool`, `IPoolAddressesProvider`. Borrow + repay against Aave Mantle pool.
- **Aave V3 `IAaveOracle`** — for sUSDe + USDC price feeds (per ADR-003: no direct Chainlink sUSDe/USD exists on Mantle; we read through Aave Oracle so our health math aligns with Aave's liquidation triggers; never internal AMM oracles)
- **viem + Foundry remappings** — `forge install` style; ABI bindings exported to `packages/shared/abi/`

### Backend
- **Hono** — routing, middleware, OpenAPI generation
- **Drizzle ORM** — schema definition + type-safe queries + migrations
- **Zod** — request validation + type inference
- **BullMQ** — durable job queue on Redis
- **viem 2.x** — chain reads/writes; do NOT use ethers; viem is the 2026 default
- **`@anthropic-ai/sdk` Agent SDK** — agent decision loop with tool use; use streaming for long-running decisions
- **Pino** — structured logging
- **Sentry** — error tracking in production
- **Privy server SDK** — server-side EVM wallet operations for users onboarded via Privy

### Frontend
- **shadcn/ui** — base components; install via `npx shadcn add <comp>`
- **`premium-ui` skill** — for hero / footer / pricing / merchant directory landing components
- **wagmi v2 + RainbowKit** (web) — wallet connection, signature, transactions
- **Privy SDK** (mini) — embedded wallet inside TG WebView
- **Telegram WebApp SDK** (`@twa-dev/sdk`) — TG Mini App hooks (back button, main button, theme)
- **TanStack Query** — server state cache + revalidation
- **Recharts** — for yield-vs-interest tickers, paydown progress charts
- **Sonner** — toast notifications
- **Lucide React** — icons

### Test infra
- **Foundry forge-std** — `Test.t.sol`, `console2.sol`, cheatcodes
- **Vitest** — TS unit + integration; use `@vitest/coverage-v8` for coverage
- **Playwright** — `@playwright/test`; TG WebView via `--browser=chromium --headless=false` in test mode
- **MSW** — mock external HTTP APIs (Nansen, Allora) in tests; do NOT mock our own contracts. On-chain price reads (Aave Oracle, per ADR-003) are not HTTP and don't need MSW — they're mocked at the viem layer via recorded RPC fixtures or `createTestClient` against Anvil.

---

## Architecture Decision Records (ADRs)

### ADR-001 — Claude Agent SDK instead of OpenClaw
**Status:** Accepted
**Context:** Initially considered OpenClaw as the agent runtime. After verifying via OpenClaw's README, OpenClaw is a **single-user, self-hosted personal assistant** designed for one user running it on their own device, not a multi-tenant SaaS backend.
**Decision:** Use `@anthropic-ai/sdk` Claude Agent SDK directly in our Hono backend as the decision engine. Each user's agent state is in our Postgres (one ERC-8004 Identity NFT per user); agent decisions are made by stateless Claude Agent SDK calls with the user's state passed in as context.
**Consequences:** Simpler stack, one always-on service to maintain. Loses "OpenClaw Skill" portability for advanced users; agent portability instead handled via scoped API keys (v1) and EIP-7702 session keys (v1/v2).

### ADR-002 — sUSDe as v1 collateral (via Aave stablecoin E-Mode, category 1)
**Status:** Accepted (rates re-verified 2026-06-03 via AUDIT-1)
**Context:** Original concept used USDY; feasibility gate revealed USDY is NOT listed as collateral on Aave Mantle (INIT Capital's USDY pool holds 102.7 USDY ≈ $116, operationally dormant). sUSDe IS listed on Aave Mantle. **CRITICAL:** sUSDe LTV in general mode = 0; the only borrow path is **Aave stablecoin E-Mode (category 1, LTV 90 / LT 92 / Bonus 4)**. `PatronVault` MUST call `pool.setUserEMode(1)` after the first sUSDe deposit per user account or borrow will silently fail with `0` borrowing power.
**Current rates (re-verified 2026-06-03 via RPC + DefiLlama, post-AUDIT-1 re-check):** sUSDe Ethena native APY ≈ 3.8% 7d-avg / 3.9% 30d-avg (DefiLlama pool `66985a81-…`; was ~9% earlier in 2026, ~5% per AUDIT-1 a few hours ago — funding rate is compressing fast); USDC raw borrow APR ≈ 3.51% via `getReserveData(USDC).currentVariableBorrowRate` on Aave Mantle Pool (Merkl 1.29pp borrow rebate that gave "2.17% net" has expired). **Net carry at max E-Mode LTV (90%) ≈ +0.5pp; structurally non-negative but compressed.** Optional Merkl supply-loop on Aave Mantle would add ~+1.96pp to sUSDe leg (effective ~5.7%), restoring +2pp spread — not in v1 spec. Rate-spread monitor + per-position pre-flight check required (per story-11 + story-48); positions decline if user-set minimum spread (default 0 bps) is not met.
**Decision:** v1 collateral = sUSDe, gated by E-Mode 1. v2 adds USDY once an Aave AIP lists it. If raw spread inverts (USDC borrow > sUSDe yield), agent refuses new positions and notifies user; existing positions mature.
**Consequences:** Inherits USDe depeg risk (Oct 11 2025 incident); mitigation via Aave Oracle composite + depeg monitor + Emergency Freeze. **Story-22 (NEW) covers E-Mode setup.**

### ADR-003 — Aave Oracle composite for sUSDe pricing (NOT direct Chainlink)
**Status:** Accepted (revised 2026-06-03 via AUDIT-1)
**Context:** Per security domain research, internal-orderbook / AMM-pool oracles caused the USDe Oct 11 2025 cascade on Binance ($8.3B outflow). Aave was insulated because it hardcoded USDe at $1. **Initial ADR specified direct Chainlink AggregatorV3; AUDIT-1 verified NO direct Chainlink sUSDe/USD feed exists on Mantle.** Aave Mantle uses a custom "Capped sUSDe/USDT/USD" composite oracle at `0x8b47EC48ac560793861D94A997d020872c1cE3f5` for its own liquidation math.
**Decision:** Route `PatronVault` health checks through the **Aave Oracle aggregator (`0x47a063CfDa980532267970d478EC340C0F80E8df`)** so our oracle reads align with Aave's liquidation triggers (cannot get liquidated by Aave on a price our contract didn't see). USDC peg hardcoded at $1 (matches Aave behavior). Do NOT trust spot AMM prices.
**Consequences:** No additional Chainlink subscription needed; oracle drift between us and Aave = 0; same data, same staleness window. Trade-off: we inherit Aave Oracle's capped behavior (sUSDe valued via USDT proxy under stress).

### ADR-004 — EIP-7702 session keys for agent authorization
**Status:** Accepted (v1 may fall back to scoped API keys if EIP-7702 ergonomics slip schedule)
**Context:** Per portability research, EIP-7702 + RFC 8693 token exchange is the 2026 consensus stack for agent authorization. Scoped on-chain delegation with spend caps + contract allowlists + time windows.
**Decision:** AgentAuthorizer.sol issues EIP-7702 session keys per user; user can revoke via Emergency Freeze. If EIP-7702 integration burns too much time, fall back to a simpler scoped-API-key model for v1 and ship EIP-7702 in v2.
**Consequences:** Real session-key UX is one of Patron's product moats. Cutting it down to API keys weakens the pitch.

### ADR-005 — `byreal-cli` invoked as bash tool from Claude Agent SDK
**Status:** Accepted
**Context:** Track 6 requires using ≥1 of Byreal Agent Skills / Byreal Perps CLI / RealClaw. `@byreal-io/byreal-cli` is a standalone npm package that can be invoked from anywhere — does NOT require OpenClaw runtime.
**Decision:** Install `@byreal-io/byreal-cli` globally in the backend container; expose as a bash tool call in the Claude Agent SDK tool list; agent uses it for optional Source-Funds-from-Solana flows.
**Consequences:** Track 6 satisfied; no OpenClaw runtime needed; Source-Funds path is a real (not forced) integration since some users may hold USDC on Solana.

### ADR-006 — Monorepo with pnpm workspaces + Turborepo
**Status:** Accepted
**Context:** Multiple packages (web, mini, api, contracts, 2 SDKs, shared, ui, 3 demo merchants) share types, ABI bindings, and CI.
**Decision:** Single GitHub monorepo. pnpm workspaces for dependency management. Turborepo for parallelized build + cache.
**Consequences:** Single CI pipeline, single 400-LOC enforcement, easier cross-package refactors.

### ADR-007 — Biome with `noExcessiveLinesPerFile` as primary 400-LOC enforcement
**Status:** Accepted (re-revised 2026-06-03 after AUDIT-2 self-correction — AUDIT-2 wrongly claimed Biome has no max-lines rule; spot-check found `noExcessiveLinesPerFile` in `nursery` namespace + `noExcessiveLinesPerFunction` in `complexity` namespace)
**Context:** Need lint + format + 400-LOC enforcement. Biome v2.4+ ships:
- `lint/nursery/noExcessiveLinesPerFile` — accepts `maxLines` config, exactly the per-file budget we want (currently in nursery = experimental but stable enough for hackathon use)
- `lint/complexity/noExcessiveLinesPerFunction` — per-function limit (default 50, can raise)
**Decision:** Use Biome as the single quality tool: lint + format + `noExcessiveLinesPerFile: { maxLines: 400 }` for per-file budget + `noExcessiveLinesPerFunction: { maxLines: 50 }` for function-level. Generated files excluded via `biome.json` `files.ignore`. **`scripts/check-file-loc.mjs` is a defense-in-depth secondary check** (used only as a fast pre-commit guard before Biome loads — Biome's rule is the authority in CI).
**Consequences:** Single tool. Nursery rule = small risk of API change; pin Biome to a specific minor version in `package.json` to protect against. Lose some ESLint plugins (e.g., specific React rules); fall back to ESLint for those rules only if needed.
**Audit lesson logged:** [[feedback-audits-can-be-wrong]] — AUDIT-2 missed the `nursery` namespace because it only checked `style/` rules. Don't blind-trust audit findings.

### ADR-008 — Privy in Mini App, wagmi+RainbowKit in web
**Status:** Accepted
**Context:** wagmi struggles inside Telegram WebView (WalletConnect dialog issues, deep-linking unreliable). Privy ships an embedded EVM wallet via social/email login that works inside TG WebView.
**Decision:** Web app uses wagmi v2 + RainbowKit for full WalletConnect / RainbowKit / etc. flow. Mini App uses Privy for instant embedded wallet (social/email → EVM). Privy can also expose Server SDK to back-end for the agent's signing operations.
**Consequences:** Two wallet stacks to learn; but each is the right fit for its surface.

### ADR-009 — Postgres on Neon (not Supabase, not RDS)
**Status:** Accepted
**Context:** Need serverless Postgres with branching for testing (per-PR test DBs).
**Decision:** Neon. Branching = ephemeral test databases on every CI run.
**Consequences:** Vendor lock-in lite; trivially portable to standard Postgres if needed.

### ADR-010 — Mantle Mainnet + Sepolia, no other chains in v1
**Status:** Accepted
**Context:** Hackathon scope. Cross-chain agent reputation is theoretical in 2026.
**Decision:** Deploy to Mantle Sepolia (5003) for testing; Mainnet (5000) for the live demo. No Base / Arbitrum / Ethereum mainnet deployments in v1.
**Consequences:** Demo live on Mantle Mainnet; portable agent identity claim is supported by ERC-8004 canonical CREATE2 addresses being present on 25+ chains, but we don't actively claim cross-chain reputation reads in v1.

### ADR-011 — Hono backend as separate service (not Next.js API routes)
**Status:** Accepted (added 2026-06-03 via AUDIT-4 — peer convention is Next.js API routes; we diverge)
**Context:** AUDIT-4 surveyed 2026 Patron-adjacent repos and found Next.js API routes is the modal pattern. Hono is divergent and adds operational complexity (separate Railway service, not just a Vercel deploy).
**Decision:** Keep Hono. Three reasons: (1) BullMQ workers + scheduler need a long-lived Node process — incompatible with Vercel's serverless function model. (2) OpenAPI spec generation (`@hono/zod-openapi`) is consumed by our SDKs; Next.js API routes have no equivalent first-class story. (3) Hono runs on both Node + Cloudflare Workers, so we can migrate hot endpoints to edge if needed without rewriting handlers.
**Consequences:** Operate two deploy targets (Vercel for web/mini + Railway for api). Solo dev overhead is non-trivial; if it becomes painful, the migration path is "move handlers into Next.js Route Handlers, keep scheduler/worker on Railway" — manageable, not a rewrite.

### ADR-012 — `@anthropic-ai/sdk` direct (not Vercel `ai` SDK abstraction)
**Status:** Accepted (added 2026-06-03 via AUDIT-4 — peer convention is `ai` SDK; we diverge)
**Context:** AUDIT-4 found the 2026 emerging consensus is Vercel `ai` SDK for provider-agnostic LLM calls. `AgentlyHQ/aixyz` (81 ⭐ canonical agent framework) uses `ai` SDK + Express + Bun. Patron uses `@anthropic-ai/sdk` directly.
**Decision:** Use `@anthropic-ai/sdk` direct. Reasons: (1) hackathon is Claude-first per sponsor track (Anthropic-adjacent narrative); abstraction layer adds zero value when we won't switch providers in 13 days. (2) Tool-use API + prompt caching are exposed more cleanly in the official SDK than in the `ai` SDK abstraction. (3) Claude Agent SDK examples + Anthropic docs assume the direct SDK.
**Consequences:** Provider lock-in. If we wanted to A/B-test Claude vs GPT-5 later, we'd need a small abstraction layer — acceptable for v1.

---

## Repo structure

```
patron/
├── apps/
│   ├── web/                    # Next.js 15 — landing + dashboard + merchant dir + checkout
│   │   ├── app/
│   │   ├── components/         # web-specific components (uses packages/ui)
│   │   ├── lib/
│   │   ├── public/
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   └── tailwind.config.ts
│   ├── mini/                   # Next.js 15 — Telegram Mini App
│   │   ├── app/
│   │   ├── components/         # mini-specific (uses packages/ui)
│   │   ├── lib/
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   └── tailwind.config.ts
│   ├── api/                    # Hono — API + agent decision engine + scheduler + indexer
│   │   ├── src/
│   │   │   ├── routes/         # API endpoints
│   │   │   ├── agent/          # Claude Agent SDK + intent handlers
│   │   │   ├── scheduler/      # BullMQ jobs
│   │   │   ├── indexer/        # viem event polling
│   │   │   ├── db/             # Drizzle schema + migrations
│   │   │   └── lib/            # utilities
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── docs/                   # Nextra — merchant SDK docs site
├── packages/
│   ├── contracts/              # Foundry
│   │   ├── src/
│   │   │   ├── PatronVault.sol
│   │   │   ├── MerchantRegistry.sol
│   │   │   ├── ReputationProxy.sol
│   │   │   └── AgentAuthorizer.sol
│   │   ├── test/
│   │   │   ├── unit/
│   │   │   ├── fuzz/
│   │   │   └── invariant/
│   │   ├── script/             # deployment scripts
│   │   ├── foundry.toml
│   │   └── remappings.txt
│   ├── sdk-js/                 # @patron/sdk-js — vanilla checkout widget
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── sdk-react/              # @patron/react — React component package
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── shared/                 # types, ABI bindings, contract addresses, utils
│   │   ├── src/
│   │   │   ├── abi/            # generated from contracts on every CI
│   │   │   ├── addresses.ts    # mantle mainnet + sepolia addresses
│   │   │   ├── types/
│   │   │   └── lib/
│   │   └── package.json
│   └── ui/                     # shared React components (used by web + mini)
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
├── demo-merchants/
│   ├── threads-by-mara/        # Next.js fashion storefront
│   ├── pixelink/               # Next.js digital goods storefront
│   └── dialer-pro/             # Next.js services storefront
├── .github/
│   ├── workflows/
│   │   ├── ci.yml              # lint + typecheck + test + 400-LOC + slither + aderyn + build
│   │   ├── deploy-preview.yml  # Vercel preview + Railway preview + Sepolia deploy
│   │   ├── deploy-prod.yml     # Mantle Mainnet deploy + Vercel prod + Railway prod
│   │   └── security.yml        # daily Slither + Aderyn + pnpm audit
│   └── pull_request_template.md
├── .changeset/
├── package.json                # pnpm workspaces root
├── pnpm-workspace.yaml
├── turbo.json
├── biome.json                  # max-lines: 400 + lint + format rules
├── tsconfig.base.json          # shared TS config
├── README.md
└── LICENSE                     # MIT
```

---

## Context7 library research rule (MANDATORY)

Before writing any code that uses a library, framework, SDK, or external API, **the coding agent MUST query Context7** for that library's current docs:

```
mcp__plugin_context7_context7__resolve-library-id libraryName="<name>"
mcp__plugin_context7_context7__query-docs context7CompatibleLibraryID="<id>" topic="<specific area>" tokens=8000
```

Required for: viem, wagmi, RainbowKit, Privy, Hono, Drizzle, Anthropic SDK, BullMQ, Foundry, Aave V3 Periphery + IAaveOracle, OpenZeppelin, Next.js 15 App Router, Tailwind v4, Telegram WebApp SDK, byreal-cli.

If Context7 doesn't have the library, fall back to the official docs URL — DO NOT guess API surface from training data. Training-data hallucinations are the #1 source of broken code in agentic dev.

---

## Banned patterns

These will fail PR review:

- ❌ **No mocks in the hot path.** Agent decision engine talks to real contracts on testnet/Anvil-fork, not mocks. Mocks allowed only in unit tests.
- ❌ **No default gradients** in landing UI (`from-blue-500 to-purple-500` etc.). Use `premium-ui` registry components.
- ❌ **No Inter-only** font stack. Use a paired serif + sans system (e.g., Fraunces + Inter, or system specific). See `ux-spec.md`.
- ❌ **No `any` types** in TypeScript. Use `unknown` + type narrowing, or `zod` schemas.
- ❌ **No `console.log` in production code paths.** Use Pino on backend; use a logger wrapper on frontend.
- ❌ **No `ethers` v5/v6.** viem only.
- ❌ **No bare HTTP calls to the Anthropic API.** Use the official `@anthropic-ai/sdk`.
- ❌ **No hardcoded contract addresses outside `packages/shared/addresses.ts`.** Always import.
- ❌ **No copy-paste from chat or LLM completions for library APIs** — verify via Context7 or official docs first.
- ❌ **No silent error swallowing.** Every catch block either rethrows, logs structured error, or returns explicit error result.
- ❌ **No `prompt(`, `confirm(`, `alert(`** in production code paths. Use proper modal components.
- ❌ **No skipping CI checks** (`--no-verify`, `[skip ci]`) unless explicitly approved.
- ❌ **No `git push --force`** to `main`.
- ❌ **No 0x000000 placeholder addresses** committed to README or env.example.
- ❌ **No file > 400 lines** (Biome enforces; CI fails).

---

## Mantle-specific details

- **Mainnet chain ID:** 5000 · **RPC:** `https://rpc.mantle.xyz` · **Explorer:** `mantlescan.xyz`
- **Sepolia chain ID:** 5003 · **RPC:** `https://rpc.sepolia.mantle.xyz` · **Explorer:** `sepolia.mantlescan.xyz`
- **Gas token:** $MNT (native, 18 decimals)
- **Aave V3 Mantle Pool:** `0x458F293454fE0d67EC0655f3672301301DD51422`
- **sUSDe (Mantle):** `0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2`
- **USDC (Mantle):** `0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9`
- **ERC-8004 Identity Registry (Mantle Mainnet):** `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- **ERC-8004 Reputation Registry (Mantle Mainnet):** `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`
- **Aave Oracle aggregator (Mantle Mainnet):** `0x47a063CfDa980532267970d478EC340C0F80E8df` — per ADR-003, our health checks route through this
- **Aave sUSDe composite oracle (Mantle Mainnet):** `0x8b47EC48ac560793861D94A997d020872c1cE3f5` — Capped sUSDe/USDT/USD price source
- **Aave E-Mode category for sUSDe collateral:** **1** (stablecoin E-Mode); LTV 90 / LT 92 / Bonus 4. `PatronVault` MUST call `pool.setUserEMode(1)` per user after first deposit — see ADR-002 + story-22.
- **Identity Registry (Sepolia):** `0x8004A818BFB912233c491871b3d84c89A494BD9e`
- **Reputation Registry (Sepolia):** `0x8004B663056A597Dffe9eCcC1965A193B7388713`
- **Sepolia faucet:** `https://faucets.chain.link/mantle-sepolia`

Deployed Patron contract addresses (filled by Phase 1):

| Contract | Sepolia | Mainnet |
|---|---|---|
| PatronVault | `0x...` | `0x...` |
| MerchantRegistry | `0x...` | `0x...` |
| ReputationProxy | `0x...` | `0x...` |
| AgentAuthorizer | `0x...` | `0x...` |
