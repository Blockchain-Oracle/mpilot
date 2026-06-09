# Web2 AI Product Inspirations — Mantle Turing Test 2026 Wedge

**Captured:** 2026-06-02
**Subagent:** web2-inspirations
**Hackathon deadline:** 2026-06-15 15:59 UTC (13 days)

## Mission recap
Find Web2 AI products (2024–2026) with real users/revenue/PMF solving a finance/wallet/commerce/RWA/treasury problem, where a Web3-agent version would be MEANINGFULLY better (verifiable, composable, yields-while-waiting, 24/7, cross-currency, user-owned data). Bias toward things buildable in 13 days on Mantle (Track 3 = AI×RWA, Track 6 = Agentic Wallets via Byreal Skills CLI).

## Sources scanned
- Klarna AI assistant — twig.so case study, customerexperiencedive, mlq.ai (post-IPO admission)
- Robinhood Cortex — robinhood.com newsroom, axios, sahmcapital
- Wealthfront / Betterment — sacra, Wealthfront S-1, condorcapital
- Cash App Moneybot — techcrunch (2025-11-13), bravenewcoin, yahoo finance
- Public.com AI agents / direct indexing — axios (2025-11-17), public.com/ai-agents, financemagnates
- Ramp Treasury + AI agents — ramp.com/blog, fastcompany 2026, prnewswire $32B valuation
- Mercury Bill Pay AI + Central acquisition — mercury.com/bill-pay, thepaypers
- Brex AI / Capital One acquisition — brex.com, fintechlabs
- Cleo conversational finance — plaid blog, mindstudio ($280M ARR 7M users)
- Rocket Money — rocketmoney.com (5M+ members), bankrate
- Intuit TurboTax AI — investors.intuit.com, mit sloan review, intuit-openai $100M
- Paytm AI revamp — businesstoday, business-standard, analytics india ($Groq)
- GCash — finextra (90M Filipinos / 90% adult population)
- Wise / Revolut — wise.com, miracuves (Wise 16M users, Revolut 35M users)
- Sendwave Pay / Wallet USDC — Sendwave product pages, banking dive
- Ondo USDY — rwa.xyz, ondo.finance, $3B TVL as of April 2026
- Pendle PT/YT + GAIB AI helper — pendle docs, medium "Pulse AgentFi"
- Klarna+Affirm × Google/Stripe agentic commerce (UCP) — digitalcommerce360, pymnts
- Perplexity Comet vs Amazon legal battle — decrypt, geekwire, pymnts
- Coinbase AgentKit / x402 — coinbase.com/developer-platform, theblock, kucoin
- Greenlight kids AI — greenlight.com, marriagekidsandmoney
- Anthropic finance agents (10 pre-built, May 2026) — anthropic.com/news/finance-agents, pasqualepillitteri
- Frec direct indexing — frec.com, wealthmanagement.com
- Toss / Korea robo — kenresearch, statista, crunchbase

---

## Top 10 Web3-port candidates (ranked by translation viability)

### 1. Cash App Moneybot
- **Company / parent:** Block (Square)
- **Real users:** Cash App has ~57M MAU as of 2025; Moneybot launched November 2025 in beta — surfaces transaction insights and CAN PLACE TRADES (stocks/crypto) from a text prompt
- **PMF signal:** Public company, $14B+ rev run-rate from Cash App segment; Moneybot is its biggest UX bet since 2013
- **What it does:** Conversational AI that reads your transactions, makes spending suggestions, and EXECUTES stock/BTC trades from natural-language prompts
- **Why users like it:** Replaces 4 separate menus (transfer, trade, budget, request) with one chat; promise of "self-driving money"
- **Web3-agent gap:**
  - Moneybot is opaque — no proof of why it traded what it traded
  - Closed garden: USD only, US-only stocks
  - No yield-while-idle (cash sits)
  - No composability with DeFi / RWA
- **Web3-agent translation:** "Moneybot for Mantle stablecoin wallets" — user types "swap $500 USDC for USDY, hedge with mETH put on Byreal" → agent executes on Mantle, posts ERC-8004 attestation of decision rationale + on-chain receipt. Cross-chain via Mantle settlement + Byreal Solana perps.
- **Track placement:** Track 6 primary, Track 3 strong overlap (USDY/mUSD/MI4 routing)
- **Riskiest assumption:** Can a 13-day agent actually understand "hedge with put" reliably enough for live demo without face-planting?
- **Live-demo dramatic in 90s?** YES — type one line, watch USDC→USDY→perp hedge execute with verifiable receipts. Beats Moneybot's "here's a tip" output.

