# Real-World Problem Signals — Mantle Turing Test 2026 Wedge

**Captured:** 2026-06-02
**Subagent:** problem-signals
**Tooling note:** sahil-x scripts broken on Python 3.14 (dotenv/pyexpat fail) — confirmed unusable. WebSearch + WebFetch used exclusively. Reddit + Trustpilot returned HTTP 403 to WebFetch, so reddit-direct user-quotes are weaker than ideal — we relied on news-aggregation, ConsumerReports, Capterra, Trustpilot summaries, and Sikayetvar (the Turkish complaint site) summaries pulled via WebSearch.

## Sources scanned
- ConsumerReports remittance apps testing report (Sept 2025): https://www.consumerreports.org/money/digital-payments/remittance-apps-high-costs-hidden-fees-privacy-concerns-a428-a4287935586/
- Capterra Remitly reviews 2026: https://www.capterra.com/p/234233/Remitly/reviews/
- Sikayetvar Remitly complaints aggregator (verbatim user complaint texts surfaced via WebSearch summary)
- Trustpilot Western Union (snippets via WebSearch only — direct fetch blocked)
- Sendwave troubleshooting blog (Nov 2025): https://www.sendwave.com/en/blog/product/troubleshoot-sendwave-app-issues
- 99Bitcoins Ethena USDe depeg coverage: https://99bitcoins.com/news/altcoins/ethena-usde-8b-outflows/
- Netcoins USDe depeg explainer: https://www.netcoins.com/blog/ethenas-usde-depeg-an-overview-and-its-relation-to-the-ena-token
- DLNews on USDe TVL collapse: https://www.dlnews.com/articles/defi/ethena-usde-supply-plummets-as-traders-cool-on-risky-crypto-bets/
- Coin Bureau blind-signing primer: https://coinbureau.com/education/what-is-crypto-blind-signing
- Ledger Academy clear-signing: https://www.ledger.com/academy/topics/ledgersolutions/ledger-live-clear-signing-the-safest-way-to-approve-crypto-transactions
- Rise crypto-payroll guide: https://www.riseworks.io/blog/complete-guide-to-crypto-payroll-in-2026
- RebelFi Southeast Asia stablecoin corridors: https://rebelfi.io/blog/stablecoin-payments-southeast-asia-yield-corridors
- BusinessMirror PH OFW remittance editorial (Feb 2026): https://businessmirror.com.ph/2026/02/20/a-1-wake-up-call-us-remittance-fee-threatens-ofws-and-philippine-economy/
- Manila Bulletin OFW remittance fees waiver story (Mar 2026): https://mb.com.ph/2026/03/18/house-backs-sandro-marcos-call-to-waive-ofw-remittance-fees-amid-middle-east-crisis
- CoinDesk AI-agent wallet security gap (Apr 2026): https://www.coindesk.com/tech/2026/04/13/ai-agents-are-set-to-power-crypto-payments-but-a-hidden-flaw-could-expose-wallets
- DailyCoin agentic commerce security: https://dailycoin.com/ai-agents-beyond-demos-agentic-commerce-agent-security
- Bitcoinist AI agent transaction data: https://bitcoinist.com/crypto-payments-go-autonomous-as-ai-agents-execute-176m-transactions/
- DEV.to pay-per-call MCP server: https://dev.to/kirothebot/i-built-a-pay-per-call-mcp-server-heres-what-the-agent-payment-stack-actually-looks-like-5a5o
- Aiseosa Uyi-Idahor Aave UX walkthrough (Medium): https://medium.com/design-bootcamp/a-ux-walkthrough-of-aave-protocol-52241dd7b0c3
- OnChain Treasury multisig best-practices (Sept 2025): https://onchaintreasury.org/2025/09/19/best-practices-for-multisig-wallets-in-dao-treasury-management/
- CoinLedger Koinly vs CoinTracker complaints: https://coinledger.io/tools/koinly-vs-cointracker
- Visa 2025 Digital Remittances Adoption Report: https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.21526.html

