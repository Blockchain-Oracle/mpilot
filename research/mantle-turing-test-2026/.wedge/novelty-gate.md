# Novelty Gate — Mantle Turing Test Hackathon 2026

Date: 2026-06-02
Subagent: novelty-gate
Time budget used: ~25 min

Sources consulted:
- Local ETHGlobal corpus (17,180 projects, ETHWaterloo 2019 → ETHGlobal Cannes 2026 / HackMoney 2026 — most recent events)
- Web search (Google) for live products, news, and Klarna/Western Union/Sentora moves
- DoraHacks Mantle Turing Test 2026 BUIDL page (HTTP 405 — could not fetch directly; would need authenticated scrape)
- Web fetch attempts on Devpost search (returned empty for the headless Devpost search URL — known limitation)

Tool failures: DoraHacks BUIDL page and Devpost search both rejected unauthenticated WebFetch. Compensated by querying ETHGlobal corpus exhaustively (the densest hackathon source) + web search for live products.

---

## Finalist 1 — StableGuard (AI bodyguard for stablecoin yields)

### Verdict: **OUTRIGHT-DUPLICATE** (hackathon side) + **CLOSE-SHAPE-EXISTS** (live product side)

A project literally named **StableGuard.AI** shipped at ETHOnline 2025 — eight months ago — built by an AgentverseAI team, won 3rd place in the Artificial Superintelligence Alliance prize, and the tagline is verbatim our concept: *"Stable coin portfolio manager — among the stable coins of a user, the ai agent team rebalances it."* Description: *"monitors the real-time health of stablecoins like USDC, USDT, and DAI — across exchanges, liquidity venues, and news sources — to detect stress before a depeg happens. … liquidity dries up, sentiment turns sour, and price correlations break. StableGuard listens to all of them at once."* That is our pitch, word for word, including the multi-signal detection framing.

On the live-product side, **Sentora + Veda + Morpho** already runs autonomous risk monitoring layers as 24/7 circuit breakers on stablecoin vaults — now integrated into **Kraken Earn** (April 2026). Their pitch: *"dynamically adjusts positions across whitelisted protocols … can autonomously unwind a position if on-chain signals breach safety thresholds."* This is the institutional version of StableGuard, shipped, with $billions in TVL behind it.

### Direct hits (ranked by similarity)
| Project | Source | Year | Chain | Architecture | Similarity (1-5) | Differentiator we'd need |
|---|---|---|---|---|---|---|
| StableGuard.AI | ETHGlobal / ETHOnline 2025 | 2025 | Multi | AgentverseAI multi-agent monitoring + auto-rebalance among stables | **5/5** (NAME COLLISION + same architecture) | Cannot meaningfully differentiate — same name, same approach, prize-winning |
| LiquidityGuard | ETHGlobal / ETHOnline 2025 | 2025 | EVM | DeFi insurance for Curve LPs + Aave protecting against depegs | 4/5 | Insurance angle vs rotation angle |
| DepegSentinel | ETHGlobal New Delhi | 2025 | EVM | Depeg monitoring | 4/5 | (Title-only; concept identical) |
| optistable | ETHGlobal Superhack | 2023 | Optimism/Mode | Stablecoin depeg insurance policies | 4/5 | Insurance vs rotation |
| Stabilan | ETHGlobal Istanbul | 2023 | EVM | Trustless depeg insurance (won 1st place 1inch + 2nd Aave GHO) | 4/5 | Insurance protocol, not agent |
| Sentora Smart Yield + Veda + Kraken Earn | Live (April 2026) | 2026 | Multi | Institutional auto-rotation across Morpho/Aave/Tydro with on-chain risk breakers | 5/5 | Already live, billions in TVL — what's our consumer angle vs theirs? |
| BondFlow | ETHOnline 2025 | 2025 | EVM | Autonomous agent moves idle PYUSD into Ondo OUSG RWA bonds for safe yield | 4/5 | RWA-as-haven story already done |
| Loggerhead Finance | ETHGlobal Cannes | 2025 | Multi-chain (Flow won 2nd) | MCP-powered agentic yield optimizer that switches stablecoin baskets across chains | 4/5 | Same agentic-rotation pattern, no depeg angle |
| InchVest | ETHGlobal Unite DeFi | 2025 | Multi-chain | AI agent stablecoin hedging + lending + swapping | 4/5 | Crowded "AI manages your stables" space |

