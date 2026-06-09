# 05 — Security Landscape: Collateralized BNPL + AI Agent + ERC-8004

Knowledge-only document. Catalogs attack surface, historical exploits, and defensive
primitives that exist in the wider ecosystem. No prescriptions, no "we should". The
intent is to give any future architect or reviewer the standing context they need to
*reason* about a product whose shape is:

- Stablecoin / RWA collateral generating yield
- AI agent that opens, manages, and routes loan repayment
- Every action is logged or attested through ERC-8004 registries

---

## 1. Collateralized-lending attack surface

### 1.1 Oracle manipulation

Oracle attacks remain the single most prolific source of catastrophic loss in
collateralized lending. The standard categories observed in production:

- **Single-block spot manipulation** — an attacker uses a flash loan to skew a
  shallow AMM pool that the protocol reads as a price feed. Mango Markets
  (Solana, 11 Oct 2022) is the canonical case: Avraham Eisenberg moved MNGO
  roughly 2,394 percent (≈ $0.038 → $0.91) across FTX, AscendEX and Serum which
  fed Mango's oracle, lifted his MNGO long from $10M to >$400M of notional,
  borrowed against it, and removed ~$114M (~$53.7M USDC, $3.2M USDT, plus SOL
  and others) before the price collapsed.
  Source: https://www.chainalysis.com/blog/oracle-manipulation-attacks-rising/
  Source: https://blockworks.com/news/mango-markets-mangled-by-oracle-manipulation-for-112m
  Source: https://immunebytes.com/blog/mango-markets-exploit-oct-11-2022-detailed-analysis/

- **TWAP-window manipulation** — even time-weighted oracles fall when the
  attacker can dominate the window. Inverse Finance (2 Apr 2022) drained
  ~$15.6M in DOLA, ETH, wBTC, and YFI because the Keep3r TWAP for INV was
  declared 30 minutes but the protocol only required 15 seconds of elapsed
  observation after a freshly cached sample. Attacker spammed the next-block
  inclusion to lock in an inflated spot read from Sushiswap INV/WETH.
  Source: https://medium.com/@RedStone_Finance/oracle-attacks-1-inverse-finance-15m-stolen-9fffb03d5171
  Source: https://www.certik.com/resources/blog/inverse-finance-02-april-2022

- **Stale data / liveness failure** — Compound's Coinbase-fed DAI oracle
  spiked to $1.34 on 26 Nov 2020 for ~70 minutes, triggering ~$89M of
  cascading liquidations. The attacker flash-loaned 46M DAI, swapped it for
  2.4B cDAI then redeemed, walking with ~$3.7M while leveraged COMP farmers
  ate the loss.
  Source: https://decrypt.co/49657/oracle-exploit-sees-100-million-liquidated-on-compound
  Source: https://cointelegraph.com/news/compound-liquidator-makes-4m-as-oracles-post-inflated-dai-price

- **Pool-as-oracle (shared liquidity)** — bZx (Feb 2020, two incidents,
  ~$954k combined) used Kyber, which routed through Uniswap reserves. A flash
  loan that moved Uniswap moved Kyber moved bZx; the protocol had no
  cross-source sanity check.
  Source: https://www.palkeo.com/en/projets/ethereum/bzx.html

- **Internal-orderbook-as-oracle** — Binance's USDe spot order book served as
  the local index for derivatives margin during the 11 Oct 2025 crash. USDe
  printed $0.65 on Binance while redemptions worked at peg elsewhere; this
  contributed to the ~$19B liquidation cascade that day.
  Source: https://www.coindesk.com/markets/2025/10/11/ethena-s-usde-briefly-loses-peg-during-usd19b-crypto-liquidation-cascade

### 1.2 Liquidation MEV

When a borrower goes underwater, anyone can repay debt and seize collateral at
a discount (typically 5–10 percent). This generates two attacker patterns:

- **Sandwiched liquidation** — searcher front-runs the liquidation tx with an
  AMM trade that worsens the borrower's health factor, then back-runs with the
  liquidation itself. Compound's Nov 2020 incident is partly attributable to
  this dynamic; liquidator captured ~$4M while protocol absorbed the bad debt
  gap.
  Source: https://cointelegraph.com/news/compound-liquidator-makes-4m-as-oracles-post-inflated-dai-price

- **JIT liquidity around liquidation auctions** — searcher adds concentrated
  Uniswap v3 liquidity for the precise block of a known liquidation swap,
  captures fees, removes it. Drains fee revenue from passive LPs rather than
  the protocol directly, but reshapes who profits from liquidation flow.
  Source: https://www.zealynx.io/glossary/jit-liquidity-attack

### 1.3 Donation / direct-transfer attacks

Some protocols compute share price as `assets / shares`. An attacker who is
the first depositor can mint one share, transfer assets directly to the vault
(bypassing the deposit function), and inflate share price so that subsequent
small depositors round down to zero shares. Euler (Mar 2023, $197M) is the
adjacent case: a patch (`donateToReserves`) introduced for a prior first-
depositor bug broke the eToken / dToken invariant, letting an attacker
self-liquidate at an inflated penalty to mint phantom collateral.
Source: https://www.cyfrin.io/blog/how-did-the-euler-finance-hack-happen-hack-analysis
Source: https://www.chainalysis.com/blog/euler-finance-flash-loan-attack/

### 1.4 Interest-rate manipulation

In utilization-curve lending markets, a manipulator can push utilization to
the kink with a flash-loan-funded borrow, distort borrow APR for the duration
of one block, and either:
- profit from variable-rate debt that other users hold;
- profit from rate-arb derivatives keyed off observed utilization;
- force rate-oracle reads on dependent protocols (rate-as-oracle anti-pattern).

### 1.5 Cross-margin / shared collateral

In protocols where one collateral position backs multiple debt positions,
a single bad asset listing can drain everything. Cream Finance lost ~$130M
on 27 Oct 2021 by listing collateral that an attacker could mint at distorted
prices: flash loans from Maker (DAI) and Aave (ETH) → Curve yPool yDAI →
yUSDVault → crYUSD. A bug doubled the perceived value of yUSDVault shares;
attacker inflated $1.5B crYUSD to $3B, paid back flash loans, drained the
remainder. 68 assets and 9 ETH in gas in a single tx.
Source: https://medium.com/immunefi/hack-analysis-cream-finance-oct-2021-fc222d913fc5
Source: https://www.halborn.com/blog/post/explained-the-cream-finance-hack-october-2021

### 1.6 Reserve / accounting drift

Lending protocols accumulate reserves from spread and liquidation fees. Bugs
that desync reserves from share supply silently inflate one side. dTRINITY
(Mar 2025, $257k) — a share-accounting / index-sync bug let a 772 USDC
deposit register as ~$4.8M of collateral via phantom share inflation.
Source: https://dev.to/cryip/dtrinity-exploit-breakdown-257k-lost-due-to-share-accounting-index-sync-bug-2k7a

### 1.7 Recent 2024–2026 lending exploits

- **Radiant Capital** (Jan 2024, $4.5M) — rounding bug inherited from the
  Compound/Aave codebase, exploited via flash loan.
- **KiloEx** (Apr 2025, $7.5M) — labeled "oracle manipulation" but root cause
  was access control on a trusted-forwarder path into the price-setting
  function. Cross-chain exploit.
- **Yellow Protocol** (Apr 2025, $2.4M) — single DEX pool as price source;
  attacker inflated token price with trades, took under-collateralized loan
  before liquidation could trigger.
- **Bunni** (Sep 2025, $8.4M) — flash-loan-assisted exploit of liquidity
  accounting rounding in Uniswap v4 hook on Ethereum and UniChain.
- **Kelp rsETH bridge** (Apr 2026, ~$292M, LayerZero-mediated) — bridge
  exploit cascaded into Aave bad debt; Aave froze rsETH markets and Mantle
  proposed a 30,000 ETH loan to cover the gap.