## Top 10 problems (ranked by pain × demo-ability)

### 1. Western Union / Remitly transfer "stuck for days" with no explanation (US→PH, US→India, US→Mexico corridors)
- **Pain level (1-5):** 5 — viral, repeated, with families literally going hungry waiting
- **Population affected:** ~200M migrants globally; $860B/yr global remittance flow; ~10M OFW households alone
- **Representative quotes:**
  - Martha Enriquez, 58, retired CA farmworker (ConsumerReports Sept 2025): *"Sometimes I have to skip buying groceries or other things to be able to send them money."* / *"I make sacrifices, and sometimes I'm left without money. But, oh well, they're family."* — https://www.consumerreports.org/money/digital-payments/remittance-apps-high-costs-hidden-fees-privacy-concerns-a428-a4287935586/
  - Remitly user via Sikayetvar (Mar 2026): *"I sent €20 through Remitly on March 20, 2026 — after several days the money still hadn't reached the account and the estimated delivery date kept getting pushed back."* — https://www.sikayetvar.com/en/remitly-us/remitly-delayed-20-transfer-and-keeps-changing-delivery-date
  - Remitly user (Sept 2025): *"€1,260 transfer made on September 4, 2025 with a guaranteed delivery date of September 8, 2025 — still had not arrived by that date."* — same source
  - Sendwave's own admission (Nov 2025): *"When your family is counting on you to send money home, a stalled Sendwave transfer can feel like an emergency."* — https://www.sendwave.com/en/blog/product/troubleshoot-sendwave-app-issues
  - Western Union user on Trustpilot: *"A transaction made on October 3rd remained incomplete a month later — the bank processor claims to have the money but Western Union does nothing and won't respond helpfully."*
- **What's broken:** SWIFT correspondent-banking dependency, compliance hold loops, FX rate locking against next-day settlement risk, opaque KYC re-checks
- **Why no one has fixed it:** correspondent-banking moat (incumbent infra), regulatory licensing per-corridor, FX risk capital. New 1% US federal remittance tax (Jan 1, 2026) makes the wound bleed harder
- **Web3-agent fix sketch:** Agent monitors recipient's expected balance; auto-routes USDC over Mantle → P2P off-ramp (Binance P2P / Indodax / GoPay) the moment sender approves; agent shows side-by-side "Western Union quoted you $X over 5 days, agent delivered $Y in 6 minutes — here's the txid"
- **Verifiability hook:** "Send $200 US→Philippines. WU charges $14 fee + ~3% FX spread + 3-day wait. Our agent: $0.40 gas + 0.1% spread, settled in 4 min. Both proofs on stage."
- **Track fit:** Track 6 (Agentic Economy); partial Track 3 if you tokenize the receivable
- **Demo dramatic in 90s?** YES — race a real WU transfer vs the agent live on stage

### 2. Ethena USDe depeg trauma — retail can't tell when their "stablecoin yield" is about to blow up
- **Pain level (1-5):** 5 — public Oct 11 2025 event, $8.3B outflow, USDe hit $0.65 on Binance
- **Population affected:** ~$7.6B in USDe (down from $14.8B), plus all stablecoin yield seekers (~$50B+ TVL)
- **Representative quotes:**
  - Netcoins post-mortem: *"Ethena's USDe depegged during the Oct 11, 2025 crypto crash, dropping to $0.65 on Binance."* — https://www.netcoins.com/blog/ethenas-usde-depeg-an-overview-and-its-relation-to-the-ena-token
  - Industry commentary: *"The complexity of the protocol scared people, and USDe went to $0.65 on one major exchange before recovering."*
  - DLNews: *"Ethena's USDe sheds 40% of supply as traders cool on risky crypto bets."* — https://www.dlnews.com/articles/defi/ethena-usde-supply-plummets-as-traders-cool-on-risky-crypto-bets/
  - 99Bitcoins: *"Ethena USDe sees $8.3B outflow amid October crypto crash."*