### 2. Cleo (conversational AI personal-finance coach)
- **Company / parent:** Cleo AI Ltd (UK, Series C)
- **Real users:** 7M+ users, $280M ARR, 74M conversations in 2024, 118% YoY growth; "self-driving money" multi-agent launching Feb 2026
- **PMF signal:** Profitable, viral on TikTok with Gen Z, ARR doubling annually
- **What it does:** Sassy chatbot that roasts your spending, helps budget, offers cash advances
- **Why users like it:** Personality + accountability; feels like a friend not a dashboard
- **Web3-agent gap:**
  - Earnings sit in checking — no yield on cash buffer
  - Cash advance has 30%+ APR equivalent in fees
  - No portability — leave Cleo = lose history
- **Web3-agent translation:** "Cleo for stablecoin wallets" — agent that holds your USDC/mUSD, sweeps idle balance into USDY (5.3% APY), gives short-term loan against USDY collateral instead of payday-loan-style cash advance. ERC-8004 identity = portable financial history NFT.
- **Track placement:** Track 3 (RWA-as-yield-cushion) + Track 6 (agentic wallet)
- **Riskiest assumption:** Do Gen Z users care about 5% yield vs Cleo's gamified UX? Demo must show the yield-while-you-chat visibly.
- **Live-demo dramatic in 90s?** YES — split screen: Cleo (zero yield) vs Mantle Cleo (yield accruing on screen)

### 3. Rocket Money bill-negotiator AI
- **Company / parent:** Rocket Companies (NYSE: RKT)
- **Real users:** 5M+ members; ranks in top 10 finance apps in App Store
- **PMF signal:** Charges 35–60% of first-year savings — works because users won't haggle themselves
- **What it does:** AI scans subscriptions, one-click cancel; "concierge negotiation" with utility/cable companies on user's behalf
- **Why users like it:** Pure ROI — pay a cut of savings, never deal with cancellation hold music
- **Web3-agent gap:**
  - Web2 subs require human-in-loop with reps
  - No standard for "agent acts as customer" — Klarna/Affirm just shipped UCP for this (May 2026!)
  - Negotiation logic is opaque
- **Web3-agent translation:** "Verifiable subscription-killer agent" — agent reads on-chain recurring payments (streaming via Sablier/LlamaPay), uses x402/UCP to negotiate with merchant agents, posts attestation of savings to ERC-8004 identity. Hook: agent-vs-agent negotiation is live and watchable.
- **Track placement:** Track 6 primary
- **Riskiest assumption:** Are there enough on-chain subscriptions to negotiate against? Maybe combine with mock merchant agent for demo.
- **Live-demo dramatic in 90s?** YES — show two agents arguing over a renewal fee, both signing on Mantle. Judges from Virtuals/Animoca have NOT seen this.

### 4. Public.com AI Investment Agents (custom no-code)
- **Company / parent:** Public Holdings, Inc.
- **Real users:** ~3M+ funded accounts; raised $300M+ total, Series D
- **PMF signal:** Launched user-built AI investing agents (Nov 2025) — direct indexing on $1,000 minimum (vs $100K elsewhere); AI Wealth Manager coming early 2026
- **What it does:** Users can build no-code AI agents that auto-trade based on conditions ("buy dips of NVDA", "rebalance monthly")
- **Why users like it:** Robo-advisor flexibility WITHOUT $100K minimums; auto-execute conditional logic
- **Web3-agent gap:**
  - Agents act in Public's walled garden — can't compose with other brokers/protocols
  - "Index" is stocks-only, no DeFi assets, no RWA, no yield-stable mix
  - User-built strategies aren't verifiable to others (can't follow a top trader's agent)
- **Web3-agent translation:** "Public.com for Mantle" — no-code AI agent builder where strategies are ERC-8004 identities. Build "buy dips of mETH below $X, route yield into USDY," and others can subscribe to your agent. Strategy provenance is on-chain. Verifiable copy-trading.
- **Track placement:** Track 3 (RWA index) + Track 6 (agent identity)
- **Riskiest assumption:** Does the agent-marketplace network effect kick in within 13 days? Probably no — but a SINGLE compelling agent demo is enough.
- **Live-demo dramatic in 90s?** MAYBE — "subscribe to this agent" needs at least 2 personas; live demo could be one user copying another.