Source: https://www.halborn.com/reports/top-100-defi-hacks-2025
Source: https://www.theblock.co/post/397988/kelp-daos-rseth-bridge-apparently-exploited-for-roughly-292-million-in-layerzero-based-attack
Source: https://cryptobriefing.com/mantle-loan-to-aave-cover-debt/

Aggregate context: 2025 crypto losses to hacks and scams exceeded $1.7B (vs.
$1.49B for all of 2024); flash-loan attacks made up 83.3 percent of eligible
exploits; oracle manipulation was the #2 vector at $52M / 37 incidents in
2024.
Source: https://hacken.io/discover/flash-loan-attacks/

---

## 2. Stablecoin / RWA-specific attacks

### 2.1 Depeg cascade

The 11 Oct 2025 USDe event is the reference case for any product holding
yield-bearing stablecoin collateral. Trigger: Trump tariff announcement →
broad sell-off → forced unwind of Binance leveraged positions → USDe spot on
Binance dropped to $0.65 while redemptions held at peg elsewhere. 1.6M
traders liquidated, ~$19B in leveraged positions wiped, USDe AUM saw $8.3B
of outflows. Root cause was venue-local: Binance used its internal order
book as oracle rather than deeper external pools.
Source: https://www.coindesk.com/markets/2025/10/11/ethena-s-usde-briefly-loses-peg-during-usd19b-crypto-liquidation-cascade
Source: https://99bitcoins.com/news/altcoins/ethena-usde-8b-outflows/
Source: https://www.ainvest.com/news/ethena-usde-depeg-event-case-study-systemic-risk-algorithmic-stablecoins-2510/

### 2.2 Synthetic-token unwrap / wrapped-asset divergence

A wrapped representation (e.g. wstETH, sDAI, mUSD) can diverge from its
underlying when the wrapper contract's exchange rate is stale or
manipulable. Lending protocols that read the wrapper at face value while
liquidating against external markets carry one-sided exposure.

### 2.3 Rebasing-token accounting

Rebasing tokens (balance changes without transfer events) interact poorly
with vault accounting. Sperax USDs (Feb 2023) suffered exactly this: a
patched `_ensureRebasingMigration()` function broke balance invariants when
accounts toggled between rebasing and non-rebasing classes. Any
collateral asset whose `balanceOf()` changes without a Transfer event needs
explicit handling in any contract that holds it.
Source: https://medium.com/sperax/usds-feb-3-exploit-report-from-engineering-team-9f0fd3cef00c
Source: https://bugblow.com/blog/rebasing-token-security-defi-integration-risks

### 2.4 Transfer-restricted collateral — denial of liquidation

USDY (Ondo) gates transfers via allowlist + blocklist + sanctions list, and
primary mint requires KYC. The 40-50 day settlement window for mint and the
T+1 redemption window further restrict who can hold the asset and when. If
a liquidator address is not on the allowlist, the liquidation transaction
reverts on the collateral transfer step, and the protocol holds the bad
debt. This is a class of risk that does not exist for free-transfer assets.
Source: https://docs.ondo.finance/general-access-products/usdy/faq/eligibility
Source: https://docs.ondo.finance/developer-guides/mantle-integration-guidelines

### 2.5 Cross-chain message replay / spoofing

Any system whose collateral or settlement crosses a bridge inherits the
bridge's failure modes. Recent cases:

- **CrossCurve** (2025, ~$3M) — gateway validation bypass in
  `ReceiverAxelar.expressExecute` accepted spoofed cross-chain messages.
- **Orbit Chain** (Jan 2024) — 7-of-10 multisig keys compromised, drained
  bridge.
- **Kelp rsETH / LayerZero** (Apr 2026, ~$292M) — see §1.7.
- **Syndicate Commons bridge** (Apr 2026) — ~18.5M SYND tokens via
  unauthorized access.

Source: https://www.theblock.co/post/387939/crosscurve-bridge-exploited-for-approximately-3-million-across-multiple-chains-via-spoofed-messages
Source: https://chain.link/education-hub/cross-chain-bridge-vulnerabilities

