# Patron — Product Requirements Document

**Hackathon:** Mantle Turing Test 2026 — Phase 2 "AI Awakening"
**Submission deadline:** 2026-06-15 15:59 UTC
**Tracks:** Track 3 (AI × RWA) + Track 6 (Agentic Wallets & Economy) + Grand Champion + Best UI/UX + 20-Project Deployment Award
**Status:** Approved — drives all downstream specs

---

## Goal

Patron lets users **spend without selling their stablecoin savings**. Each user owns a personal AI agent (one ERC-8004 Identity NFT per user) that makes the real decisions — whether to open a loan, when to repay, whether to trust a merchant, when to rotate if depeg risk rises. The agent locks the user's yield-bearing **sUSDe** on Mantle as collateral, borrows USDC against it via **Aave V3 on Mantle**, and pays for the user's purchase. The collateral's yield covers the loan's borrow rate (today: sUSDe ≈ 3.8% APY vs USDC borrow ≈ 3.5% APR via Aave Mantle E-Mode 1; spread varies with market but stays structurally non-negative — i.e. **your sUSDe pays the loan interest, not your wallet**), so spending against the position has a near-zero cost-of-credit floor. Every agent decision is logged via **ERC-8004 reputation** on Mantle so any judge, regulator, merchant, or future tool integration can verify exactly what the agent did and why. Merchants integrate via a 1-line embeddable Checkout SDK (vanilla JS + React variants). Users access via a full web app or Telegram Mini App, where they manage their agent with plain-language permission summaries and a one-tap Emergency Freeze.

## One-line pitch

> Buy now, pay later — except your savings keep earning, the AI is held accountable on-chain, and the agent is yours.

## Sponsor-native fit

Patron drives volume to Mantle's RWA stack (sUSDe today, USDY/mUSD on listing) and Aave V3 Mantle while showcasing ERC-8004 as the accountability layer for autonomous agents — the exact thesis Mantle published when deploying ERC-8004 to mainnet on 2026-02-16. Track 3 (Mantle-sponsored AI × RWA) and Track 6 (Byreal-sponsored Agentic Economy — qualified by `byreal-cli` invoked from the agent's tool layer) cleanly cross-pair. Stacks Grand Champion + Best UI/UX + Deployment Award nominations from one project.

---

## Demo moment (5-step judge walkthrough — Demo Day, July 2-3)

1. **Judge lands on a Patron-powered storefront** (one of three demo merchants: a fashion shop). Sees a $75 product. Clicks "**Pay with Patron**" — the embedded Checkout SDK button.