### 5. Klarna AI assistant (post-walkback)
- **Company / parent:** Klarna (Nasdaq: KLAR, post-IPO July 2025, $19.65B valuation)
- **Real users:** 150M+ active consumers, 575K merchants worldwide; the AI took on 2.3M chats in 30 days
- **PMF signal:** $40M/year in avoided headcount cost; AI handled 67% of conversations BUT was walked back in 2025 because hallucinations on edge cases broke trust
- **What it does:** Handles refunds, disputes, account questions, payment plan changes
- **Why users like it (and why it broke):** Faster than humans on 95% of cases, fails on dispute/edge cases — "compliance concerns around AI autonomously handling disputes"
- **Web3-agent gap:**
  - Klarna's AI can't PROVE what it did — disputes spiral when AI says "I refunded you" but no receipt
  - No persistent customer identity across merchants
- **Web3-agent translation:** "Klarna AI with cryptographic receipts" — every action (refund, dispute, payment plan change) creates a signed attestation on Mantle. Customer can verify "this AI agreed to refund $X on 2026-06-01" via ERC-8004. Solves the trust gap that forced Klarna to rehire.
- **Track placement:** Track 6
- **Riskiest assumption:** Demo needs a believable merchant scenario; refund flow must be visible.
- **Live-demo dramatic in 90s?** MAYBE — refund execution is undramatic visually; the cryptographic-proof angle is more pitch than demo-able.

### 6. Mercury Bill Pay + Central AI payroll
- **Company / parent:** Mercury Financial (BaaS via Choice/Evolve)
- **Real users:** 200K+ business customers, $156B annual transaction volume (Nov 2025, +64% YoY)
- **PMF signal:** Acquired Central (AI-native payroll) 2025; now serves 73% non-tech customers
- **What it does:** AI extracts invoice data, auto-creates transfer rules from natural language, handles payroll without dashboard babysitting
- **Why users like it:** SMB founders hate finance ops — AI does it for them
- **Web3-agent gap:**
  - USD-only; founder companies operate globally but pay in fiat with 2-3 day wires
  - No yield on idle balance until you click into Mercury Treasury (manual)
  - No cross-border instant settlement
- **Web3-agent translation:** "Mercury-for-stablecoin-startups" agent — reads vendor invoices, auto-routes USDC/mUSD payments globally, sweeps idle into USDY automatically, all visible on Mantle. Cross-border payroll in 30s vs 3 days. ERC-8004 identity = portable business reputation.
- **Track placement:** Track 6 primary, Track 3 (auto-USDY sweep)
- **Riskiest assumption:** Demo needs a "fake invoice + auto-pay + auto-yield-sweep" flow that fires in 90s.
- **Live-demo dramatic in 90s?** YES — invoice email → agent reads it → pays in USDC across chains → idle balance sweeps to USDY visibly on screen.

### 7. TurboTax/Intuit Assist (AI tax + ChatGPT integration)
- **Company / parent:** Intuit (NASDAQ: INTU)
- **Real users:** 40M+ TurboTax users; $100M OpenAI partnership integrates QuickBooks/TurboTax/Credit Karma into ChatGPT
- **PMF signal:** Filing time down 12%; AI matches users to 12,000 expert network; Intuit driving full agentic "done-for-you" tax filing
- **What it does:** AI does your taxes with human expert backup
- **Why users like it:** Taxes are the worst job a human does annually — AI takes it
- **Web3-agent gap:**
  - Web3 users have ZERO good tax software (Koinly/CoinTracker manual hell)
  - On-chain transactions are PUBLIC — AI can ingest natively, no Plaid scraping needed
  - Agent can keep running 365/yr, not just March-April
- **Web3-agent translation:** "Always-on AI tax accountant agent for on-chain identity" — agent watches your Mantle wallet 24/7, books gains/losses live, optimizes harvest opportunities, generates tax reports on demand. ERC-8004 = persistent client relationship across wallet rotations.
- **Track placement:** Track 6 + Track 3 (RWA cost basis tracking for USDY/mETH/mUSD)
- **Riskiest assumption:** Tax is jurisdiction-specific; demo would need to fake a believable scenario.
- **Live-demo dramatic in 90s?** NO — tax reports are boring on screen. Skip unless you find a viral hook.

### 8. Sendwave Pay (USDC remittance to Africa)
- **Company / parent:** Zepz (owns Sendwave + WorldRemit)
- **Real users:** Millions of users sending to Africa/Asia/Caribbean; Sendwave Wallet supports USDC-equivalent in 112 countries
- **PMF signal:** Already SHIPPING USDC rails for remittance — the on-chain version of remittance already has a Web2 leader
- **What it does:** Mobile-first, low-fee remittance with USDC-rails wallet
- **Why users like it:** 0.4% better FX, 25% lower fees vs Western Union
- **Web3-agent gap:**
  - Receiver must use Sendwave wallet — closed garden
  - No "send + auto-yield" while recipient figures out conversion
  - No verifiable timing — can take hours