### 2.6 Redemption-queue front-running

Tokenized treasuries with explicit redemption queues (USDY's T+1, OUSG's
similar window) expose mempool-visible redemption intent. Front-running
risks: secondary-market arbitrage against announced redemption price, and
queue-position griefing where attackers spam minimum-size redemptions to
delay legitimate ones.

### 2.7 Liquidity-exhaustion attacks on intent-based bridges

Recent academic work simulated 210 historical attack instances against
deBridge intent-based settlement; 80.5 percent profitable, mean net $286.14
per attack. Across, Mayan Swift and deBridge moved 3.5M intents totaling
$9.24B between Jun and Nov 2025. The attack class drains solver capital,
not user funds directly, but can DOS settlement if a target's collateral
sits on a bridged path.
Source: https://arxiv.org/html/2602.17805v1

---

## 3. AI agent attack surface

### 3.1 Prompt injection

The Grok / Bankrbot incident (May 2026) is the public reference case for
agent-with-wallet exploits. An attacker on X sent a prompt encoded in Morse
to bypass plaintext filters; Grok parsed the encoded instruction and
Bankrbot (which trusted Grok's reasoning output as a trade instruction)
executed a transfer of 3B DRB tokens (~$150–200k) from a verified Base
wallet. Two OWASP-LLM classes intersected: LLM01 (Prompt Injection) and
LLM06 (Excessive Agency). Funds were eventually returned but the demo
quality of the exploit is the takeaway.
Source: https://www.cryptotimes.io/2026/05/04/xais-grok-ai-loses-175k-in-crypto-heist-via-clever-prompt-injection-then-gets-it-all-back/
Source: https://www.ainvest.com/news/ai-agent-exploit-drains-150-000-grok-wallet-prompt-injection-2605/
Source: https://www.giskard.ai/knowledge/how-grok-got-prompt-injected-an-x-user-drained-150-000-from-an-ai-wallet
Source: https://oecd.ai/en/incidents/2026-05-04-4a73

Subtypes observable in the field:
- **Direct injection** — user-supplied input contains "ignore previous
  instructions" or encoded equivalents.
- **Indirect injection** — payload embedded in a tool's output (a webpage,
  a transaction memo, an on-chain attestation, a Discord message scraped by
  the agent). The agent's own context window becomes the attack channel.
- **Encoded injection** — Morse, base64, leetspeak, unicode homoglyphs,
  image-OCR payloads — bypasses naive string filters.

### 3.2 LLM hallucinated transactions

The agent generates a syntactically valid but semantically wrong instruction
— wrong token address, wrong recipient, wrong decimal scaling. No external
attacker required; the failure is endogenous. Hardest to detect because the
transaction *looks* like one the agent would have legitimately produced.

### 3.3 Tool-call / skill injection

If the agent dynamically loads skills, plugins, or "tools" (OpenClaw-style
skill registry, MCP server discovery, plugin marketplaces) then the trust
boundary moves to skill registration. A malicious skill registered as
`get_balance` can implement `transfer_all` semantics. The agent's planner
never sees the implementation.

### 3.4 Replay of agent-signed transactions

If an agent signs transactions with a delegated key (session key, EIP-7702
delegation, gas-sponsored relay), an attacker who captures one signed
transaction may replay it on:
- the same chain after a nonce reset (e.g. account abstraction wallet
  redeployed at same address);
- a different chain that accepts the same chain-id-less signature;
- a fork or testnet whose chain-id collides.

### 3.5 Sybil reputation farming on ERC-8004

ERC-8004 went live on Ethereum mainnet Feb 2026. Identity is an ERC-721 NFT
with capability metadata; reputation is a registry of feedback signals that
"intentionally avoids mandating one universal score formula". The EIP is
explicit that Sybil attacks remain possible: an attacker can mint N agent
NFTs, perform inter-agent feedback to inflate a reputation score, and then
deploy the high-rep identity for whatever the consumer protocol gates on
reputation.
Source: https://eips.ethereum.org/EIPS/eip-8004
Source: https://www.datawallet.com/crypto/erc-8004-explained
Source: https://www.kucoin.com/blog/understanding-erc-8004-on-chain-identity-standard-for-ai-agents