### Adjacent products
| Project | Source | Year | Notes |
|---|---|---|---|
| AnchorHookV4 | HackMoney 2026 | 2026 | Uniswap v4 risk hook for stablecoin pools |
| Ketchup | ETHGlobal Buenos Aires | 2025 | DeFi risk oracle using CRE-powered risk models for stables |
| StableGuard.AI's Allora-style signal stack | n/a | n/a | Allora itself returned zero ETHGlobal results — Mantle-Allora combo is genuinely under-built |

### Bottom-line recommendation
**SUBSTITUTE.** The name collision alone is fatal to judging. The architecture, signal stack, and auto-rotation framing have all been shipped and prized in the last 12 months. Sentora/Veda/Kraken Earn occupies the institutional space; StableGuard.AI occupied the hackathon-demo space. Trying to ship this for the third time in 13 days, even with USDY + ERC-8004 + Mantle bolted on, walks into a wall of judges who saw it last cycle.

**Substitute concepts (un-occupied space we saw):**
1. **Mantle-native Allora-inferred depeg insurance market** — closer to Stabilan's prize-winning shape but with Allora's inference output as the depeg oracle, on Mantle, with ERC-8004 reputation for the underwriter agents. The "insurance underwriter agent" lane is still open; "rotation agent" is saturated.
2. **Yield-aware mUSD/cmETH treasury sub-agent for DAOs** — Mantle-specific, B2B, no "AI bodyguard" framing collision. Closer to BondFlow but tailored to Mantle's native RWA stack rather than PYUSD/OUSG.

---

## Finalist 2 — GiveMeMyYield (remittance with yield-during-transit)

### Verdict: **CLOSE-SHAPE-EXISTS** (needs material differentiator)

The "remittance via stablecoin agent on Telegram" pattern is the most-shipped category in the corpus — 25+ matches alone. SENDO, Giggle, FlowSend, GlobalX.money, WorldPay, RemitDEX, Papaya, Cerca, Payit Now, PulseRemit, TradeX, BhavInch and others all do agentic / chat-native cross-border stablecoin remittance, several with sub-10-second settlement. **GlobalX.money won 1st place Self SDK** at ETHGlobal New Delhi for instant USDC-to-INR remittance with a similar pitch.