- **Web3-agent translation:** "Remittance agent on Mantle" — sender prompts "send $200 to mom in Lagos every 1st of month, hold in USDY until she withdraws to NGN MoMo," agent handles cross-chain settlement + yield + off-ramp via Byreal/local-fiat partners. ERC-8004 identity preserved across both wallets.
- **Track placement:** Track 6 + Track 3 (USDY yield on float)
- **Riskiest assumption:** Off-ramp to local fiat is the hard part — Mantle doesn't have a fiat off-ramp network in West Africa.
- **Live-demo dramatic in 90s?** MAYBE — show the recurring sweep + yield accrual, but the off-ramp is faked.

### 9. Greenlight AI Assistant (kids investing + family finance)
- **Company / parent:** Greenlight Financial Technology (Series E, $2.3B valuation)
- **Real users:** 6M+ parents and kids
- **PMF signal:** $135M+ ARR; in-app AI Assistant answers kid investing questions ("what's an ETF?")
- **What it does:** AI tutors kids on stocks/ETFs, parents control via app
- **Why users like it:** Financial literacy + practical tools (allowance, chores, debit card)
- **Web3-agent gap:**
  - Kid never owns the rails — leaves family = loses portfolio
  - No on-chain proof of "I learned/did X" for college apps
  - No native exposure to global assets
- **Web3-agent translation:** "Greenlight-style agent + ERC-8004 kid identity" — child gets a portable on-chain learning agent that tutors via Claude, executes micro-investments in mUSD/USDY/mETH index, builds an attestation portfolio of "completed lessons + portfolio decisions." Lives with the kid forever.
- **Track placement:** Track 6
- **Riskiest assumption:** Kids+crypto is a regulatory/UX swamp. Probably build for adults' "next-gen Greenlight" angle instead.
- **Live-demo dramatic in 90s?** NO — kid demos hard to fake on stage believably.

### 10. Klarna/Affirm × UCP agentic commerce (Apr-May 2026 launches)
- **Company / parent:** Klarna + Affirm + Google + Stripe (Universal Commerce Protocol)
- **Real users:** Klarna 150M / Affirm 22M / Google AI Mode shoppers
- **PMF signal:** Just launched May 2026 — BNPL via AI shopping agent inside Gemini and ChatGPT. This is the most current Web2-AI movement and it's STILL not on-chain.
- **What it does:** AI agent shops on user's behalf, picks BNPL/installment plan, all through Google/Stripe rails
- **Why users like it:** Skip checkout, AI handles compare-and-pay
- **Web3-agent gap:**
  - UCP is custodial — Klarna/Affirm hold the credit; consumer doesn't own state
  - Merchants pay 4-7% (Affirm) — no on-chain alternative built yet
  - No "buy now, pay yield-while-waiting" — credit is one-way
- **Web3-agent translation:** "On-chain UCP-compatible agent that uses USDY collateral instead of credit" — instead of borrowing, agent pledges your USDY as collateral, pays merchant in mUSD, your collateral keeps yielding. Effectively BNPL with negative cost-of-funds. ERC-8004 = portable credit history across merchants without Klarna's middlemen.
- **Track placement:** Track 6 primary; Track 3 secondary (USDY-as-collateral)
- **Riskiest assumption:** Merchant integration in 13 days is hard. Demo as agent-vs-agent with a fake-merchant agent.
- **Live-demo dramatic in 90s?** YES — "Buy this $500 item, no debt taken, USDY keeps earning" is a punchy 90-second story. Judges will see UCP every day; on-chain version is differentiated.

---

## Honorable mentions