### 3.6 Agent identity theft

The identity NFT is transferable by default in most ERC-721 deployments.
Stealing the NFT inherits the reputation history attached to it. Phishing
of an agent operator's wallet — or a malicious approve / setApprovalForAll
exploited through the agent's own ability to sign on-chain — can transfer
the identity along with its accumulated track record.

### 3.7 Cross-agent collusion

In marketplace settings, agents A and B can reciprocally endorse each other
to inflate aggregate ratings. Detection requires either a trusted reviewer
weighting (some ERC-8004 reputation backends are expected to layer reviewer
trust filters on top of the raw signal) or external graph analysis of the
feedback topology.

### 3.8 Excessive-agency / privilege creep

A pattern observed across LLM agent deployments: scope granted to the
agent's wallet expands over time as new features ship, but the original
risk review only covered the initial scope. Permanent approvals
(`approve(spender, MaxUint256)`) compound this. The Grok / Bankrbot
incident is partly an excessive-agency failure: the bot trusted any
plausible-looking instruction routed through Grok's reasoning channel.

---

## 4. BNPL-specific fraud and abuse vectors

Carries over from web2 BNPL except identity is now ERC-8004 (or equivalent
crypto-native identity), which changes some economics.

### 4.1 Loan stacking

Borrower opens loans across multiple providers simultaneously, before any
provider has registered the others' loans on-chain. In a fragmented agent /
protocol marketplace each provider sees only its own ledger at decision
time. This is the dominant BNPL fraud pattern in web2 and translates
directly: ERC-8004 attestations need to be queried (and trusted, and
fresh) before approval. If two agents approve in the same block neither
sees the other.

### 4.2 Synthetic identity

Web2 baseline: Experian reported +60 percent in synthetic-identity fraud
2024 YoY; in the US identity theft for unauthorized BNPL ranks as the
second most common financial crime, affecting ~34 percent of the
population.
Source: https://www.getfocal.ai/blog/buy-now-pay-later-fraud

On-chain analog: minting N ERC-8004 identities for one operator, each with
fabricated KYC inputs if the verifier is naive. Cost per identity gates the
attack — gas, registration fee, KYC bypass cost.

### 4.3 Sybil reputation washing

Pre-loan: build inflated reputation across many small completed loans (or
fabricated completions if collusion is possible — see §3.7), then take one
oversized loan and default. The "reputation collateral" thesis fails if
reputation can be cheaply manufactured.

### 4.4 Friendly fraud / chargeback fraud

User receives goods, then disputes the payment with the merchant or the
agent. 62 percent of merchants reported first-party-misuse / friendly-
fraud growth of ≥5 percent YoY in recent surveys. On-chain settlement is
final, so the analog is initiating a clawback against the merchant via the
agent's dispute pathway after goods are delivered.
Source: https://www.fico.com/blogs/buy-now-pay-later-bnpl-fraud-and-regulatory-update

### 4.5 Merchant fraud

Merchant accepts BNPL payment, ships nothing, exits. The crypto-rails
version is faster (no chargeback period, no acquirer to intervene). Real-
world losses observed in web2 BNPL routinely exceed direct user fraud.

### 4.6 Wash trading to inflate reputation

In any reputation system that rewards "completed loan" or "completed
transaction" counts, two colluding agents can trade obligations back and
forth at zero net economic effect to manufacture history.

### 4.7 Identity theft for BNPL

US figure cited above: 34 percent of population affected by BNPL identity
theft. The on-chain version is wallet phishing → operator signs a loan
they did not intend → ERC-8004 identity is now in default.
Source: https://www.getfocal.ai/blog/buy-now-pay-later-fraud

---

## 5. Defensive primitives that exist (menu, not prescription)

