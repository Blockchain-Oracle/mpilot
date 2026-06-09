# Patron — Epics

**Reading order:** epics ship in dependency order. The orchestrator should create issues for Epic 0's stories first, gate Epics 1-3 on Epic 0 green CI, then parallelize 4-7 against the contract + agent foundation.

Each epic lists its stories; full story files live in `docs/stories/story-<slug>.md`. The story files are what the orchestrator pastes into GitHub issues (BDD criteria + file modification map + shell verification).

---

## Epic 0 — Foundation: CI/CD + monorepo + 400-LOC enforcement

**Business value:** Nothing else can ship without this. CI catches regressions, 400-LOC keeps files reviewable by agentic coders, Slither + Aderyn catch contract security issues before they reach Mainnet, branch protection prevents accidental main pushes.

**Depends on:** None. This is Story #1 per Abu's explicit direction.

**Stories (all ≤ 2h):**
- `story-00-monorepo-scaffold` — pnpm workspaces + Turborepo + package shells for all 6 packages and 3 demo merchants
- `story-01-biome-and-loc-enforcement` — Biome config with `max-lines: 400` + Husky pre-commit hook
- `story-02-typescript-config` — `tsconfig.base.json` + per-package extends + path aliases
- `story-03-github-actions-ci` — `ci.yml` (lint + typecheck + Vitest + build) running on every PR
- `story-04-foundry-init-and-ci` — Foundry init + Forge test + Slither + Aderyn in CI
- `story-05-branch-protection-and-pr-template` — `gh` CLI to set branch protection on `main` + PR template
- `story-06-env-and-secrets-setup` — `.env.example` for all packages + Vercel/Railway env wiring + secrets docs

**Estimated total:** 7 stories × ~1.5h avg = ~10.5h (Days 1-2 with parallel agentic coding).

---

## Epic 1 — Smart Contracts

**Business value:** The on-chain rails. Without these, there is no Patron — the agent has nothing to call.

**Depends on:** Epic 0 (CI must be green; Foundry must be initialized).

**Stories (all ≤ 2h):**
- `story-10-patron-vault-base` — `PatronVault.sol` skeleton with `openLoan` + `repay` + access control + ReentrancyGuard
- `story-11-patron-vault-aave-integration` — Aave V3 borrow + repay flow wired up + Aave Oracle aggregator wrapper (per ADR-003; no direct Chainlink sUSDe/USD on Mantle)
- `story-12-patron-vault-tests-unit` — Foundry unit tests for happy paths
- `story-13-patron-vault-tests-fuzz` — Foundry fuzz tests for input ranges (amount, slippage, prices)
- `story-14-patron-vault-tests-invariant` — Foundry invariant test: `collateral × LTV ≥ debt` always
- `story-15-merchant-registry` — `MerchantRegistry.sol` (register + USDC bond + suspend + reputation read)
- `story-16-merchant-registry-tests` — Foundry tests + fuzz on bond economics
- `story-17-reputation-proxy` — `ReputationProxy.sol` wrapping ERC-8004 Reputation Registry calls
- `story-18-reputation-proxy-tests` — Foundry tests against ERC-8004 mocks
- `story-19-agent-authorizer-v1` — `AgentAuthorizer.sol` initial version (scoped API key model; EIP-7702 in v2 story)
- `story-20-agent-authorizer-tests` — Foundry tests for issuance, revocation, scope enforcement
- `story-21-sepolia-deployment` — Foundry script + deploy to Mantle Sepolia + verify on Mantlescan + write addresses to `packages/shared/addresses.ts`

**Estimated total:** 12 stories × ~1.5h avg = ~18h (Days 2-4).

---

## Epic 2 — Backend Foundation

**Business value:** Multi-tenant SaaS spine. Stores all user/merchant/order state, exposes API endpoints, indexes on-chain events.

**Depends on:** Epic 0 (CI). Epic 1's `addresses.ts` exports are consumed (loose coupling).