- **What's broken:** Synthetic dollar yields depend on funding rates, exchange solvency, oracle freshness. Retail buys it as "stablecoin" without realizing it's a delta-neutral basis trade
- **Why no one has fixed it:** Yield-bearing labels aren't standardized; risk disclosure is buried in docs; CEXs list USDe right next to USDC
- **Web3-agent fix sketch:** Agent watches funding rates, perp basis, exchange wallet flows, and oracle deviation across CEX/DEX. Pre-rotates user out of USDe → USDC on Mantle when risk score crosses threshold. "Your AI bodyguard for stablecoin yields."
- **Verifiability hook:** Live demo: replay Oct 11 oracle data; agent rotates user out at 11:32am; user net result vs hold. Verifiable on-chain.
- **Track fit:** Track 3 (AI x RWA — synthetic-dollar risk monitoring counts) + Track 6
- **Demo dramatic in 90s?** YES — replay the depeg, watch agent save user in real time

### 3. Blind signing — users approving transactions they cannot read
- **Pain level (1-5):** 5 — Bybit $1.5B (Feb 2025), WazirX ~$235M, Phantom Solana scam $1.5M (May 2025)
- **Population affected:** Every Ledger / hardware wallet user signing into a complex dApp — 10M+
- **Representative quotes:**
  - Ledger Academy: *"Blind signing means approving a transaction when your wallet only shows a hash or 'Data Present,' not readable details... Bybit's $1.5B loss in 2025 and WazirX ~$235M happened because of blind signing."* — https://www.ledger.com/academy/cryptos-greatest-weakness-blind-signing-explained
  - Coin Bureau: *"Phantom Wallet's default signature prompt failed to clearly display the transaction's true intent... $1.5M in losses."* — https://coinbureau.com/education/what-is-crypto-blind-signing
- **What's broken:** dApp calldata isn't human-readable; wallet UIs show hex; users approve to make the popup go away
- **Why no one has fixed it:** Ledger's Clear Signing requires per-dApp parser plugins; no universal explanation layer
- **Web3-agent fix sketch:** Pre-sign interception agent — every tx routed through an LLM that translates calldata to plain English + flags anomalies ("This is an unlimited token approval to a contract created 2h ago — REJECT?")
- **Verifiability hook:** Stage demo: paste a known drainer-contract tx into the wallet, agent intercepts, explains "this would transfer all your USDC to 0xfeed..." — refuse. Audience sees the catch.
- **Track fit:** Track 6 (Agentic Wallets)
- **Demo dramatic in 90s?** YES — "AI saves the audience volunteer from getting drained"

### 4. Crypto-payroll for international freelance workers — $75-$100 per wire, 3-5 days
- **Pain level (1-5):** 4
- **Population affected:** 60% of freelancers paid in crypto at least once in 2025; ~60M global freelancers
- **Representative quotes:**
  - Rise: *"A single international wire transfer can cost $50–$100 and take up to a week to settle... for a company making 50 freelancer payments per month, this translates to $3,750–$5,000 in monthly transfer fees before accounting for FX spreads."* — https://www.riseworks.io/blog/complete-guide-to-crypto-payroll-in-2026
  - Rise: *"This unpredictability erodes trust and creates friction in the working relationship."*
- **What's broken:** SWIFT compliance review, intermediary banks, weekend stalls
- **Why no one has fixed it:** Wise/Payoneer have it half-fixed but don't cover all corridors; crypto-payroll tools (Rise, Bitwage, Request) still ask employer to learn 5 things
- **Web3-agent fix sketch:** Agent payroll: founder uploads a CSV ("@alice $4k, @bob $2.5k"), agent fans out USDC over Mantle, surfaces per-contractor proof + tax doc, auto-handles FX conversion
- **Verifiability hook:** Stage: pay 5 demo contractors in 5 countries in <30sec. Show identical SWIFT quote would be $375 fees, 4 days.
- **Track fit:** Track 6
- **Demo dramatic in 90s?** YES — visible "global payroll in 30 seconds" moment