### 5.1 Oracle architectures

- **Chainlink** — push-model price feeds, ~63–67 percent market share in
  2025, OG DeFi standard (Compound, Aave). Reliability-focused, slower
  cadence.
- **Pyth** — pull-model, first-party publisher network (exchanges, market
  makers). Popular for perps and on non-EVM chains where latency matters.
- **Redstone** — both push and pull, off-chain data persistence to cut gas,
  available on 60+ chains; fastest-growing 2024–2025.
- **API3** — first-party dAPIs, data provider signs directly; offers
  insurance coverage for dAPI malfunction (the only major oracle network
  with this).
- **Tellor / Chronicle / Band** — secondary alternatives present in the
  market.

Source: https://blog.redstone.finance/2025/01/16/blockchain-oracles-comparison-chainlink-vs-pyth-vs-redstone-2025/
Source: https://www.tokenmetrics.com/blog/leading-oracles-for-price-real-world-data-2025

### 5.2 TWAP patterns

Time-weighted oracles average across a window. Effectiveness depends on
attacker capital relative to AMM depth across the entire window. Inverse
Finance demonstrated that a short or freshly-cached window can be
manipulated; a long window protects against single-tx attacks but lags
real prices during legitimate volatility.

### 5.3 Health-factor design

Standard menu:
- LTV / liquidation threshold gap (Aave style)
- Grace periods between threshold breach and liquidation eligibility
- Partial-liquidation caps to soften MEV
- Asset-specific risk parameters (cap, supply cap, isolation mode)
- "Efficiency mode" / e-mode for correlated-asset pairs

### 5.4 Circuit breakers

- Aave's freeze/pause for individual reserves
- DAO-vote-gated pause keys
- Time-locked parameter changes
- Automatic pause on bad-debt threshold
Source: https://aave.com/docs/developers/safety-module

### 5.5 Allow-listed liquidators

Some protocols (notably MakerDAO's auction system and certain RWA
protocols) restrict who can act as liquidator. Trades robustness against
inclusivity. For restricted-transfer collateral (USDY, see §2.4) the
liquidator pool is implicitly restricted by the asset itself.

### 5.6 Insurance funds — Aave Umbrella

Aave replaced its legacy Safety Module with Umbrella in June 2025. ~$250M
in staked WETH, USDC, USDT, GHO. Slashing is now *automatic* — triggered
when bad debt in a specific asset exceeds a preset threshold, without DAO
vote. Trade-off: higher slashing probability, narrower scope (you only
lose funds if the specific asset you staked has bad debt above its
"offset buffer"; e.g. USDT has a 100k USDT first-loss offset paid by the
DAO before stakers are touched).
Source: https://aave.com/blog/historical-liquidations
Source: https://blockworks.com/news/umbrella-reshapes-aave-staking
Source: https://governance.aave.com/t/bgd-aave-safety-module-umbrella/18366

### 5.7 ERC-8004 reputation-stake / slash mechanics

The standard itself does not mandate a slashing primitive — it standardizes
feedback signal schema and identity registry. Reputation-as-stake systems
(where an agent posts collateral that can be slashed on default or on
proven bad behavior) are expected to be built *on top* of ERC-8004 by
marketplaces and insurance providers.

### 5.8 Governance gating

- Multisig signers (with the WazirX caveat below — multisig is not magic)
- Timelocks (24h–7d) on parameter changes
- Veto-able execution windows
- Off-chain coordination (Snapshot) → on-chain ratification

### 5.9 Formal verification

- **Certora Prover** — open-sourced 2025; secured >$100B TVL across Aave,
  MakerDAO, Uniswap, Lido, EigenLayer, Morpho, Silo, Balancer and others.
  EVM + Solana + Stellar. Certora's "AI Composer" (Nov 2025) wraps the
  prover around AI-generated code as a verification gate.
- **K-framework / KEVM** — formal semantics of the EVM in the K framework,
  used for academic proofs and select production engagements.