**Stories (all ≤ 2h):**
- `story-30-hono-skeleton` — Hono app boots; health endpoint; structured logging via Pino
- `story-31-postgres-and-drizzle-init` — Neon connection + Drizzle config + first migration
- `story-32-db-schema-users-merchants-orders` — Drizzle schema for users, merchants, orders tables
- `story-33-db-schema-events-tasks-keys` — Drizzle schema for events, agent_tasks, api_keys tables
- `story-34-merchant-onboarding-endpoints` — `POST /merchants` (with bond verification) + `GET /merchants/:slug`
- `story-35-user-profile-endpoints` — `POST /users` (on first connect) + `GET /users/me`
- `story-36-order-intent-endpoint` — `POST /orders/intent` (called by SDK when user clicks Pay with Patron)
- `story-37-merchant-webhook-handler` — `POST /webhooks/merchant` (settle + refund events from merchants)
- `story-38-onchain-indexer-skeleton` — viem event polling for PatronVault + MerchantRegistry; writes to events table
- `story-39-scheduler-skeleton` — BullMQ + Redis (Upstash) setup; one no-op cron job runs and is observable

**Estimated total:** 10 stories × ~1.5h avg = ~15h (Days 3-5).

---

## Epic 3 — Agent Decision Engine

**Business value:** The agent's actual brain. Without this, Patron is a contract + UI; with this, it's an agentic product.

**Depends on:** Epic 1 (contracts deployed) + Epic 2 (DB + scheduler + indexer).