### 5. AI-agent crypto wallets create unowned liability + security gaps
- **Pain level (1-5):** 4 — emerging in 2026, security researchers loudly warning
- **Population affected:** 104,000+ agents registered by Q1 2026; $70M+ already moved across 176M agent transactions
- **Representative quotes:**
  - CoinDesk (Apr 2026): *"As AI agents scale in crypto, researchers warn of a critical security gap."* — https://www.coindesk.com/tech/2026/04/13/ai-agents-are-set-to-power-crypto-payments-but-a-hidden-flaw-could-expose-wallets
  - DailyCoin: *"26 routers secretly injecting malicious tool calls, stealing credentials and draining a client's crypto wallet of $500,000."* — https://dailycoin.com/ai-agents-beyond-demos-agentic-commerce-agent-security
  - McKinsey (cited): *"80% of organizations have already observed risky AI agent behaviors, including unauthorized data exposure and privilege escalation."*
  - BlueRock Security 2026: *"36.7% of public MCP servers are SSRF-vulnerable; 41% require no authentication at all; 53% rely on static API keys."*
- **What's broken:** Agents hold private keys, no spend caps, no policy engine; tool injections drain wallets
- **Why no one has fixed it:** Standards (x402, MPP) are 6 months old; policy/guard rails layer doesn't exist
- **Web3-agent fix sketch:** Mantle-native "agent passport" — every agent gets bounded spend policy (per-tx cap, daily cap, allowlist of receivers), enforced on-chain. Compromised agent can't drain.
- **Verifiability hook:** Live: malicious-tool injection demo, naive agent gets drained for $X, policy-wrapped agent rejects same call with proof.
- **Track fit:** Track 6 (clean fit)
- **Demo dramatic in 90s?** YES — visible "two agents enter, one survives"

### 6. DAO / crypto-native treasury — multisig signers asleep, no automation
- **Pain level (1-5):** 3-4 — chronic, not viral
- **Population affected:** 12K+ DAOs, plus every crypto-native startup with multisig (50K+)
- **Representative quotes:**
  - OnChain Treasury (Sept 2025): *"DAOs deal with numerous transactions, and managing them across spreadsheets, Discord messages, and individual wallet transfers is a recipe for errors and lost funds."* — https://onchaintreasury.org/2025/09/19/best-practices-for-multisig-wallets-in-dao-treasury-management/
  - Same: *"Managing a DAO treasury means juggling manual processes, fragmented tools, and constant coordination overhead, with proposals sitting pending while signers are asleep and no single pane of glass across all the Safes."*
- **What's broken:** Coordination cost, timezone mismatch, no rule-based auto-execution
- **Why no one has fixed it:** Safe is a primitive, not a workflow tool. Den, Squads, Utopia exist but still need humans.
- **Web3-agent fix sketch:** Agent treasurer — policy-gated auto-approver for recurring payroll/grants/yield rotations, with on-chain audit log
- **Verifiability hook:** "DAO X pays 30 contributors monthly — old way: 3 signers, 2 days, 30 manual confirms. Agent: 1 approval, all done in 6 min."
- **Track fit:** Track 6
- **Demo dramatic in 90s?** MAYBE — less visually punchy than #1-3

### 7. Pendle PT/YT — yield product retail can't actually understand
- **Pain level (1-5):** 3
- **Population affected:** Pendle TVL $5B+; retail-curious group ~100K
- **Representative quotes:**
  - Crypto.com Research (May 2025): *"PT and YT are conceptually elegant, but they are not beginner-simple. A new user who only wants passive yield may find Pendle far more complicated than a standard lending market or staking interface."* — https://crypto.com/en/research/interest-rate-derivatives-pendle-may-2025
  - Same: *"PT can be misread as 'safe fixed yield' when it is really 'more predictable under normal conditions.' YT can be misread as a high-upside yield bet without enough appreciation for time decay."*