However: **the "yield during the 2–5 minute transit window" framing is genuinely novel.** Zero corpus matches for "yield bearing remittance," "yield in transit," or "earn while transferring." The closest live analog is **Sling Money** (140-country stablecoin remittance, no in-transit yield) and **Mitosis** (cross-chain rails that "could" enable yield in transit but don't ship a consumer remittance product). **Telegram TON Wallet** (May 2026) added USDT yield vaults via Affluent but it's a custody-yield product, not a remittance-with-yield product.

And: **Western Union's USDPT (Solana, Nov 2025) + "Stable by Western Union" (40-country consumer launch in 2026)** is the elephant in the room. Western Union owns the corridor. The differentiator has to be "yield-positive" or "instant-cash-out" — not just "stablecoin remittance."

### Direct hits (ranked by similarity)
| Project | Source | Year | Chain | Architecture | Similarity (1-5) | Differentiator |
|---|---|---|---|---|---|---|
| GlobalX.money | ETHGlobal New Delhi | 2025 | Stablecoin → INR rails | <10s remittance, 1st place Self SDK | 4/5 | They don't yield; we yield + Telegram + USDY |
| FlowSend | ETHOnline 2025 | 2025 | Base | Gasless, bank-integrated remittance Mini App | 4/5 | Same pattern; no yield component |
| Papaya | ETHOnline 2025 | 2025 | PYUSD on Ethereum | Apple Pay ↔ PYUSD ↔ PayPal cross-border | 4/5 | "cashback and rewards" framing is adjacent to yield |
| SENDO | ETHOnline 2025 | 2025 | Stablecoin | SMS + AI remittance for the unbanked | 3/5 | Different UX (SMS), no yield |
| Giggle | ETHOnline 2025 | 2025 | PYUSD | WhatsApp PYUSD remittance | 4/5 | Same chat-native UX, no yield |
| PulseRemit | HackMoney 2026 | 2026 | Hybrid on/off-chain | Intent-based remittance orchestrator with state channels | 4/5 | Shipped 2 months ago; no yield |
| WorldPay | ETHGlobal New Delhi | 2025 | World Chain | World ID + 1inch + ENS remittance, Mini App | 3/5 | Different identity story, no yield |
| Western Union USDPT + Stable | Live | 2025-2026 | Solana | Stablecoin remittance, 200+ countries, 2026 consumer launch | 4/5 (incumbent threat) | They have distribution; we have yield |
| Sling Money | Live | 2025 | Multi-chain | 140-country stablecoin remittance app | 4/5 | No in-transit yield |

### Adjacent
| Project | Year | Notes |
|---|---|---|
| Leo Finance | ETHOnline 2025 | ROSCAs on-chain w/ 8.5% APY — "yield + savings circle" angle, distinct from remittance |
| BondFlow | ETHOnline 2025 | Idle-PYUSD → RWA-bond yield agent. Could be confused for our yield half |

### Bottom-line recommendation
**KEEP-WITH-MATERIAL-DIFFERENTIATOR.** The yield-in-transit angle is genuinely uncrowded in hackathon corpora and in live products. But the "Telegram remittance bot" surface area is saturated. The wedge must lead with **USDY as the in-transit asset (Mantle-native), with a quantified yield-per-transit number** — not "Telegram remittance with AI." Plus a credible answer to "why would I use this instead of Western Union's USDPT?" The 2–5 minute transit window only generates ~$0.002 of yield per $1,000 — judges will catch that math. Differentiator probably has to be **"yield while it sits in the recipient's wallet pre-cashout"** (which can be hours to days), not literal "in-transit." That's the honest, defensible framing.

---

## Finalist 3 — YieldBNPL (BNPL with negative cost-of-funds via USDY collateral)

### Verdict: **CLOSE-SHAPE-EXISTS** (best novelty of the three; needs sharp positioning vs Klarna)

There are 12 BNPL projects in the ETHGlobal corpus. The most architecturally identical match is **Kite (ETHGlobal LFGHO 2024)**: *"BNPL integration with a GHO-backed ERC-4626 vault. Users can conveniently offset interests accrued on their installment payments with yields earned from the Aave marketplace."* That is essentially YieldBNPL with GHO instead of USDY. **Orbit Finance (HackMoney 2026)** is another close match: *"hybrid self-repaying lending protocol combining DeFi + Real-World Assets … debt reduces over time through yield generation."*

But: **the specific architecture of "USDY as on-chain collateral for a ~1% Mantle loan, where yield > interest"** is not directly shipped in the corpus. Mizan (ETHOnline 2025) does zero-interest BNPL but with a different liquidity-routing model. NanoLoan does multi-chain BNPL with World ID, not yield-collateral. PayLoop is recurring-payments BNPL.

Live-product threat: **Klarna's UCP integration + KlarnaUSD stablecoin (2026 launch on Tempo)** + Aave Horizon's RWA collateral primitives ($423M TVL) are converging on this space. Klarna explicitly entered crypto BNPL in 2026. They have the distribution AND now the stablecoin. The window to ship a *self-custody, yield-positive* version is real but narrow.

### Direct hits
| Project | Source | Year | Chain | Architecture | Similarity (1-5) | Differentiator |
|---|---|---|---|---|---|---|
| Kite | ETHGlobal LFGHO 2024 | 2024 | EVM | GHO-backed ERC-4626 vault offsets BNPL interest | **5/5** (same shape, GHO instead of USDY) | We swap GHO for USDY, run on Mantle, add agent flow |
| Orbit Finance | HackMoney 2026 | 2026 | EVM | Self-repaying lending using RWA + DeFi collateral | 5/5 | Shipped 2 months ago; closest active competitor |
| Mizan / MizanPay | ETHOnline 2025 | 2025 | EVM | Zero-interest BNPL via DeFi liquidity | 4/5 | Different mechanism (no yield-collateral story) |
| Credura | ETHGlobal Cannes | 2025 | EVM | Crypto-backed BNPL with bank-debit repayment | 4/5 | Crypto-as-collateral, fiat repayment |
| NanoLoan | ETHGlobal NY 2025 | 2025 | World Chain + Ethereum | Multi-chain BNPL, CCTP bridging, World ID | 3/5 | Different identity story |
| StableOp | ETHGlobal New Delhi | 2025 | PYUSD | Agentic lending protocol on PYUSD | 4/5 | Lending not BNPL specifically |
| Next Pay | Scaling Ethereum 2024 | 2024 | Gnosis Pay | BNPL on Gnosis Pay card, wstETH collateral | 4/5 | Same shape: yield-bearing collateral for fiat spending — but Gnosis Pay rails, not Mantle |
| PayLoop | HackMoney 2026 | 2026 | EVM | Klarna-equivalent BNPL with Circle Wallets | 3/5 | Different mechanism (recurring payments) |

### Adjacent / live products
| Project | Year | Notes |
|---|---|---|
| Aave Horizon | March 2026 | RWA collateral lending live, $423M TVL — the institutional version exists |
| KlarnaUSD on Tempo | 2026 launch | Klarna's own stablecoin makes this race urgent |
| Klarna + Affirm UCP for Google AI Mode | May 2026 | Agentic BNPL is happening but custodial, not self-custody |

### Bottom-line recommendation
**KEEP-WITH-MATERIAL-DIFFERENTIATOR.** Kite already shipped the exact architecture two years ago with GHO. Orbit Finance shipped the self-repaying version 2 months ago. To win, this needs:
1. **A live ERC-8004 agent receipt for every purchase** (not present in any prior project — this is the wedge)
2. **A specific Mantle-USDY differentiator that isn't reproducible on Aave Horizon** (e.g., Mantle's gas costs make $50 BNPL purchases viable that aren't viable on mainnet)
3. **A self-custody story positioned explicitly against KlarnaUSD's custodial model**

Without all three, judges will say "Kite + USDY swap." With all three, this is genuinely the most defensible of the three finalists.

---

## Summary table for Abu

| Finalist | Verdict | Most concerning hit | Action |
|---|---|---|---|
| StableGuard | **OUTRIGHT-DUPLICATE** | StableGuard.AI (ETHOnline 2025, 3rd place, identical name + concept) | **SUBSTITUTE** |
| GiveMeMyYield | CLOSE-SHAPE-EXISTS | GlobalX.money (1st place Self SDK, ETHGlobal NDelhi 2025) + Western Union USDPT 2026 consumer launch | KEEP if yield framing is honest (not "in-transit") |
| YieldBNPL | CLOSE-SHAPE-EXISTS | Kite (LFGHO 2024, identical architecture) + Orbit Finance (HackMoney 2026, shipped 2mo ago) | KEEP if ERC-8004 receipts + Mantle gas + anti-Klarna positioning are baked in |

## Sources
- Local ETHGlobal corpus: `~/.claude/skills/sahil-hackathon-corpus/data/projects_full.json` (17,180 projects)
- https://ethglobal.com/showcase/stableguard-ai-fn85z — direct hit on Finalist 1
- https://ethglobal.com/showcase/kite-g5fnj — direct hit on Finalist 3
- https://ethglobal.com/showcase/orbit-finance-7f55o — direct hit on Finalist 3 (HackMoney 2026)
- https://ethglobal.com/showcase/globalx-money-08tpa — direct hit on Finalist 2
- https://ethglobal.com/showcase/bondflow-nyszu — adjacent hit on Finalists 1 & 2
- https://ethglobal.com/showcase/loggerhead-finance-npoty — adjacent hit on Finalist 1
- https://sentora.com/research — live competitor for Finalist 1
- https://decrypt.co/366677/western-union-usdpt-stablecoin-solana-anchorage-digital — Finalist 2 incumbent threat
- https://aave.com/blog/horizon-launch — Finalist 3 live RWA-collateral lending
- https://www.nasdaq.com/articles/bnpl-not-enough-so-klarna-launches-coin-klarnausd-stablecoin — Finalist 3 incumbent threat
- https://www.digitalcommerce360.com/2026/05/13/affirm-klarna-google-bnpl-agentic-commerce/ — Finalist 3 agentic-commerce convergence