- **Wealthfront / Betterment AI rebalancing** ($94B and $65B AUM respectively) — translation: an agent that does direct-indexing on RWA + DeFi assets. Promising for Track 3, but live demo is boring (rebalancing isn't visual).
- **Robinhood Cortex** ($5/mo Gold subscribers, prediction-market integration) — translation: AI agent that explains its own trades on-chain and lets others copy. Cute but Cortex's "find me 5 stocks unfairly punished" prompt is hard to differentiate against in 13 days.
- **Ramp Treasury + AI agents** (45K customers, $32B valuation, $1B ARR) — translation: a Mantle agent for DAO treasuries that does same-day-yield with on-chain audit trail. Hard to demo without a believable DAO context.
- **Brex (post-Capital One acquisition $5.15B)** — see Mercury entry; very similar shape.
- **Cobo Agentic Wallet / x402 / Coinbase AgentKit** — these are RAILS, not products. Build ON them, don't recreate them. (Mantle has its own ERC-8004 stack — use it.)
- **Pendle (PT/YT) + GAIB AI helper** — translation: an AI agent that picks PT/YT/LP for the user based on risk preference. Strong Track 3 fit but assumes Pendle is on Mantle (verify).
- **Paytm AI revamp** (Indian super-app, AI-categorized spending) — translation: a Mantle agent that does Paytm-style insight but on stablecoin wallets. Good in pitch, hard to live-demo.
- **GCash** (90M Filipinos / 90% adult population) — translation: a Mantle-native super-app agent for emerging markets. Too ambitious for 13 days; cut scope to a single flow.
- **Anthropic's 10 finance agents (May 2026)** — directly competitive with anything we build. Use as inspiration shape (treasury agent, research agent, compliance agent) — pitch ours as ON-CHAIN + COMPOSABLE alternative.
- **Frec direct indexing** ($1K min, daily tax-loss harvest) — translation: same play as Public.com but with daily harvest. Strong if combined with USDY/mUSD basket.

---

## Cross-category patterns

1. **Web2 fintech AI in 2025-26 is converging on "conversational + autonomous"** — Cash App Moneybot, Cleo, Public.com AI agents, Cortex, Anthropic Finance, Intuit Assist all share the same shape: chat interface that EXECUTES, not just advises. Web3 has barely shipped this yet (Coinbase AgentKit is rails, not products).

2. **Agentic commerce is the May-2026 hot zone** — Klarna+Affirm+Google+Stripe just launched UCP-compliant agentic checkout. This is brand new and 100% custodial. An on-chain agent that uses RWA collateral instead of credit is a clear differentiation angle.

3. **The "user-built agent" pattern is emerging** — Public.com AI agents, Replit Agent 3, Anthropic Skills marketplace, Lovable. Users want to BUILD their own automations. Combine with ERC-8004 identity = portable, verifiable agent reputation. This is a Track 6 sweetspot.

4. **Yield-while-waiting is universal Web3 advantage** — Every Web2 product holds funds in 0% checking. The "your money earns yield while the agent waits" pitch maps to every category (remittance, BNPL, subscription mgmt, treasury, kids' allowance).

5. **Klarna walkback = trust gap** — When AI hallucinated on dispute edge cases, Klarna had to rehire humans. ERC-8004 attestations + signed agent actions solve the SPECIFIC bug Klarna couldn't fix.

---

## Anti-patterns (avoid these)

1. **Anything where the moat is regulatory licenses** — TurboTax (need jurisdiction-specific tax knowledge), Wise (cross-border money-transmitter licenses), Robinhood broker-dealer status. We can't replicate in 13 days.

2. **Bank-rail-dependent products** — Mercury, Brex, Cash App banking — all built on Sutton/Evolve/Choice. Pitching "we replace this" is a lie in 13 days. Instead pitch "we COMPLEMENT for the stablecoin-native segment."

3. **Kid-focused products** — Greenlight, Acorns Early. Regulatory swamp (COPPA), hard to demo live.

4. **Pure-research AI** — Bloomberg AI, Nansen AI. Judges include Nansen — competing head-on is suicide. Make sure your wedge is ACTION-oriented, not research-oriented.

5. **Anything that needs network effects to demo** — copy-trading agent marketplaces, subscription-to-other-people's-strategies. Cool pitch, but at hour 90 of build you have no users for a marketplace.

6. **Stocks-only products without an RWA angle** — Wealthfront / Frec / Public.com / M1. Judges care about Mantle's RWA assets (USDY, mUSD, mETH, MI4). A "stocks-on-chain" agent doesn't lean into the stack.

7. **Comet-style "browse and buy on Web2 sites"** — Amazon just won a court order against Perplexity Comet. This is a legal cliff. Stay agent-to-agent on-chain.

---

## Note on what's NOT here
- Did not deep-dive on Pix-Brazil-overlay apps (low time-to-research vs payoff)
- Did not enumerate every APAC super-app (GoPay, Maya, MoMo, Coupang Pay) — Paytm + GCash + Toss cover the pattern
- Did not investigate Curve gauge optimization (DeFi-native, doesn't fit "Web2 AI" mandate)

**End of subagent report. Upstream synthesis follows.**