- **What's broken:** Yield-tokenization concepts (zero-coupon-bond decomposition) are bond-trader jargon
- **Why no one has fixed it:** Pendle UI is built for sophisticates; they own that lane
- **Web3-agent fix sketch:** Agent that answers "I want 8% APY on $5K USDC, max 10% drawdown" → picks Pendle PT-sUSDe Dec / Aave / Pendle YT-PYUSD combo, explains in English
- **Verifiability hook:** Show comparable APY vs Coinbase Earn (4%) and Aave (5.2%); user gets 8.1% with risk budget honored
- **Track fit:** Track 3 (AI × RWA if positioned around tokenized treasuries)
- **Demo dramatic in 90s?** MAYBE — depends on staging

### 8. Indonesia/Vietnam informal USDT remittance — works but recipient pain
- **Pain level (1-5):** 3-4
- **Population affected:** 9M+ Filipino OFWs, 2M+ Indonesian, 600K+ Vietnamese migrant workers
- **Representative quotes:**
  - RebelFi: *"Workers in Malaysia, Saudi Arabia, Hong Kong, Taiwan, and Singapore buy USDT locally and transfer it directly to a family member's wallet in Indonesia, with the recipient selling on Binance P2P or Indodax, with funds landing in a local bank account or GoPay."* — https://rebelfi.io/blog/stablecoin-payments-southeast-asia-yield-corridors
  - RebelFi: *"In Indonesia, crypto is classified as a 'digital financial asset' — not a payment method — meaning recipients must convert through licensed exchanges."*
- **What's broken:** Last-mile off-ramp is manual P2P with rate negotiation
- **Why no one has fixed it:** Regulatory ambiguity; off-ramp KYC bottleneck
- **Web3-agent fix sketch:** Agent that auto-finds best P2P rate, executes the on-ramp/off-ramp leg, hands recipient local-currency confirmation
- **Verifiability hook:** Side-by-side fee comparison, real corridor, on-chain proof
- **Track fit:** Track 6 + Track 3
- **Demo dramatic in 90s?** YES — APAC judge appeal

### 9. Crypto tax software (Koinly, CoinTracker) mislabels transactions for DeFi users
- **Pain level (1-5):** 3
- **Population affected:** ~30M crypto-tax filers globally
- **Representative quotes:**
  - CoinLedger comparison page: *"Some Koinly customers complain that the platform mislabels transactions, does not make it easy to re-classify transactions manually for tax purposes, and takes time to sync with some crypto accounts and wallets."* — https://coinledger.io/tools/koinly-vs-cointracker
  - Same: *"CoinTracker's customers have expressed frustration with the platform, with reviews complaining about bugs and difficulty classifying different transaction types."*
- **What's broken:** ABI parsing for novel DeFi protocols lags behind protocol releases
- **Why no one has fixed it:** Long tail of contracts; tax-software vendors don't have agent infra
- **Web3-agent fix sketch:** Agent that reviews + reclassifies your tx history monthly, with a Mantle-stored audit trail
- **Verifiability hook:** Less demo-friendly (boring)
- **Track fit:** Track 6 (weak)
- **Demo dramatic in 90s?** NO

### 10. Nansen / Arkham pro-vs-retail data asymmetry
- **Pain level (1-5):** 3
- **Population affected:** ~500K active on-chain traders, ~10M curious retail
- **Representative quotes:**
  - Industry coverage: *"Access to Nansen's advanced features can be prohibitively expensive for many retail investors... Nansen's pricing starts at $150/month."* — https://onchainstandard.com/guides-education/track-whales-using-chain-analytics-tools/
  - Same: *"Casual investors find the platform too expensive."*