- **Foundry invariant / fuzz testing** — not formal, but widely deployed.
- **Halmos / hevm** — symbolic execution.
Source: https://www.certora.com/
Source: https://www.certora.com/blog/certora-goes-open-source

### 5.10 Audit firms active in 2026

Pricing reference (per Sherlock's Mar 2026 market summary):
- **Top tier** ($80k–350k per scope): Sherlock, Cyfrin, OpenZeppelin,
  Trail of Bits, Spearbit
- **Mid tier** ($25k–80k): ChainSecurity, Halborn, Hacken, Quantstamp,
  QuillAudits, Zellic
- **Boutique** ($8k–25k): SourceHat, Pashov, dedaub, others
- **Crowd / contest**: Code4rena (zero platform fee, prize pools $37.5k–
  $500k+), Sherlock contests, Cantina

Specific firm rates:
- OpenZeppelin and Trail of Bits: $25k per engineer per week
- Spearbit: $32.5k–$48k per week for a team of 3–5 researchers
- Trail of Bits: known specialty in cryptography / ZK
- ChainSecurity: typical ERC-20 scope in 2–3 weeks; formal methods focus

Source: https://sherlock.xyz/post/top-10-best-smart-contract-auditing-companies-in-2026
Source: https://sherlock.xyz/post/smart-contract-audit-pricing-a-market-reference-for-2026

### 5.11 Bug bounty platforms

- **Immunefi** — dominant. >$162M in available rewards across hundreds of
  programs. Largest single payout in crypto history is $10M (satya0x,
  Wormhole, 2022). 2026 ceilings:
  - Sky (formerly MakerDAO): $10M
  - Uniswap v4: $15.5M
  - USDT0: $6M
- **Sherlock** — runs both audits and ongoing bounties
- **Cantina** — competitive audits + bounties
- **HackenProof** — Hacken's bounty arm
Source: https://immunefi.com/bug-bounty/
Source: https://sherlock.xyz/post/best-web3-bug-bounties-in-2026-the-highest-paying-programs-on-every-platform

---

## 6. Mantle-specific security state

### 6.1 Mantle Network audits

- **Quantstamp** — audited Mantle bridge contracts (forks of Optimism
  bridge with MNT-handling extensions).
- **OpenZeppelin** — audited Mantle V2 (op-geth fork) and the Mantle token
  + bridge.
Source: https://www.openzeppelin.com/news/mantle-op-geth-audit
Source: https://www.openzeppelin.com/news/mantle-token-and-bridge-audit

### 6.2 KelpDAO incident — April 2025 / April 2026

Two distinct events. The April 2025 KelpDAO security incident was contained
to KelpDAO's own contracts; Mantle confirmed zero loss from its treasury,
bridge, or core protocol contracts. The April 2026 Kelp rsETH bridge
exploit (~$292M, LayerZero-based) is a larger event that cascaded into
Aave: AAVE token dropped ~10 percent on contagion fears, Aave froze rsETH
markets, and Mantle proposed a 30,000 ETH loan to Aave DAO to cover the
resulting bad debt — the proposal is conditioned on accelerating Aave's
deployment on Mantle.
Source: https://m.dailyhunt.in/news/india/english/bitcoin+world+news-epaper-btcinwld/mantle+network+stands+resilient+core+infrastructure+unscathed+by+kelpdao+security+breach-newsid-n709303960
Source: https://www.theblock.co/post/398735/mantle-proposes-30000-eth-loan
Source: https://cryptobriefing.com/mantle-loan-to-aave-cover-debt/

### 6.3 Lendle (Mantle's largest native lender)

Audited by SourceHat (formerly Solidity Finance) — September 2023, updated
on 25 Sep 2023 to cover Mantle mainnet deployment. The audit reported no
major findings but flagged centralization. Lendle is described as
shutting down in some 2026 sources.
Source: https://sourcehat.com/audits/Lendle/
Source: https://en.theblockbeats.news/news/44867

### 6.4 Aave on Mantle

As of mid-2026, Aave is not yet deployed on Mantle in its main V3 form —
the 30,000 ETH bad-debt-coverage proposal explicitly references
accelerating an Aave Mantle deployment as a strategic condition.

### 6.5 Bybit hack — 21 February 2025

$1.5B drained from Bybit cold wallet — largest crypto heist on record.
Attribution: FBI confirmed Lazarus Group (TraderTraitor / APT38). Root
cause: Safe{Wallet} UI compromise via a developer-machine breach.
Malicious JavaScript was injected into Safe's frontend, *only* for the
Bybit transaction signing flow. Bybit's three signers saw a legitimate-
looking transaction and approved a malicious one. The smart contracts were
not exploited; the interface that displays signing data was. Funds were
laundered through mixers in subsequent days.

Reputation residue: Byreal is a Bybit-built / Bybit-affiliated product.
Counterparty and reputation exposure to Bybit persists in any product that
treats Bybit infrastructure or branding as in-scope.
Source: https://www.nccgroup.com/research/in-depth-technical-analysis-of-the-bybit-hack/
Source: https://www.ic3.gov/psa/2025/psa250226
Source: https://www.csis.org/analysis/bybit-heist-and-future-us-crypto-regulation

### 6.6 WazirX hack — 18 July 2024

~$234.9M drained from a Liminal Custody multisig (3 of 4 WazirX signers
plus 1 Liminal signer). Root cause is the canonical *blind-signing*
exploit: the multisig was upgraded to a malicious implementation. Three
WazirX signers and one Liminal signer signed transactions whose true
payload they could not see — hardware wallets display ERC-20 transfer
details, but not arbitrary calldata of a Safe upgrade. Attackers used
phishing on two WazirX signers directly, and a fake Liminal UI for the
other two. Lazarus attribution per multiple sources.

Lesson is structural: any product whose AI agent or operator signs
non-trivial transactions inherits the blind-signing risk if the signing
surface (hardware wallet, UI) cannot render the semantic effect of the
calldata.
Source: https://en.wikipedia.org/wiki/2024_WazirX_hack
Source: https://www.blockaid.io/blog/the-230m-blind-spot-lessons-from-the-wazirx-hack
Source: https://www.halborn.com/blog/post/explained-the-wazirx-hack-july-2024

### 6.7 Mantle bridge security

The canonical Mantle bridge is a fork of the Optimism bridge with MNT
handling. It carries the standard L2 bridge risk surface (multisig over
upgrade keys, fault-proof window, sequencer liveness). No Mantle bridge
exploit has been reported as of June 2026. Bridge exposure for any
collateral that originates off-chain or on another L1/L2 still routes
through this contract.

---

## Closing note for downstream readers

Three attack vectors any architect of a collateralized BNPL + AI-agent +
ERC-8004 product *must reason about* (reasoning, not mitigating — the
purpose of this document is to make sure no one designs in ignorance of
these classes):

1. **Oracle dependency for yield-bearing / wrapped collateral.** USDe-style
   depeg, Mango-style spot manipulation, and Inverse-style TWAP
   under-sampling are all live and recurring. The choice of pricing
   surface for the yield-bearing leg of the collateral determines whether
   the protocol is correlated with one venue's order book during stress.

2. **Blind-signing the agent's intent.** Bybit and WazirX both prove that
   even a 3-of-4 multisig with hardware wallets can sign the wrong
   transaction if the signing UI can be manipulated. An AI agent that
   originates transactions on a user's behalf compresses this risk: there
   is no separate signer who could catch a discrepancy. Prompt-injection
   plus calldata-opaque signing is the Grok / Bankrbot pattern at scale.

3. **Sybil and reputation washing on ERC-8004.** The standard itself
   acknowledges Sybil resistance is out of scope. Any product that treats
   ERC-8004 reputation as a credit primitive must reason about cost-per-
   identity, reciprocal-feedback collusion graphs, and identity-NFT
   transfer (the reputation moves with the NFT). Reputation as collateral
   without a stake-and-slash backstop is reputation as marketing.

Document ends.