**Stories (all ≤ 2h):**
- `story-40-claude-agent-sdk-bootstrap` — `@anthropic-ai/sdk` setup, model config (Opus 4.7 for decisions, Sonnet 4.6 for batch), tool-call infra
- `story-41-agent-context-loader` — load per-user state (positions, reputation, merchant whitelist, frozen status) into the agent's context window
- `story-42-tool-onchain-reads` — viem-based read tools (`getPosition`, `getMerchantReputation`, `getHealthFactor`, `getOraclePrices`)
- `story-43-tool-onchain-writes` — viem-based write tools (`openLoan`, `repayLoan`, `rotatePosition`) using the user's agent session key
- `story-44-tool-external-apis` — Nansen, Allora, sanction-screen tool wrappers + MSW mocks for tests (Chainlink wrapper removed per ADR-003 — no direct Chainlink sUSDe/USD feed exists on Mantle; on-chain prices come from Aave Oracle via story-42's `getOraclePrices`)
- `story-45-tool-byreal-cli` — `child_process` wrapper for `byreal-cli` invocations (Track 6 qualification)
- `story-46-intent-open-position` — `OpenPosition` handler: full decision flow (merchant trust → health check → rate check → execute or decline)
- `story-47-intent-repay-position` — `RepayPosition` handler: triggered by scheduler, computes optimal moment, executes
- `story-48-intent-monitor-depeg` — `MonitorDepeg` scheduled handler: 60s cadence, checks signals, rotates if threshold tripped
- `story-49-intent-verify-merchant` — `VerifyMerchant` handler: reputation + bond + sanction + on-chain history
- `story-50-intent-personalize-limits` — `PersonalizeLimits` weekly batch
- `story-51-intent-handle-dispute` — `HandleDispute` handler: evidence collection + ERC-8004 attestation
- `story-52-erc8004-receipt-logging` — every decision writes a structured ERC-8004 reputation entry; receipt URI returned to caller
- `story-53-agent-test-fixtures` — recorded tool-call fixtures for Vitest; covers happy + 3 failure paths per intent

**Estimated total:** 14 stories × ~1.5h avg = ~21h (Days 4-7).

---

## Epic 4 — Web App

**Business value:** Primary user surface. Where users discover Patron, manage their agent, and complete checkouts.

**Depends on:** Epic 2 (API endpoints) + Epic 3 (agent decisions exposed via endpoints).

**Stories (all ≤ 2h):**
- `story-60-nextjs-15-scaffold` — App Router + TypeScript + Tailwind v4 + Biome integration
- `story-61-design-tokens-and-fonts` — Fraunces + Inter; CSS variables; Tailwind config
- `story-62-shared-ui-package-bootstrap` — `packages/ui` with first 3 components (Button, Card, Modal)
- `story-63-landing-hero` — premium-ui hero from 21st.dev registry (or build from anchor)
- `story-64-landing-how-it-works` — 3-step explainer with yield-vs-loan math visualization
- `story-65-landing-merchant-logos` — logos of demo merchants + CTA "Browse merchants"
- `story-66-landing-cta-and-footer` — final CTA "Connect wallet" + "Open in Telegram" + footer
- `story-67-wagmi-rainbowkit-connect` — wallet connect at `/connect`; Mantle Mainnet + Sepolia configured
- `story-68-dashboard-shell` — `/app` layout: sidenav + main content + agent status indicator in top bar
- `story-69-dashboard-positions-list` — `<PositionCard>` for each open position; live yield ticker; paydown progress chart
- `story-70-dashboard-activity-feed` — `<ActivityFeed>` with sub-agent tree expansion (Devin-style)
- `story-71-dashboard-emergency-freeze` — Big red `<EmergencyFreezeButton>` with confirm modal + revoke flow
- `story-72-dashboard-permission-summary` — `<PermissionSummary>` rendering session-key bytecode as plain English
- `story-73-agent-management-page` — `/app/agent`: reputation score + history + settings + export
- `story-74-merchant-directory-page` — `/app/merchants` browse + search + favorite
- `story-75-merchant-public-page` — `/m/:slug` public merchant view with reputation + items
- `story-76-checkout-flow-page` — `/checkout/:orderId` modal-style flow (yield math + confirm)
- `story-77-audit-receipt-viewer` — `/audit/:txHash` public ERC-8004 receipt page
- `story-78-api-keys-page` — `/api-keys` issue + revoke scoped keys
- `story-79-open-in-telegram-cta` — deep link from web → Mini App

**Estimated total:** 20 stories × ~1.5h avg = ~30h (Days 5-9).

---

## Epic 5 — Telegram Mini App

**Business value:** Second primary surface — APAC reach + consumer angle + Best UI/UX prize edge.

**Depends on:** Epic 4 (shared UI components reused) + Epic 2 (API).

**Stories (all ≤ 2h):**
- `story-80-mini-nextjs-scaffold` — Next.js 15 separate app; reuses `packages/ui`
- `story-81-tg-webapp-sdk-integration` — `@twa-dev/sdk`: BackButton, MainButton, theme, viewport
- `story-82-privy-embedded-wallet` — Privy SDK with social/email → EVM wallet in TG WebView
- `story-83-mini-onboarding` — first-time `/onboarding` flow with Privy
- `story-84-mini-dashboard` — adapted from web dashboard (smaller surface, same components)
- `story-85-mini-agent-management` — adapted `/agent` view
- `story-86-mini-merchant-directory` — adapted directory + checkout
- `story-87-mini-checkout-flow` — checkout adapted for TG `MainButton`
- `story-88-deep-link-handling` — `/checkout/:orderId` opens from web "Open in Telegram" CTA

**Estimated total:** 9 stories × ~1.5h avg = ~13.5h (Days 7-10).

---

## Epic 6 — Checkout SDKs

**Business value:** Distribution. Merchants embed Patron with one line; no merchant-side wallet plumbing.

**Depends on:** Epic 2 (`/orders/intent` API endpoint).

**Stories (all ≤ 2h):**
- `story-90-sdk-js-scaffold` — `@patron/sdk-js` package skeleton; tsup build; ESM + CJS outputs
- `story-91-sdk-js-button-component` — `<script src=…>` injects a button anywhere on the page
- `story-92-sdk-js-modal-pattern` — hosted checkout modal (iframe pointing to our `/checkout/:orderId`)
- `story-93-sdk-js-event-callbacks` — `onIntent`, `onSuccess`, `onError`, `onCancel` callbacks
- `story-94-sdk-react-scaffold` — `@patron/react` package skeleton
- `story-95-sdk-react-patron-button` — `<PatronButton />` React component
- `story-96-sdk-react-hooks` — `usePatronCheckout()` hook for headless usage
- `story-97-sdk-docs-site` — `apps/docs` Nextra site with quickstart + API reference + live examples
- `story-98-changesets-publish-pipeline` — Changesets + GitHub Action to publish `@patron/sdk-js` + `@patron/react` to npm on release

**Estimated total:** 9 stories × ~1.5h avg = ~13.5h (Days 8-11).

---

## Epic 7 — Demo Merchants

**Business value:** The demo is only as good as the storefronts that showcase it. Three different verticals show Patron is general-purpose.

**Depends on:** Epic 6 (SDKs available) + Epic 1 (MerchantRegistry deployed) + Epic 2 (merchant onboarding endpoint).

**Stories (all ≤ 2h):**
- `story-100-threads-by-mara-storefront` — Fashion: Next.js minimal + product grid + product detail with `<PatronButton>`
- `story-101-pixelink-storefront` — Digital goods: Next.js minimal + license-key delivery on payment
- `story-102-dialer-pro-storefront` — Services: Next.js minimal + service booking calendar with `<PatronButton>`
- `story-103-merchant-onboarding-via-cli` — script to register each demo merchant via MerchantRegistry + post USDC bond + persist to DB
- `story-104-demo-merchant-deploys` — Vercel deploys for all 3; each at its own domain

**Estimated total:** 5 stories × ~1.5h avg = ~7.5h (Days 10-12).

---

## Epic 8 — Polish + Submit

**Business value:** Hitting the submission deadline with everything required.

**Depends on:** All prior epics ≥ 80% green.

**Stories (all ≤ 2h):**
- `story-110-mainnet-contract-deploy` — Foundry script: deploy all 4 contracts to Mantle Mainnet + verify on Mantlescan
- `story-111-mainnet-merchant-onboarding` — Register 3 demo merchants on Mainnet + post bonds + verify
- `story-112-demo-video-script-and-shoot` — 90-second screencast with audio narration per the demo-shape rule in ux-spec
- `story-113-x-thread-draft` — `#MantleAIHackathon` thread with pitch + demo video + repo link + contract addresses
- `story-114-readme-finalize` — README with setup + architecture + deploy addresses + demo links
- `story-115-architecture-diagram-export` — Visual asset (PNG/SVG) of the architecture for submission
- `story-116-accuracy-report` — Self-assessment doc covering known gaps, test coverage, what's mocked vs real
- `story-117-dorahacks-submission` — File on DoraHacks with Track 3 + Track 6 nominations + all addresses
- `story-118-live-demo-rehearsal` — Full Mainnet flow run-through on Jul 1-2 with backup paths rehearsed

**Estimated total:** 9 stories × ~1.5h avg = ~13.5h (Days 12-13).

---

## Summary

| Epic | Story count | Est. hours | Days |
|---|---|---|---|
| 0 — Foundation | 7 | ~10.5 | 1-2 |
| 1 — Smart Contracts | 12 | ~18 | 2-4 |
| 2 — Backend Foundation | 10 | ~15 | 3-5 |
| 3 — Agent Decision Engine | 14 | ~21 | 4-7 |
| 4 — Web App | 20 | ~30 | 5-9 |
| 5 — Telegram Mini App | 9 | ~13.5 | 7-10 |
| 6 — Checkout SDKs | 9 | ~13.5 | 8-11 |
| 7 — Demo Merchants | 5 | ~7.5 | 10-12 |
| 8 — Polish + Submit | 9 | ~13.5 | 12-13 |
| **TOTAL** | **95 stories** | **~142 hours** | **13 days** |

~142 agentic-coding hours across 13 days = ~11 hours/day of coding-agent throughput. Parallelizable across multiple worktrees (orchestrator handles this) so wall-clock < total.

Story files are in `docs/stories/story-*.md`. Each story is independently issue-able by the orchestrator.
