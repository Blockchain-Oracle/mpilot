# BNPL Landscape — Domain Knowledge Reference

*Reference material for a future product architect. Encyclopedia tone. No product recommendations.*

---

## 1. BNPL Mechanics — How It Actually Works

### Provider business models

**Klarna (Sweden, founded 2005).** Sweden-based digital bank and BNPL pioneer. Three primary consumer products: (a) *Pay in 4* — interest-free, 4 biweekly installments of 25% each, first payment due at checkout, range $35–$1,000; (b) *Pay in 30* — defer single payment 30 days; (c) *Financing* — longer-term installments (6–36 months) at APRs that may be 0% promotional or interest-bearing depending on merchant and underwriting. Klarna acts as merchant of record: it pays the merchant up front (minus fee), then collects from the consumer on its own schedule. [klarna.com/us/pay-in-4](https://www.klarna.com/us/pay-in-4/), [klarna.com/us/business/products/installments](https://www.klarna.com/us/business/products/installments/)

**Affirm (US, founded 2012).** Max Levchin's company. Differs from "Pay in 4" peers by emphasizing longer-term financing — 3, 6, 12, 24, 36-month installments with APRs from 0% (promo, ~$1,000 purchase at $84/mo over 12 mo) up to 36%. Eligibility checked at point-of-sale; "always shows total interest" up-front. Real-time eligibility check is a marketing pillar. [affirm.com/how-it-works](https://www.affirm.com/how-it-works), [businesshub.affirm.com 0% APR](https://businesshub.affirm.com/hc/en-us/articles/4418104503060-0-APR-Financing)

**Afterpay (Australia, founded 2014, acquired by Block 2022).** Pure Pay-in-4 model: 25% at checkout, then three biweekly payments. Now integrated with Cash App / Square ecosystem. No interest; late-fee revenue and merchant fees fund the model.

**PayPal Pay Later.** Same Pay-in-4 mechanic added as a default option inside the PayPal wallet. Anticipated 2025 volume ~$40B. [emarketer.com BNPL FAQ 2026](https://www.emarketer.com/content/faq-on-buy-now--pay-later--how-payment-trend-will-change-2026)

**Sezzle (US, founded 2016).** Pay-in-4 (25% × 4, six weeks total). Active in US, Canada, Brazil. Acquired-then-spun-around with Zip — Zip (formerly QuadPay, Sydney 2013) attempted to buy Sezzle in 2022 but deal fell through. [finovate.com Zip Sezzle](https://finovate.com/bnpl-consolidates-zip-to-buy-sezzle/), [en.wikipedia.org/wiki/Sezzle](https://en.wikipedia.org/wiki/Sezzle)

**Zip (Australia).** Operates across US/AU/NZ. Pay-in-4 and Zip Money (long-term, interest-bearing) variants.

### Revenue sources — where the money comes from

1. **Merchant discount fee (the big one):** 3.29%–5.99% + $0.30 per transaction at Klarna; ~6% + $0.30 at Affirm; UK Klarna rates 1.9%–2.9%. Custom pricing above $3M annual volume. [chargeflow.io Klarna vs Affirm](https://www.chargeflow.io/blog/klarna-vs-affirm-payments), [chargeblast.com merchant fees](https://www.chargeblast.com/blog/affirm-vs-afterpay-klarna-which-has-lower-merchant-fees)
2. **Consumer late fees:** Pay-in-4 products typically charge $7–$10 per missed installment. Banned in some jurisdictions.
3. **Interest income / financing fees:** Affirm's longer-term loans carry 10%–36% APR when not 0% promo. Klarna's interest-bearing book grew materially in 2025–26.
4. **Interchange / card revenue:** Klarna Card and Affirm Card act like debit/credit cards over the BNPL rail.
5. **Affiliate / advertising revenue:** Klarna's app surfaces merchants and takes a referral cut.
6. **Premium subscriptions / Affirm Plus / Klarna Plus tiers.**

### Unit economics

Industry rule of thumb: BNPL providers net ~3% of TPV after credit losses. Klarna FY 2024 revenue $2.81B on ~$105B GMV ≈ 2.7% take. Affirm FY 2024 revenue $2.32B on $36.7B GMV ≈ 6.3% take (longer-term financing rates lift it). [chargeflow.io BNPL stats 2026](https://www.chargeflow.io/blog/buy-now-pay-later-statistics)

### Default rates

Industry default rate sits ~1.8%–2.0% of GMV. CFPB found 34%–41% of users report at least one late payment. Klarna Q1 2026: credit-loss provisions 0.55% of GMV; US Financing 30+ DPD delinquencies down 36 bps from Q2 2025 peak; average Pay Later consumer balance $124 with book turning >10×/year. [stocktitan.net Klarna Q1 2026](https://www.stocktitan.net/news/KLAR/klarna-delivers-strong-start-to-2026-with-1bn-revenue-and-68m-adj-23rxzr1nispu.html)

### Risk underwriting — what data is used

- Soft credit pull (no FICO hard inquiry on Pay-in-4 typically)
- Email-history age and reputation signals (AtData, Ekata, Trulioo)
- Device fingerprint, IP geo-velocity, shipping/billing mismatch
- Internal Klarna/Affirm repayment history of the user
- Open banking / cash-flow underwriting where consented (Plaid in US, Tink/TrueLayer in EU)
- Soft checks have been a CCD II flashpoint — EU regulators view them as insufficient affordability assessment

---

## 2. The BNPL Market in 2024–2026

### TPV / GMV by provider

| Provider | Trailing GMV | Period | Notes |
|---|---|---|---|
| Klarna | $112B | TTM through Jun 30, 2025 | 114M customers; 2.7% take rate |
| Klarna | $33.7B | Q1 2026 alone | +33% YoY; 2026 target >$155B |
| Affirm | $36.7B | FY 2025 | 377k merchants |
| Block / Afterpay | $26.7B | Q1–Q3 2025 | Inside Cash App / Square |
| PayPal Pay Later | ~$40B | 2025 estimate | Embedded in wallet |
| **Global BNPL GMV** | ~$560B | 2025 | +13.7% YoY |
| **Global projection** | ~$995B | 2026 forecast | per eMarketer |

Sources: [chargeflow.io BNPL stats 2026](https://www.chargeflow.io/blog/buy-now-pay-later-statistics), [absrbd.com BNPL stats 2026](https://www.absrbd.com/post/bnpl-statitics), [richmondfed.org BNPL brief](https://www.richmondfed.org/publications/research/economic_brief/2026/eb_26-05)

### Geographic split

- **Sweden / Nordics:** Klarna heartland; ~50% of Swedish online checkout offers Klarna.
- **EU:** Heavy Klarna/Scalapay presence; CCD II catching everyone in scope from Nov 2026.
- **US:** Affirm + Klarna + Afterpay + PayPal Pay Later compete; biggest market.
- **UK:** Klarna leads; FCA regulation goes live July 15, 2026.
- **Australia:** Origination market for Afterpay/Zip; saturated.
- **APAC:** Atome (SEA), GrabPayLater, Kredivo (Indonesia), Akulaku, hoolah; rapid growth, sparser data.

### Consumer demographics

- Skews **Gen Z and millennial**. Research consistently finds women using BNPL more than men, and women carrying higher BNPL debt but reporting lower concern about it. [rsisinternational.org BNPL psychology](https://rsisinternational.org/journals/ijriss/articles/a-comprehensive-review-of-buy-now-pay-later-bnpl-influence-factors-on-young-consumer-spending-behaviour-in-e-commerce-platform/)
- Subprime tilt: BNPL approves ~78% of applications with subprime credit scores. [hostmerchantservices.com phantom debt](https://hostmerchantservices.com/2024/08/what-is-bnpl-phantom-debt/)
- Repeat-use is the norm; ~23% of Afterpay users say it helps them "stretch their budget." [retailbrew.com Afterpay](https://www.retailbrew.com/stories/2025/01/23/afterpay-bnpl-money-matters)

### Merchant categories

Apparel/fashion still #1 by volume. Home goods, electronics, beauty, and travel growing fastest. Walmart embedded Affirm; Amazon offers Affirm at checkout; Shopify natively integrates Affirm, Klarna, and Afterpay.

---

## 3. Klarna 2026 — The AI Agent Saga (Deep Dive)

### Timeline

**February 2024.** Klarna ships an OpenAI-powered AI customer service agent. PR claim: handles the work of **700 human agents**, projected **$40M/year savings**. Resolution time dropped 11 min → under 2 min. 2.3M conversations in first month across 35+ languages. [aibusiness.vc Klarna AI](https://aibusiness.vc/b2b/klarna-ai-replaces-700-agents), [twig.so Klarna AI](https://www.twig.so/blog/klarna-ai-customer-support-efficiency)

**Through 2024.** Workforce shrinks from ~7,000 to ~3,500. CEO Siemiatkowski tours the press circuit claiming AI doing human-equivalent work. Internal alarm bells go off: **repeat-contact rate climbs 25%** (i.e., the AI was closing tickets fast, not solving problems).

**May 2025.** CEO Siemiatkowski publicly reverses course in a Bloomberg interview: *"cost unfortunately seems to have been a too predominant evaluation factor"* and *"we went too far."* Klarna begins rehiring. Initial pilot: 2 freelancers. [mlq.ai Klarna admits AI cuts](https://mlq.ai/news/klarna-ceo-admits-aggressive-ai-job-cuts-went-too-far-starts-hiring-again-after-us-ipo/)

**September 2025.** Klarna IPO on NYSE (ticker KLAR). Internal staff redeployed to customer service.

**October 2025.** Google Cloud partnership announced; +50% customer orders metric promoted.

**Nov 25, 2025.** Klarna announces **KlarnaUSD** stablecoin on Tempo blockchain — first bank-issued token on the Stripe/Paradigm payment chain. Testnet only; mainnet 2026. Issued via Open Issuance by Bridge (Stripe-owned stablecoin infra). Stated rationale: cross-border payment cost reduction; cross-border fee market is ~$120B/year. [pymnts.com KlarnaUSD](https://www.pymnts.com/blockchain/2025/klarna-debuts-first-stablecoin-klarnausd-on-tempo-blockchain/), [theblock.co Klarna Tempo](https://www.theblock.co/post/380365/bnpl-firm-klarna-announces-usd-stablecoin-on-stripe-paradigms-tempo-blockchain-to-cut-payment-costs), [ledgerinsights.com Klarna stablecoin](https://www.ledgerinsights.com/bnpl-firm-and-bank-klarna-to-launch-dollar-stablecoin-in-2026/)

**February 2026.** Klarna shifts to "Uber-style" hybrid model: AI for simple queries, human agents (flexible-schedule contractors) for complex disputes. [mvidmar.substack.com Klarna rehire](https://mvidmar.substack.com/p/klarna-ai-60-million-saved-rehire-humans-2026)

**Feb 2, 2026.** Klarna publicly backs Google's **Universal Commerce Protocol (UCP)** — agentic-commerce open standard co-developed by Google and Shopify. [businesswire.com Klarna UCP](https://www.businesswire.com/news/home/20260202720690/en/Klarna-Backs-Googles-Universal-Commerce-Protocol-UCP-to-Enable-Agentic-Commerce-Across-Platforms)

**March 2026.** Stripe expands agentic-commerce offerings through Affirm and Klarna. [digitalcommerce360.com Stripe agentic](https://www.digitalcommerce360.com/2026/03/04/stripe-affirm-klarna-agentic-commerce/)

**May 12, 2026 — Google Marketing Live.** Joint launch: Google + Klarna + Affirm bring UCP-compliant BNPL into AI shopping agents (AI Mode, Gemini app, Google Pay). Both BNPL integrations are built to the UCP spec. Quotes:
- Ashish Gupta (Google VP): payment options remain *"secure and reliable"*
- David Sykes (Klarna CCO): *"flexible payments become essential infrastructure for how people buy"*
- Vishal Kapoor (Affirm SVP): *"People deserve transparent, flexible financial options"*

[digitalcommerce360.com Affirm Klarna Google BNPL agentic](https://www.digitalcommerce360.com/2026/05/13/affirm-klarna-google-bnpl-agentic-commerce/), [searchengineland.com UCP expansion](https://searchengineland.com/google-expands-universal-commerce-protocol-and-launches-new-agentic-shopping-tools-478113)

### What "UCP" means

**Universal Commerce Protocol** — open standard from Google + Shopify defining how AI agents communicate with e-commerce platforms and payment providers for agent-initiated checkout. Extended in May 2026 to hotels, food delivery, and three new geographies. YouTube Shopping ads added as a UCP surface. [ppc.land UCP expansion](https://ppc.land/google-expands-ucp-to-hotels-food-delivery-and-three-new-countries/), [thekeyword.co UCP YouTube](https://www.thekeyword.co/news/google-ucp-checkout-youtube-shopping-ads)

### What went wrong with disputes

Documented failure modes:

- **Speed-over-quality optimization:** AI rewarded for ticket close-time, not resolution quality. Repeat-contact rate rose 25%. [mvidmar.substack.com](https://mvidmar.substack.com/p/klarna-ai-60-million-saved-rehire-humans-2026)
- **Hallucinations on edge cases** — confident-but-wrong answers about policy, fees, payment terms; estimated 5% of conversations degraded. In a financial-services context, "wrong answer about money" is a compliance problem, not a CSAT problem. [twig.so Klarna AI mistakes](https://www.twig.so/blog/what-klarna-got-wrong-about-ai-in-customer-support--and-how-they-fixed-it)
- **Compliance concern over AI autonomously handling disputes and account closures** — internal and external (regulatory) pressure. EU AI Act + forthcoming UK BNPL FCA regime were named explicit risk drivers. [techtonicshifts.blog Klarna AI disaster](https://techtonicshifts.blog/2025/09/14/the-buy-now-cry-later-company-learns-about-karma/)
- **Lack of auditability** — disputes and fraud cases needed reviewable decision trails. AI-only flow left thin evidence.
- **CSAT drops on complex/emotional tickets** — hardship, bereavement, fraud, account-takeover cases needed human empathy.

Sources: [ecommercegermany.com Klarna humans back](https://ecommercegermany.com/blog/ai-customer-service-klarna-human-support/), [blog.cobaltintelligence.com Klarna failed AI](https://blog.cobaltintelligence.com/post/klarnas-failed-ai-experiment-in-customer-service)

### Why this matters as proof of the "verifiable AI" thesis

The Klarna case is widely cited in 2026 as **the canonical enterprise cautionary tale for unaudited AI in financial workflows**. Executives evaluating AI workforce strategy in 2026 are increasingly required to explain how their approach avoids the Klarna outcome — i.e., how AI decisions about money are auditable, attributable, and reversible. Simultaneously, Klarna is at the center of the next agentic-commerce wave (UCP) — both the cautionary tale AND the lead adopter of agent-driven checkout. ERC-8004 (see §4) explicitly pitches an "on-chain resume" for AI agents as the trust infrastructure for this gap.

---

## 4. Regulatory State (2024–2026)

### United States — CFPB

- **May 22, 2024:** CFPB issues Interpretive Rule classifying Pay-in-4 BNPL as a credit card under Truth in Lending Act / Regulation Z. Effective July 30, 2024. Requires BNPL lenders to investigate disputes, credit refunds, issue periodic billing statements. [kpmg.com BNPL CFPB rule](https://kpmg.com/us/en/articles/2024/buy-now-pay-later-bnpl-cfpb-rule-on-consumer-protections-reg-alert.html), [consumerfinance.gov BNPL](https://www.consumerfinance.gov/compliance/compliance-resources/consumer-cards-resources/buy-now-pay-later-bnpl-products/)
- **May 6, 2025:** CFPB announces it will **not prioritize enforcement** of the BNPL Interpretive Rule. [bankingjournal.aba.com CFPB deprioritize BNPL](https://bankingjournal.aba.com/2025/05/cfpb-to-deprioritize-enforcement-of-buy-now-pay-later-rule/)
- **May 12, 2025:** CFPB withdraws the 2024 BNPL Interpretive Rule entirely. [cfsreview.com CFPB BNPL withdrawal](https://www.cfsreview.com/2025/03/cfpb-indicates-that-it-will-rescind-buy-now-pay-later-interpretative-rule/)
- **June 2025:** CFPB confirms no revised rule forthcoming — cited "procedurally defective" and "ill-fitting open-end credit regulations" applied to closed-end loans. [consumerfinancemonitor.com CFPB no BNPL rule](https://www.consumerfinancemonitor.com/2025/06/20/cfpb-will-not-issue-revised-bnpl-rule/)
- **State backfill:** NY Governor Hochul signs SB S3008C (Buy-Now-Pay-Later Act) in 2025 — first state-level licensing regime; disclosure, dispute resolution, fee caps, data privacy. [hklaw.com NY BNPL Act](https://www.hklaw.com/en/insights/publications/2025/07/know-now-or-pay-later-navigating-new-yorks-buy-now-pay-later-act)

### European Union — CCD II

- **Consumer Credit Directive II** (Directive (EU) 2023/2225) — transposition deadline Nov 20, 2025; applies from **Nov 20, 2026**. [signicat.com CCD II](https://www.signicat.com/blog/the-eu-consumer-credit-directive-2-ccd2-what-it-means-for-bnpl-and-other-consumer-credit-providers), [hoganlovells.com CCD II BNPL](https://www.hognlovells.com/en/publications/eu-second-consumer-credit-directive-scope-and-impact-for-buy-now-pay-later-bnpl-providers)
- **Brings BNPL into scope for the first time.** Previously interest-free credit was exempt. Lower limit of €200 abolished; upper limit raised to €100,000.
- **Mandatory creditworthiness assessment** to EBA standards — income, repayment history, assets, liabilities. Soft-check models no longer sufficient.
- **Standardized pre-contract info sheet (SECCI)** required.
- **14-day right of withdrawal** for consumers.
- ~100+ BNPL providers in Europe estimated to need to overhaul models. Industry compliance cost: several hundred million euros. [oliverwyman.com CCD2 BNPL](https://www.oliverwyman.com/our-expertise/insights/2025/feb/impact-of-ccd2-on-buy-now-pay-later-services-in-europe.html)

### United Kingdom — FCA

- **From July 15, 2026:** Deferred Payment Credit (the rebranded regulatory term for BNPL) comes under the full FCA regulatory regime. [grantthornton.co.uk FCA BNPL final rules](https://www.grantthornton.co.uk/insights/bnpl-regulation--fca-confirms-the-final-rules/)
- **Section 75 Consumer Credit Act protection:** Per FCA guidance, will apply to newly regulated BNPL agreements between £100 and £30,000 — lender becomes jointly and severally liable with the merchant. (Some legal commentary disputes this; FCA position is the authoritative one.) [fca.org.uk BNPL](https://www.fca.org.uk/consumers/buy-now-pay-later)
- Affordability assessments, FCA principles, access to Financial Ombudsman Service.

### APAC

- **Singapore (MAS):** BNPL Code of Conduct active since 2022; voluntary but enforced via accreditation.
- **Australia (ASIC):** National Consumer Credit Protection Amendment 2024 brought BNPL under licensed credit regime from June 2025.
- **Philippines (BSP):** Issued Circular 1133 requiring BNPL operators to register as lending companies.
- **Indonesia (OJK):** Kredivo and peers operating under fintech lending license framework.

### AI agents handling financial decisions — emerging frameworks

- **EU AI Act** (entered into force August 2024, full application August 2026) — credit-scoring AI is a "high-risk" system requiring documentation, human oversight, post-market monitoring.
- **Klarna's own AI rollback** is now widely cited in regulatory submissions as evidence of why AI-only dispute handling is non-viable.
- **ERC-8004** ratified January 2026, live on Ethereum mainnet February 2026. Authors: Marco De Rossi (MetaMask), Davide Crapis (Ethereum Foundation), Jordan Ellis (Google), Erik Reppel (Coinbase). Three registries on-chain: Identity (NFT-based), Reputation (feedback log), Validation (third-party verification of agent actions). BNB Chain announced support Feb 4, 2026. Positioned as the *trust infrastructure* layer for autonomous economic agents. Increasingly referenced in regulatory conversations about agent accountability. [kucoin.com ERC-8004](https://www.kucoin.com/blog/understanding-erc-8004-on-chain-identity-standard-for-ai-agents), [chainwire.org BNB ERC-8004](https://chainwire.org/2026/02/04/bnb-chain-announces-support-for-erc-8004-to-enable-verifiable-identity-for-autonomous-ai-agents/), [blog.quicknode.com ERC-8004 dev guide](https://blog.quicknode.com/erc-8004-a-developers-guide-to-trustless-ai-agent-identity/)

---

## 5. Consumer Psychology of BNPL

### Why people use it

- **Cash-flow smoothing** — pay $25 today instead of $100 today, even when $100 is affordable.
- **Reduced "pain of paying"** — behavioral finance literature consistently finds that delayed/split payments reduce the salience of the cost, increasing consumption. [preprints.org BNPL psychology systematic review](https://www.preprints.org/manuscript/202512.1201)
- **Framing as "free"** — interest-free Pay-in-4 reads as gratis; the cost is buried in merchant fees the consumer never sees.
- **Control narrative** — younger users describe BNPL as giving them *more* control over spending (despite outcome data often showing the opposite). [rsisinternational.org BNPL young consumers](https://rsisinternational.org/journals/ijriss/articles/a-comprehensive-review-of-buy-now-pay-later-bnpl-influence-factors-on-young-consumer-spending-behaviour-in-e-commerce-platform/)
- **Avoiding credit card APR** — true for users who pay on time.
- **Avoiding hard credit pull** — soft-check Pay-in-4 doesn't ding the FICO file.

### What consumers hate

- **Late fees** — $7–$10 per missed installment stacks fast across multiple loans.
- **Surprise interest** on financing products marketed as "0% APR" but with deferred-interest gotchas if not paid in full.
- **Credit-bureau ambiguity** — until late 2024, repayment behavior wasn't reported, so on-time payments didn't build credit but missed payments could trigger collections.
- **Customer support frustration** — Klarna 2024–2025 is the prime example, but Afterpay and Sezzle have similar complaint patterns on Reddit/Trustpilot.

### Phantom debt problem

- **63% of BNPL borrowers had simultaneous loans** at some point during 2021–22; **33% had loans across different firms** (CFPB). [richmondfed.org BNPL phantom](https://www.richmondfed.org/publications/research/economic_brief/2025/eb_25-03)
- Loans not reported to credit bureaus → other lenders cannot see total liability when underwriting → systemic risk.
- Fortune (May 2024) estimated phantom debt at **~$700B in scale**. [fortune.com phantom debt](https://fortune.com/2024/05/08/phantom-debt-buy-now-pay-later-consumer-finances-struggling/)
- **November 2024:** Klarna begins reporting Klarna Term Loan activity to TransUnion. First major BNPL credit-bureau integration. [hostmerchantservices.com phantom debt](https://hostmerchantservices.com/2024/08/what-is-bnpl-phantom-debt/)

### Stacking and abuse patterns

- Same purchase financed across multiple BNPL providers (Klarna + Affirm + Afterpay) — providers can't see each other's exposure.
- Cashing-out: buying gift cards or resellable items, then defaulting.
- Subprime-skew + 78% approval rate for subprime applicants compounds risk.

---

## 6. Dispute / Refund / Fraud Patterns

### How the dispute flow actually works

In BNPL, the **BNPL provider is the merchant of record** for the card-network leg of the transaction — they pay the merchant up front, then collect installments from the consumer. This means:

- The consumer does *not* file a card-network chargeback against the merchant; they file a **direct dispute with the BNPL provider** (Klarna, Affirm, etc.).
- The BNPL provider investigates, then notifies the merchant.
- The merchant must respond within tight windows or auto-lose. [chargeflow.io Klarna chargeback](https://www.chargeflow.io/chargebacks-101/klarna-chargeback)

### Klarna dispute timeline (representative of the segment)

- **21 days** for merchant to contact the shopper and resolve.
- **7 days** for returns disputes.
- If unresolved → Klarna escalates to **Request for Information (RFI)**. Uploading evidence is **mandatory** with Klarna (different from card-network norms).
- RFI response windows: **96 hours** for `high_risk_order`, **7 days** for `unauthorized_purchase`.
- Stages: Dispute Notification → RFI → Information Supplied → 1st Chargeback. [docs.adyen.com Klarna chargebacks](https://docs.adyen.com/risk-management/chargeback-guidelines/klarna-chargebacks), [docs.stripe.com Klarna disputes](https://docs.stripe.com/payments/klarna/disputes)
- Standard Klarna chargeback fee to merchant: **$15**.

### Affirm dispute flow

Affirm handles most disputes internally and rarely surfaces them to the merchant. Affirm fights using its own transaction data. If resolved in customer's favor, merchant reimburses Affirm + $15 dispute fee. [chargeblast.com Affirm BNPL](https://www.chargeblast.com/blog/payments-life-affirm-bnpl-chargeback-prevention-guide)

### Fraud patterns

**Merchant fraud (fake shipment / non-delivery):**
- Fraudulent merchant onboarded, takes BNPL orders, never ships, BNPL provider pays merchant on capture, then has to refund the consumer after dispute window.

**Customer fraud — first-party / "friendly" / chargeback abuse:**
- 62% of merchants report first-party misuse rose ≥5% in past 12 months; 38% saw 5–25% rise during 2024. [datavisor.com BNPL fraud](https://www.datavisor.com/blog/bnpl-trends-fraud)
- Customer claims item not received / not as described, gets refund, keeps item.

**Synthetic identity fraud:**
- **+60% increase in synthetic ID fraud cases in 2024** (Experian). ACI Worldwide measured +26% in H1 2024 alone.
- Pattern: real SSN + fictitious name/address/DOB → BNPL account → purchases → never repaid.
- BNPL particularly vulnerable: optimized for fast checkout, light KYC. [seon.io BNPL fraud](https://seon.io/resources/buy-now-pay-later-fraud-risks-and-prevention/), [fingerprint.com BNPL fraud](https://fingerprint.com/blog/buy-now-pay-later-bnpl-fraud/)
- ~29% of BNPL fraud-prevention spend in 2024 targeted synthetic ID specifically.

**Account takeover (ATO):**
- Existing BNPL account credentials phished, fraudster uses stored card-on-file for new purchases.

**Sybil / multi-account abuse:**
- Single individual opens multiple BNPL accounts across providers with email/phone variations to stack credit.

### Standards in scope

- **PCI DSS v4.0.1** — payment-card-data handling. BNPL providers act as card-network merchants on the issuance leg.
- **ISO 20022** — global structured-message standard; XML-based; legal-entity identifiers, purpose codes, structured remittance. Banks worldwide migrating; BNPL providers integrating for cross-border settlement. [pcisecuritystandards.org](https://www.pcisecuritystandards.org/), [iso20022.org](http://www.iso20022.org/iso-20022)
- **ISO 8583** — legacy card-network messaging, still ubiquitous.
- **KYC / AML** — FATF guidance; CCD II layers EU-specific affordability assessment on top.

### How current BNPL providers verify "did delivery happen?"

- **Merchant ships → tracking number → BNPL provider polls carrier API.** Klarna uses tracking confirmation as the trigger to escalate or close disputes.
- **Proof of Delivery (POD)** required for Klarna RFI response — usually carrier confirmation + delivery photo if available.
- **No on-chain verifiable attestation today** — entire delivery-confirmation flow is centralized within the BNPL provider and the carrier API. Disputes about "did this delivery actually happen / was the item as described" remain manual, evidence-by-evidence, with significant ambiguity. This is the gap ERC-8004's *Validation Registry* targets in the agent-economy context.

---

## Sources used (full list)

- [DigitalCommerce360 — Google/Affirm/Klarna BNPL agentic commerce (May 13, 2026)](https://www.digitalcommerce360.com/2026/05/13/affirm-klarna-google-bnpl-agentic-commerce/)
- [Search Engine Land — Google UCP expansion](https://searchengineland.com/google-expands-universal-commerce-protocol-and-launches-new-agentic-shopping-tools-478113)
- [BusinessWire — Klarna backs UCP (Feb 2, 2026)](https://www.businesswire.com/news/home/20260202720690/en/Klarna-Backs-Googles-Universal-Commerce-Protocol-UCP-to-Enable-Agentic-Commerce-Across-Platforms)
- [PYMNTS — Klarna joins Google UCP](https://www.pymnts.com/news/artificial-intelligence/2026/klarna-joins-google-universal-commerce-protocol-advance-agentic-ai)
- [DigitalCommerce360 — Stripe agentic commerce via Affirm/Klarna (Mar 2026)](https://www.digitalcommerce360.com/2026/03/04/stripe-affirm-klarna-agentic-commerce/)
- [PYMNTS — KlarnaUSD on Tempo](https://www.pymnts.com/blockchain/2025/klarna-debuts-first-stablecoin-klarnausd-on-tempo-blockchain/)
- [The Block — KlarnaUSD on Stripe/Paradigm Tempo](https://www.theblock.co/post/380365/bnpl-firm-klarna-announces-usd-stablecoin-on-stripe-paradigms-tempo-blockchain-to-cut-payment-costs)
- [Ledger Insights — Klarna stablecoin 2026](https://www.ledgerinsights.com/bnpl-firm-and-bank-klarna-to-launch-dollar-stablecoin-in-2026/)
- [mvidmar.substack.com — Klarna AI $60M saved, rehire humans](https://mvidmar.substack.com/p/klarna-ai-60-million-saved-rehire-humans-2026)
- [Reworked — Klarna AI 700 rehire](https://www.reworked.co/employee-experience/klarna-claimed-ai-was-doing-the-work-of-700-people-now-its-rehiring/)
- [mlq.ai — Klarna CEO admits AI cuts went too far](https://mlq.ai/news/klarna-ceo-admits-aggressive-ai-job-cuts-went-too-far-starts-hiring-again-after-us-ipo/)
- [Twig — Klarna AI mistakes](https://www.twig.so/blog/what-klarna-got-wrong-about-ai-in-customer-support--and-how-they-fixed-it)
- [cobaltintelligence.com — Klarna failed AI experiment](https://blog.cobaltintelligence.com/post/klarnas-failed-ai-experiment-in-customer-service)
- [techtonicshifts.blog — Klarna AI karma](https://techtonicshifts.blog/2025/09/14/the-buy-now-cry-later-company-learns-about-karma/)
- [ecommercegermany.com — humans back in demand](https://ecommercegermany.com/blog/ai-customer-service-klarna-human-support/)
- [Twig — Klarna AI dispute resolution](https://www.twig.so/blog/ai-powered-dispute-resolution-klarna)
- [StockTitan — Klarna Q1 2026](https://www.stocktitan.net/news/KLAR/klarna-delivers-strong-start-to-2026-with-1bn-revenue-and-68m-adj-23rxzr1nispu.html)
- [SEC — Klarna Form 6-K FY2026](https://www.sec.gov/Archives/edgar/data/0002003292/000162828026038366/annualreport2025.htm)
- [SeekingAlpha — Klarna Q1 2026 earnings](https://seekingalpha.com/news/4592844-klarna-stock-gains-after-q1-earnings-shine-as-credit-loss-provision-drops)
- [ConsumerFinance.gov — CFPB BNPL resources](https://www.consumerfinance.gov/compliance/compliance-resources/consumer-cards-resources/buy-now-pay-later-bnpl-products/)
- [ConsumerFinanceMonitor — CFPB no revised BNPL rule](https://www.consumerfinancemonitor.com/2025/06/20/cfpb-will-not-issue-revised-bnpl-rule/)
- [CFSReview — CFPB rescind BNPL interpretive rule](https://www.cfsreview.com/2025/03/cfpb-indicates-that-it-will-rescind-buy-now-pay-later-interpretative-rule/)
- [ABA Banking Journal — CFPB deprioritize BNPL](https://bankingjournal.aba.com/2025/05/cfpb-to-deprioritize-enforcement-of-buy-now-pay-later-rule/)
- [KPMG — 2024 CFPB BNPL rule](https://kpmg.com/us/en/articles/2024/buy-now-pay-later-bnpl-cfpb-rule-on-consumer-protections-reg-alert.html)
- [Holland & Knight — NY BNPL Act](https://www.hklaw.com/en/insights/publications/2025/07/know-now-or-pay-later-navigating-new-yorks-buy-now-pay-later-act)
- [Signicat — CCD II BNPL](https://www.signicat.com/blog/the-eu-consumer-credit-directive-2-ccd2-what-it-means-for-bnpl-and-other-consumer-credit-providers)
- [Hogan Lovells — CCD II BNPL scope](https://www.hoganlovells.com/en/publications/eu-second-consumer-credit-directive-scope-and-impact-for-buy-now-pay-later-bnpl-providers)
- [Oliver Wyman — CCD2 BNPL impact](https://www.oliverwyman.com/our-expertise/insights/2025/feb/impact-of-ccd2-on-buy-now-pay-later-services-in-europe.html)
- [FCA — Buy Now Pay Later](https://www.fca.org.uk/consumers/buy-now-pay-later)
- [Grant Thornton — FCA BNPL final rules](https://www.grantthornton.co.uk/insights/bnpl-regulation--fca-confirms-the-final-rules/)
- [HM Treasury / Parliament — UK BNPL framework](https://researchbriefings.files.parliament.uk/documents/CBP-10328/CBP-10328.pdf)
- [Norton Rose Fulbright — UK BNPL framework](https://www.nortonrosefulbright.com/en/knowledge/publications/dbc4d0d3/the-new-uk-bnpl-framework-key-changes-and-impacts-for-lenders-and-merchants)
- [Richmond Fed — BNPL impact 2025](https://www.richmondfed.org/publications/research/economic_brief/2025/eb_25-03)
- [Richmond Fed — BNPL recent developments 2026](https://www.richmondfed.org/publications/research/economic_brief/2026/eb_26-05)
- [Congress.gov / CRS — BNPL policy options](https://www.everycrsreport.com/reports/R48858.html)
- [Fortune — phantom debt $700B](https://fortune.com/2024/05/08/phantom-debt-buy-now-pay-later-consumer-finances-struggling/)
- [Host Merchant Services — phantom debt](https://hostmerchantservices.com/2024/08/what-is-bnpl-phantom-debt/)
- [Chargeflow — Klarna chargeback guide](https://www.chargeflow.io/chargebacks-101/klarna-chargeback)
- [Chargeflow — BNPL statistics 2026](https://www.chargeflow.io/blog/buy-now-pay-later-statistics)
- [Chargeflow — Klarna vs Affirm 2026](https://www.chargeflow.io/blog/klarna-vs-affirm-payments)
- [Chargeblast — Affirm BNPL chargeback prevention](https://www.chargeblast.com/blog/payments-life-affirm-bnpl-chargeback-prevention-guide)
- [Adyen Docs — Klarna chargebacks](https://docs.adyen.com/risk-management/chargeback-guidelines/klarna-chargebacks)
- [Stripe Docs — Klarna disputes](https://docs.stripe.com/payments/klarna/disputes)
- [DataVisor — BNPL fraud trends](https://www.datavisor.com/blog/bnpl-trends-fraud)
- [SEON — BNPL fraud prevention](https://seon.io/resources/buy-now-pay-later-fraud-risks-and-prevention/)
- [Fingerprint — BNPL fraud](https://fingerprint.com/blog/buy-now-pay-later-bnpl-fraud/)
- [Preprints.org — BNPL psychology systematic review](https://www.preprints.org/manuscript/202512.1201)
- [RetailBrew — Afterpay budget stretching](https://www.retailbrew.com/stories/2025/01/23/afterpay-bnpl-money-matters)
- [eMarketer — BNPL FAQ 2026](https://www.emarketer.com/content/faq-on-buy-now--pay-later--how-payment-trend-will-change-2026)
- [KuCoin — ERC-8004 explainer](https://www.kucoin.com/blog/understanding-erc-8004-on-chain-identity-standard-for-ai-agents)
- [Chainwire — BNB Chain ERC-8004 support](https://chainwire.org/2026/02/04/bnb-chain-announces-support-for-erc-8004-to-enable-verifiable-identity-for-autonomous-ai-agents/)
- [QuickNode — ERC-8004 developer guide](https://blog.quicknode.com/erc-8004-a-developers-guide-to-trustless-ai-agent-identity/)
- [Allium — ERC-8004 identity reputation](https://www.allium.so/blog/onchain-ai-identity-what-erc-8004-unlocks-for-agent-infrastructure/)
- [RedStone — ERC-8004 + risk intelligence](https://blog.redstone.finance/2026/02/12/erc-8004-gives-ai-agents-identity-redstone-and-credora-power-them-with-data-and-risk-intelligence/)
- [Affirm — how it works](https://www.affirm.com/how-it-works)
- [Affirm — 0% APR financing](https://businesshub.affirm.com/hc/en-us/articles/4418104503060-0-APR-Financing)
- [Klarna — Pay in 4](https://www.klarna.com/us/pay-in-4/)
- [Klarna — Installments product](https://www.klarna.com/us/business/products/installments/)
- [Finovate — Zip to buy Sezzle](https://finovate.com/bnpl-consolidates-zip-to-buy-sezzle/)
- [Wikipedia — Sezzle](https://en.wikipedia.org/wiki/Sezzle)
- [PCI Security Standards Council](https://www.pcisecuritystandards.org/)
- [ISO 20022.org](http://www.iso20022.org/iso-20022)