2. **The Patron modal opens.** It shows: *"Your sUSDe is yielding ~3.8% APY. We'll borrow $75 against it at ~3.5% APR via Aave Mantle E-Mode. Net carry: +0.5 pp — **your collateral covers the loan cost** (live rate, refreshed every block). Your agent monitors the spread; you keep the item AND your sUSDe stays in your wallet."* Judge clicks confirm. (Rate copy is loaded from a live API hitting Aave Oracle so the modal never displays stale numbers. The "+0.5pp" shown is illustrative of today's compressed-funding environment — historically wider, structurally non-negative.)

3. **On-stage screen splits to Mantlescan.** The agent makes its decisions and executes: (a) `MerchantRegistry.checkReputation()` confirms merchant is in good standing; (b) `PatronVault.openLoan()` locks the sUSDe; (c) Aave V3 borrows $75 USDC; (d) `ReputationProxy.logAction()` writes the ERC-8004 receipt. All transactions confirm within ~6 seconds (Mantle block time). Merchant receives USDC.

4. **Judge sees their Patron dashboard.** Live yield ticker climbs (the sUSDe position keeps earning). Loan balance ticks down (auto-paydown scheduled). The plain-language permission summary at the top reads: *"Patron can spend up to $200 USDC per 24h on whitelisted merchants until Aug 1."* The big red **Emergency Freeze** button is prominent — judge clicks it to demonstrate revocation; the dashboard shows all session keys revoked in real time.

5. **Judge unfreezes and clicks the ERC-8004 receipt link.** Sees the on-chain audit trail: agent identity NFT, action type, parameters, success, reputation delta. Agent's lifetime reputation score is visible. Judge can verify the agent did exactly what it claimed — no Klarna-style "trust us" needed.

## The wow moment

> Klarna costs you fees and just had to rehire humans because their AI couldn't be audited. Patron's AI is auditable on-chain, your money is yours, and you can freeze the agent with one tap.

---

## What Patron IS

- A **personal AI agent** for each user (1 ERC-8004 Identity NFT per user, owned by the user's wallet)
- A **BNPL product** where the user's yield pays the loan
- A **multi-tenant SaaS** the user accesses via web app or Telegram Mini App
- A **checkout SDK** any merchant can embed (vanilla JS + React)
- A **merchant directory** with on-chain reputation per merchant
- An **agent management dashboard** with Emergency Freeze, plain-language permission summaries, and live position tracking

## What Patron is NOT (out of scope for hackathon v1)

| Excluded | Reason |
|---|---|
| OpenClaw integration | OpenClaw is single-user self-hosted; not suitable for multi-tenant SaaS. Replaced by Claude Agent SDK in our backend |
| Self-host Patron locally | Hosted SaaS only; no self-host story in v1 |
| Custom L2 / app-chain | Mantle works |
| Native iOS / Android apps | Web + Mini App covers reach |
| Built-by-us fiat off-ramp | Merchants use their own rails for USDC |
| KYC for v1 | sUSDe via Aave is permissionless; agent reputation handles trust signals |
| External security audit | Slither + Aderyn + careful patterns are the substitute |
| Multi-collateral asset support | sUSDe is v1; USDY/mUSD are v2 once Aave AIP lands |
| Cross-chain ERC-8004 reputation reads | Theoretical in 2026; v2 |
| Solana CLMM-side execution as default flow | `byreal-cli` is wired as optional Source-Funds path only |
| ERC-8004 Validation Registry | In flux per TEE community update |

---

## Required submission artifacts (Day 13)

- [ ] Public GitHub repo with MIT license
- [ ] README with setup + architecture + deployed contract addresses (real, not `0x000`)
- [ ] Smart contracts deployed to Mantle Mainnet, verified on `mantlescan.xyz`
- [ ] ≥1 AI-callable on-chain function (`PatronVault.openLoan` callable from agent task)
- [ ] Frontend publicly accessible (Vercel domain, not localhost)
- [ ] Demo video ≥ 2 min, ≤ 5 min — screencast with audio narration showing the live flow
- [ ] X thread tagged `#MantleAIHackathon` (pitch + demo + repo + contract addresses)
- [ ] DoraHacks submission with all deployment addresses
- [ ] `byreal-cli` exercised in at least one agent tool call (Track 6 qualification)
- [ ] Track 3 + Track 6 nominations selected
- [ ] Architecture diagram visual asset
- [ ] Accuracy report (self-assessment) documenting any known gaps

---

## Judging-criteria alignment

| Judging dimension (Mantle Turing Test) | How Patron scores |
|---|---|
| **Technical Depth (30%)** | 4 deployed Solidity contracts · Claude Agent SDK with 6 intent handlers · Aave V3 integration · ERC-8004 receipt logging · 2 npm-published SDKs · Foundry fuzz + invariant tests · Postgres-backed indexer |
| **Innovation (25%)** | Negative-cost-of-funds BNPL is a novel financial primitive · ERC-8004 receipts as a verifiable accountability layer for AI agents (post-Klarna failure) · Emergency Freeze as a user-facing safety primitive · multi-merchant directory + embeddable SDK |
| **Mantle Ecosystem Contribution (25%)** | Drives volume to sUSDe (Ethena), Aave V3 Mantle, ERC-8004 Mantle Registry, Byreal CLI · serves Mantle's whale-chain demographic with retail-friendly BNPL · positions Mantle as the agent-accountability chain |
| **Product Completeness (20%)** | Full vision shipped: 4 contracts + backend agent + web app + Telegram Mini App + 2 SDKs + 3 demo merchants + CI/CD + tests + docs |

---

## Pitch opener (use verbatim for X thread + demo intro)

> In May 2026, Klarna had to rehire human disputes agents because their AI hallucinated and they couldn't audit it. Watch what happens when the agent is held accountable on-chain.

## Tagline candidates (for X / landing)

- *"Spend without selling. Your yield pays the loan."*
- *"BNPL that pays you back — and proves it on-chain."*
- *"Your money keeps working while you spend. Your agent works for you. You can freeze it any time."*