- **What's broken:** Smart-money labels + UI are gated; retail can't justify $1,800/yr
- **Why no one has fixed it:** Nansen's moat is wallet labels + brand. Competitor Arkham offers cheaper but different UX.
- **Web3-agent fix sketch:** Free "smart-money copilot" — agent watches a small set of labeled wallets, summarizes what they're doing in English, alerts retail
- **Verifiability hook:** Backtest vs ETH spot return
- **Track fit:** Track 6
- **Demo dramatic in 90s?** MAYBE

## Sleeper problems (5)

- **Mantle's own bridge UX** — Coin Bureau noted RPC rate-limit issues + withdrawal delays. Could be the "fix your host chain's wedge" angle: agent that handles bridge retries + gas budgeting + receipt monitoring. Demo: bridge $500 to Mantle in 1 click, agent handles all 4 edge cases. (https://docs-v2.mantle.xyz/devs/dev-hubs/quick)
- **Ondo USDY non-US accessibility** — $50 min, no accreditation needed for non-US, but onboarding still requires KYC + wallet setup. Agent-led onboarding flow. (https://docs.ondo.finance/general-access-products/usdy/faq/eligibility)
- **USDC yield discovery** — retail genuinely doesn't know where to park USDC for yield safely. "Where do I park $5K USDC and not get rugged" is a recurring question.
- **MCP server auth chaos** — 41% of MCP servers have no auth, 53% use static API keys (BlueRock 2026). Agent that manages your MCP credential vault on-chain. Niche but demo-friendly.
- **Korea/Japan capital-controls + crypto** — diaspora workers in Japan can't legally remit via crypto; FSA restrictions. Less demo-friendly but a giant latent market — likely outside the 13-day window.

## Cross-cutting themes

1. **Trust-with-receipts is the killer feature.** Every loud complaint above is fundamentally "I sent money and didn't know what happened to it." Crypto+agents fix this by making the receipt verifiable on-chain in real time. The winning wedge will make this trust gap visible-in-90s on stage.
2. **Stablecoins are the substrate; the pain is in the wrapper around them.** USDC/USDT/USDe themselves are fine. The pain lives in the 3-step flow around them (on-ramp → bridge → action → off-ramp). Every demo-ready opportunity above collapses that wrapper.
3. **Hashed's "stablecoins + AI agents" thesis is grounded in real complaints.** This is not a forced narrative; the Western Union / Remitly / Sendwave + USDe + blind-signing complaints are all current and quoted publicly.
4. **APAC corridors have the biggest user base + judges-from-APAC alignment.** PH, ID, VN have loud user pain + active legislation (Mar 2026 OFW Remittance Protection Act).
5. **The Demo-Day "Human vs AI" mechanic favors wedges where the AI agent is provably faster, cheaper, or safer.** Remittance speed, blind-signing catches, agent-policy enforcement all stage well. Tax software does not.

## What NOT to chase

- **General-purpose "AI portfolio manager."** Crowded, no moat, hard to demo a 90s improvement.
- **Tokenized real estate.** Track 3 fit but regulatory moat + 13-day window = impossible.
- **CBDC integration.** Sponsor narrative might suggest it but build complexity + regulator dependence kill it.
- **Pure copytrading bot.** Already commoditized; doesn't ride the Mantle / agent narrative.
- **Tax software.** Boring on stage; no visible AI moment.
- **Capital-controls workarounds (Korea/China/Japan FSA).** Real pain but regulatory liability is a kill-switch for a hackathon project.
- **Agent-to-agent coordination "operating system" plays.** Conceptually pretty but no concrete user pain quoted in the wild yet — judges will smell that.

## Data gaps to flag
- Direct Reddit threads inaccessible via WebFetch (HTTP 403). Reddit verbatim user quotes are second-hand via news aggregators.
- X/Twitter direct quotes also inaccessible — sahil-x scripts confirmed broken. WebSearch returns mostly news pages quoting tweets rather than tweets themselves.
- For final pitch deck, recommend Abu pull 2-3 X quotes manually from his logged-in browser for direct stage citations (especially OFW pain — there's a known Facebook/TikTok genre of "Day X of waiting for my Western Union" videos that's not indexed by web search).
