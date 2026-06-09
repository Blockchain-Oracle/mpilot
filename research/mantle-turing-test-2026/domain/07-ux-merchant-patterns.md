# Consumer UX & Merchant Integration — Knowledge Reference

> Domain-knowledge reference for Mantle Turing Test 2026. Documents patterns, standards, and providers that exist today. NO architectural recommendations — the future architect picks which to use.
>
> Compiled June 2026. Treats merchant payment widgets, crypto/AA wallet UX, Telegram-native flows, KYC primitives, and APAC market specifics.

---

## 1. Consumer Payment UX Patterns (2024–2026)

### 1.A Checkout-widget patterns

#### Stripe (industry baseline)
Stripe ships three layers, increasing in customization:

1. **Checkout Sessions API + hosted/redirect Checkout** — server-side `checkout.sessions.create` returns a URL; redirect or embed. Stripe handles 3DS, Apple Pay, Google Pay, currency detection, wallet rendering. Recommended path for most integrations. https://docs.stripe.com/payments/checkout-sessions-and-payment-intents-comparison
2. **Embedded Checkout** (introduced late 2023) — drops the hosted checkout UI inside the merchant's domain as a React component; user never leaves merchant URL.
3. **Payment Element + Payment Intents API** — lower-level, single drop-in component that intelligently expands to show Apple Pay / Google Pay / Klarna / etc. based on dashboard config. Used when full UI control is required. https://docs.stripe.com/payments/payment-element

`PaymentIntent` is a stateful object (`requires_payment_method` → `requires_confirmation` → `requires_action` → `processing` → `succeeded` | `requires_capture`). Authentication steps (3DS) surface as `requires_action` with a `next_action` payload describing what the SDK must do. https://docs.stripe.com/payments/paymentintents/lifecycle

#### Klarna (BNPL widget)
- Three end-user products surfaced in one widget: **Pay Now**, **Pay in 4** (4 interest-free installments, 2 weeks apart), **Slice It / Pay Later** (longer-term financing).
- Two presentation layouts: **radio button** (with explicit Klarna selection + CTA "Continue with Klarna") or **auto-advance** (no Klarna-specific CTA). Layout choice is dictated by host merchant's existing checkout shape. https://docs.klarna.com/payments/web-payments/integrate-with-klarna-payments/how-to-integrate-klarna-payments/
- Most common shipping path: enable Klarna as a Payment Method inside an existing PSP (Stripe, Adyen, Checkout.com, PayPal, Square). Klarna's own SDK exists for direct integration with HTTPS-required hosted JS widget.
- Klarna's deliberate UX choice: only one default plan visible — reduces decision fatigue. https://kristenberman.substack.com/p/breaking-down-bnpl-insights-from

#### Apple Pay / Google Pay (tap-to-pay)
- Both replace the 16-digit PAN with a tokenized **DPAN** (Device PAN). Merchant/PSP never sees raw card data.
- **Apple Pay**: hardware Secure Element on iPhone holds the DPAN; biometric (Face ID / Touch ID) gates each transaction. NFC contactless restricted to Apple Pay on iPhone (Google Pay cannot use NFC on iOS).
- **Google Pay**: tokenization via Google's HCE (Host Card Emulation) on Android; broader cross-platform reach.
- Merchant integration: most US PSPs support both by default — Stripe, Square, Adyen, Checkout.com surface both as a single "wallet button" via Payment Request API. https://developer.apple.com/apple-pay/Apple-Pay-Merchant-Integration-Guide.pdf

#### QR code checkout (LATAM, APAC)
- Static QR (merchant has a printed sticker — customer scans, enters amount) vs. dynamic QR (POS or invoice generates a fresh QR per transaction with amount pre-filled).
- Dominant in PromptPay (Thailand), QRIS (Indonesia), PayNow (Singapore), DuitNow (Malaysia), UPI (India), Pix (Brazil), VietQR (Vietnam). All ISO 20022-aligned in 2025–26 cross-border linkups.
- Cross-border QR interop: PayNow ↔ PromptPay launched 2021, expanded to Malaysia (DuitNow), Vietnam, India, Indonesia (QRIS). https://www.bot.or.th/en/financial-innovation/digital-finance/digital-payment/cross-border-payment.html

#### Crypto checkout widgets
- **Coinbase Commerce** — redesigned late 2023 to on-chain payments built primarily on Base (Coinbase's L2). Accepts BTC / ETH / DAI / LTC / DOGE / BCH / USDC. Auto-converts to USDC to neutralize volatility. 1% flat fee, no hidden fees. Plugins for Shopify, WooCommerce, Primer, JumpSeller. Being unified into "Coinbase Business" (mid-2026) with custody + cash-out. https://commerce.coinbase.com/docs
- **Helio** — Solana-first multi-chain checkout widget. 2% standard fee (1% with HelioX Pass). Optional 0.25% in-checkout swap and 0.5% auto-off-ramp to fiat. Wallet-to-wallet, real-time payouts. https://igamingpaymentsolutions.com/providers/helio-pay
- **NOWPayments** — 350+ tokens, multi-chain, guided onboarding for non-technical stores.
- **BitPay** — invoice-based widget, 100+ tokens, auto-settles to fiat. WooCommerce plugin. https://www.bitpay.com/
- **BTCPay Server** — self-hosted, open-source, free. Full custody control, zero processing fees. Bitcoin-first but multi-coin via plugins.

#### "1-click" / account-abstraction checkout
- **Coinbase Smart Wallet** — passkey-gated smart account (ERC-4337); gas sponsored on Base for first deployment and certain flows; biometric (Face ID, Chrome profile, Yubikey) auth. No seed phrases. https://www.coinbase.com/blog/a-new-era-in-crypto-wallets-smart-wallet-is-here
- **Privy** — embedded wallet + auth toolkit; "progressive onboarding" (email → SMS → social → connect external wallet). Acquired by Stripe June 2025, now integrated with Bridge. https://www.privy.io/
- **ZeroDev / Pimlico / Alchemy Account Kit** — paymaster + bundler infra layers used by app teams who want their own AA flow.

### 1.B BNPL-specific UX

- **"Select X at checkout"** pattern: the BNPL provider appears as one of N tile-style options alongside Visa, Apple Pay, etc. Selection switches the CTA copy (e.g., "Continue with Klarna").
- **Approval timing**: Klarna runs a soft-pull credit check in < 2 seconds and returns instant approve/reject; Affirm tends toward longer review for higher tickets. Approval friction is the single biggest BNPL conversion variable.
- **Repayment scheduling UI**: shown pre-purchase as 4 evenly-spaced installments with dates and amounts. Auto-debit from card on file is default.
- **Grace periods & late fees**: Klarna's Pay-in-4 traditionally interest-free with late fee (typically $7) after grace period. Affirm shows total interest + APR upfront.
- **Returns / disputes**: BNPL providers typically suspend remaining installments while a dispute is open; refunds settle to the underlying card or wallet.
- **Multi-merchant unified BNPL dashboards** — Klarna, Afterpay, Affirm all offer a consumer app showing all active installment plans across merchants, with reminders + auto-pay management. https://wealthvieu.com/klarna-review/

### 1.C Web3 payment UX in 2026

#### Wallet-connect flows
- **WalletConnect v2 + One-Click Auth (SIWE)** — combines "connect" + "sign-in" into one step. Supports EIP-1271 (smart account signature verification) and EIP-6492 (signatures from undeployed smart accounts). Standardized as CAIP-222. v1 fully shut down. https://docs.reown.com/appkit/next/core/siwe
- **Privy** — email + SMS + social + passkey + external-wallet auth, plus policy engine. Used heavily by mixed Web2/Web3 apps. https://www.dextools.io/tutorials/what-is-privy-embedded-wallet-auth-guide-2026
- **Dynamic** — competing whitelabel embedded-wallet + auth provider; multi-chain, social login.
- **Web3Auth** (now under MetaMask) — MPC key splitting; social-login → derived key.
- **Magic** — original magic-link auth + embedded wallet, broader product surface than Privy.

#### ERC-4337 account abstraction stack
- **EntryPoint contract**: singleton at `0x0000000071727De22E5E9d8BAf0edAc6f37da032` (v0.7), deployed across Ethereum, Base, Arbitrum, Optimism, Polygon, BNB, Avalanche, and most major EVM chains. https://eips.ethereum.org/EIPS/eip-4337
- **UserOperation** flow: user signs a UserOp; **Bundler** aggregates many UserOps and submits as a single tx to EntryPoint; EntryPoint validates and executes via the user's smart account.
- **Paymasters**: contracts that sponsor gas (sponsored UX) or accept ERC-20 (pay gas in USDC instead of ETH).
- **Bundler market share Q1 2026**: Pimlico + Stackup + Coinbase ≈ 78% of UserOps. 200M+ smart accounts, 100M+ transactions cumulative since 2023. https://osec.io/blog/2025-12-02-paymasters-evm/
- **Smart wallet patterns**:
  - **Coinbase Smart Wallet** — passkey-only; iCloud Keychain / hardware passkey backup.
  - **Safe** (formerly Gnosis Safe) — multisig signer model, enterprise default.
  - **Argent** — guardian-based social recovery.
  - **Soul Wallet** — social recovery + AA-native.
  - Five dominant 2026 recovery patterns: social, multisig, passkey, timelock, MPC-hybrid. https://eco.com/support/en/articles/15254048

#### Email / social onboarding bridges
- Privy / Magic / Dynamic / Web3Auth all expose **"derived wallet from email"** — user enters email, OTP, the SDK provisions a fresh embedded wallet (custodial/MPC/passkey depending on provider). Wallet address is then usable for on-chain transfers, signing, etc. Drop-off vs. metamask is typically -60% to -80%.

#### Telegram-native wallet onboarding
- **@wallet bot** (Wallet in Telegram) — non-custodial TON & multi-chain wallet, opened from Telegram menu. ~1B-user milestone late 2025.
- **TON Space** — Telegram's first-party in-app TON wallet, paired with Telegram Stars balance.
- **Mini App + TonConnect** — third-party Mini Apps deep-link to user wallets via TonConnect protocol for signing. https://help.wallet.tg/article/632-telegram-stars-in-ton-space

---

## 2. Telegram Mini Apps + Bot UX

### 2.A Mini Apps architecture
- WebView-loaded HTML/CSS/JS apps, opened from a bot's inline button or main menu. Backend is the merchant's own server. Communicates with Telegram via the **Telegram Web Apps JS API** + Bot API for events. https://core.telegram.org/bots/webapps
- Capabilities (2026): full-screen layouts, landscape mode, home-screen shortcuts, share flows, gyroscope/accelerometer, subscriptions billed in Stars. https://core.telegram.org/api/bots/webapps
- Cannot: access arbitrary native iOS/Android APIs outside Telegram's wrapper; bypass Apple/Google's billing for digital goods (this forced Stars to exist).

### 2.B BotFather conventions
- Bots created via `@BotFather`; each gets a token used in the Bot API.
- Per-bot configuration: commands list (shown in `/` menu), description, about, profile photo, payments provider tokens, web app URL, inline mode toggle.
- Webhook or long-polling for receiving updates.

### 2.C Keyboards & callbacks
- **Inline keyboards** — buttons attached to a message; tap fires a callback to the bot. Most common pattern for Mini App entry.
- **Custom reply keyboards** — replace the user's text keyboard with predefined buttons.
- **Callback queries** — async; bot must `answerCallbackQuery` within 30s.

### 2.D Telegram Payment API
- **Payments 2.0** — bot calls `sendInvoice` or `createInvoiceLink` → user gets a "Pay" button → opens native checkout overlay → completes via the configured payment provider. https://www.ilounge.com/articles/telegram-payment-providers-how-to-accept-payments-via-api-in-2026
- Provider tokens issued by integrated PSPs: Stripe (US/EU), YooMoney, PayMaster, Sberbank, Tranzzo, etc. Google Pay + Apple Pay rendered automatically inside the overlay.
- Bot receives `pre_checkout_query` → must confirm/decline within 10s → `successful_payment` event arrives after capture.

### 2.E Telegram Stars (XTR)
- Native in-app currency launched June 2024 for digital goods.
- ISO-style currency code: **XTR**. `sendInvoice` with `provider_token` omitted = Stars invoice. https://core.telegram.org/bots/api-changelog
- Users buy Stars via Apple IAP / Google Play IAP (Apple/Google take their 30% — Telegram's only way to keep Stars on iOS).
- Stars convert to Toncoin on the backend; creators withdraw via TON Wallet.
- Telegram Stars and TON Wallet Stars are **separate balances** — users must explicitly transfer between them. https://help.wallet.tg/article/632-telegram-stars-in-ton-space

### 2.F TON Pay (May 2026 launch)
- New SDK that lets Mini Apps accept TON & USDT-on-TON directly, with sub-second settlement and sub-cent fees. Pitched as a "crypto checkout layer for TON". https://www.tradingview.com/news/cointelegraph:5baa08296094b:0-ton-pay-aims-to-turn-telegram-into-a-crypto-checkout-layer-for-ton/
- Works across multiple TON wallets (@wallet, TON Space, Tonkeeper, MyTonWallet).
- Pavel Durov announced (May 2026) Telegram becoming TON's largest validator; Catchain 2.0 cut block times sub-second / 10x performance boost.

### 2.G Notable Telegram-native fintech & games
- **Notcoin** — original tap-to-earn; treated as template for subsequent Mini Apps.
- **Hamster Kombat** — peaked ~300M users, dropped to ~27M active (2026). Cautionary tale on retention.
- **Catizen, DOGS, TapSwap, UTYA** — TON-ecosystem viral games; TON Mini Apps total 500M+ MAU. https://memeburn.com/how-telegram-mini-apps-are-quietly-bringing-millions-of-new-users-into-crypto/
- **@wallet** — Telegram-native non-custodial wallet, ~1B users.

### 2.H Regional Telegram penetration
- **Heavy adoption**: Russia/CIS, Iran, Turkey, Belarus, Ukraine, Brazil, Indonesia, Malaysia, Saudi Arabia, UAE, Philippines.
- **Light adoption**: US, China (blocked), Japan, Korea, India (growing).
- Telegram total: ~1B MAU global as of 2026.

---

## 3. Merchant Integration Standards

### 3.A Financial messaging standards
- **ISO 20022** — XML-based standard for financial messaging. Cross-border bank-to-bank payments switched to ISO 20022-only on **22 Nov 2025**. Provides rich data (purpose codes, structured remittance info, party identifiers) that legacy MT messages couldn't. https://www.swift.com/standards/iso-20022/iso-20022-standards
- ISO 20022 doesn't make payments instant by itself — it provides the message format that domestic RTP and cross-border rails are built around. Used by SWIFT, SEPA Instant, US FedNow, UK Faster Payments, Pix, UPI, PromptPay, PayNow, etc.

### 3.B Card security & authentication
- **PCI DSS v4.0** — mandatory by April 2024; v4.0.1 with minor amendments active in 2025. Covers handling, transmission, storage of cardholder data. Tokenization (DPAN, Network Tokens) plus point-to-point encryption are the dominant "scope-reduction" patterns merchants use.
- **3D Secure 2 / 3DS2** — protocol implementing Strong Customer Authentication for card-not-present in EU/UK/India. Sends device + transaction context to issuer for risk scoring; "frictionless" flow when issuer is confident, "challenge" flow (OTP / biometric / passkey) otherwise. https://stripe.com/guides/strong-customer-authentication
- **PSD2 SCA** (EU/UK) — requires 2 of 3 factors (knowledge / possession / inherence). 3DS2 is the de facto compliance path. Transactions skipping it are typically declined.
- **RBI 2FA mandate** (India, April 2026) — every domestic transaction (UPI, cards, wallets, mandates) requires 2 distinct factors, at least one dynamic. https://www.useideem.com/post/how-rbis-new-2fa-mandate-impacts-indias-digital-payments

### 3.C Merchant-of-Record (MoR) model
- **Stripe** — payment processor; merchant is MoR (handles its own sales tax / VAT / GST). 2.9% + $0.30 US baseline.
- **Stripe Atlas** — entity formation in Delaware + EIN + bank-account introduction (Mercury default integration). Pipeline: Atlas → EIN → Mercury → Stripe. https://docs.stripe.com/atlas/payments-business-bank
- **Paddle** / **Lemon Squeezy** / **Polar** / **Dodo Payments** — MoR platforms. They are the legal seller of record; they collect & remit sales tax in 200+ jurisdictions. Fees typically 5% + $0.50. Lemon Squeezy is migrating to Stripe-Managed Payments backend (mid-2026). https://www.lemonsqueezy.com/blog/2026-update
- **Effective cost convergence**: Stripe's nominal 2.9% climbs to ~4.9–5.2% on cross-border tx (international card surcharge +1.5%, FX +1%, Stripe Tax +0.5%). MoR effective cost difference narrows below 1% once global tax is included. https://fintechspecs.com/blog/stripe-vs-paddle-vs-lemon-squeezy-vs-polar-merchant-of-record-b2b-saas/

### 3.D Settlement flows
- **T+0** — same-day. RTP rails (FedNow, RTP Network, SEPA Instant, Faster Payments, UPI, Pix, PromptPay, PayNow) settle in seconds; payouts to merchants on RTP rails are real-time.
- **T+1 / T+2** — most ACH and card settlement (Stripe default is T+2 for new accounts in the US, T+1 in most EU markets).
- **T+3 / T+5** — international wires, some marketplace payouts, BNPL-to-merchant settlement.
- **Crypto** — onchain finality varies by chain: Solana < 1s, Ethereum ~12s (with reorg risk for ~64 blocks for full finality), L2s 1–10s for soft + 5–15min to L1.

### 3.E Disputes vs. refunds vs. chargebacks
- **Refund** — merchant-initiated reversal; no card-scheme involvement; cheapest, fastest, lowest reputational cost.
- **Dispute / Chargeback** — cardholder asks issuer to reverse; issuer claws funds from merchant via the scheme; merchant must respond with evidence within 7–21 days depending on reason code (Visa & Mastercard categories: fraud, authorization, processing error, consumer disputes).
- Chargeback fees: $15–$25 per case regardless of outcome. Win rate industry average ~33%.
- ISO 20022 "Rich Data" enables embedding proof-of-delivery, IP fingerprint, biometric liveness in dispute response — friendly-fraud claims becoming harder to win. https://www.evonsys.com/blog/iso-20022-and-the-new-era-of-domestic-payment-investigations

### 3.F Webhook patterns
- **Stripe** — signed via HMAC-SHA256 over `timestamp.raw_payload` with endpoint secret `whsec_...`. `Stripe-Signature` header carries `t=` + `v1=`. Use the SDK's `constructEvent` (constant-time comparison + timestamp tolerance built-in). 5-min replay window default. https://www.hooklistener.com/learn/stripe-webhook-security-guide
- **Shopify** — `X-Shopify-Hmac-SHA256` over raw body with shared secret.
- **Square** — `x-square-hmacsha256-signature` over URL+body.
- **General best practices**:
  - Always verify signature on raw bytes (not re-serialized JSON).
  - Return 200 fast (< 5s), enqueue async work.
  - Idempotent processing keyed by event ID (events may replay on retry).
  - Validate timestamp ≤ 5 min skew.
  - Trend (2025–26): short-lived HMAC keys (15min–24h) rotated via JWKS-style endpoints.

### 3.G API key + signing patterns
- **API keys** — bearer tokens in `Authorization: Bearer ...`; public + secret pair (e.g., Stripe `pk_live_…` and `sk_live_…`). Common in Stripe, Plaid, OpenAI.
- **HMAC request signing** — request signed with shared secret; signature header included. Used by AWS SigV4, Square, Shopify webhooks.
- **JWT / OAuth2** — short-lived bearer tokens with claims; used by Plaid Link, Open Banking, Privy.
- **Passkey-signed requests** — emerging in smart-wallet contexts; user's passkey signs a payload alongside session token.

---

## 4. Onboarding / KYC Patterns

### 4.A Tier ladder
- **KYC-light / Tier 0** — email + phone OTP. Usable for $0–$100 stored balance, view-only or stablecoin-receive accounts. Used by Cash App initial signup, GCash basic, Privy onboarding.
- **KYC-medium / Tier 1** — government ID upload + DOB + address. Unlocks $1K–$10K limits. Standard onboarding for fintech apps.
- **KYC-heavy / Tier 2** — selfie + liveness + proof of address + source-of-funds questions. Unlocks high limits, fiat on-/off-ramp, lending.
- **Enhanced Due Diligence (EDD)** — PEP screening, source-of-wealth, ongoing transaction monitoring. Required for high-risk or high-value customers.

### 4.B Liveness & document providers
- **Sumsub** — combines KYC + KYB + AML screening + fraud controls in one API + workflow builder. Strong in crypto/fintech/gaming/marketplaces. https://sumsub.com/blog/what-is-the-fatf-travel-rule/
- **Onfido** (Entrust IDV since 2024 acquisition) — Atlas AI document + biometric pipeline; end-to-end verification < 6s. Enterprise default UK/EU.
- **Persona** — dynamic verification flows; built for product customization at scale.
- **Veriff** — video-based liveness (short clip vs. static selfie). 12k+ document types.
- **Jumio, Socure, iProov, FaceTec, iDenfy, Shufti Pro** — also major in the 2026 market.
- **Regulatory direction**: layered liveness ("passive + active") expected by Q4 2026 in EU/UK/Singapore; single-step "smile for the camera" flows being deprecated. https://apidog.com/blog/best-kyc-api/

### 4.C Sanctions / AML screening (crypto-specific)
- **Chainalysis** — KYT (Know Your Transaction) continuous monitoring + pre-tx wallet screening. Industry default.
- **TRM Labs** — risk intelligence first, Travel Rule orchestration secondary.
- **Elliptic** — Lens platform unifies tx monitoring + wallet screening across chains.
- **CipherTrace** (Mastercard-owned) — enterprise-focused.
- **Pricing model**: per-screening API call or seat licenses + tx volume tiers.

### 4.D FATF Travel Rule
- FATF Recommendation 16 extended to virtual assets: VASPs (exchanges, custodians, payment processors) must collect originator+beneficiary info on transfers above threshold (typically $1k or €1k) and share with the counterparty VASP.
- 73% of countries have made the Travel Rule law by Jan 2026. https://coinhubtoday.com/travel-rule
- EU **TFR (Transfer of Funds Regulation, 2024)** — no threshold; full info required on every crypto transfer.
- US enforcement under FinCEN $3k threshold; UK under MLR 2017 amendment; Singapore under PS Act; Japan under FIEA / PSA.
- **Solutions**: Sumsub Travel Rule, Notabene, Sygna, Chainalysis Travel Rule — all implement IVMS-101 message format over TRP / Sygna Bridge / Shyft Veriscope.

### 4.E Age verification
- BNPL typically 18+ (Klarna, Affirm) — verified during soft credit pull. Some jurisdictions (Germany, Australia) require explicit age check before offering credit.
- Gaming + alcohol + crypto onramps often use ID-bound age check (Onfido / Yoti) or zero-knowledge "over-18" credentials.

### 4.F Progressive KYC
- Start at $0 limit with email-only signup; escalate verification as user attempts to raise limits or access new products. Reduces friction at the top of funnel.
- Saves up to 30% of annual KYC OPEX (industry benchmark). Time-per-check reduced ~30% to < 8min by 2028 (AU10TIX projection). https://www.au10tix.com/blog/fintech-trends-and-best-practices/
- Pattern adopted by: Wise, Revolut, Cash App, Coinbase, GCash, Mercury, Privy.

### 4.G Privacy-preserving / ZK KYC
- **Worldcoin / World ID** — iris-biometric proof-of-personhood. Strong Sybil resistance, controversial collection method.
- **zkPass** — generates ZK proofs from Web2 documents (govt portals, banking sites) via MPC + ZKP. ZK Compliance Suite (Q3 2025) for banks/fintechs/healthcare. https://zkpass.org/
- **Privado ID** (rebrand of Polygon ID) — zkSNARK-based verifiable credentials with on-chain revocation; dynamic credentials (Feb 2025). Polygon committed $1B to ZK tech.
- **Self Protocol** — ZK proofs over government-issued passport NFC chips; "prove citizenship / age / non-sanction without revealing PII".
- **Common use case**: prove "over-18" or "not on OFAC SDN" or "resident of allowed jurisdiction" without exposing the source document. Market projected $83.6M (2025) → $903.5M (2032).

---

## 5. APAC-specific UX Considerations

### 5.A Philippines
- **GCash** — dominant e-wallet, ~94M users. Owned by Mynt (Globe Telecom + Ant Group). 7-eleven cash-in/out ubiquitous.
- **PayMaya / Maya** — #2, banking license.
- **BSP (Bangko Sentral ng Pilipinas)** regulates digital banks + e-wallets.
- **InstaPay** (RTP) + **PESONet** (batch) — national rails. Feb 2026 BSP rules require interoperability across both. https://fintechnewsph.com/philippines-set-for-fintech-boom-2026/
- **OFW remittance** is the single largest fintech use case — $40B+/yr inflow. GCash + Careem Pay launched UAE→PH wallet-to-wallet (Mar 2026). Direct corridor wallet-to-wallet bypasses Western Union / MoneyGram.
- **Crypto sentiment**: positive, BSP-licensed VASPs (PDAX, Coins.ph) operate openly. P2P stablecoin remittance growing.

### 5.B Indonesia
- **Fragmented**: GoPay (Gojek), OVO (Grab+Tokopedia), DANA (Ant), ShopeePay (Sea), LinkAja (state telcos). No single super-app dominates.
- **QRIS** — national QR standard mandated by BI (Bank Indonesia); every wallet must accept every QRIS code. Solves fragmentation at acceptance layer.
- **Tiered KYC**: basic = phone-only ($75 daily limit); upgraded = NIK (national ID) + selfie ($1k+ daily limit).
- GoPay Pinjam (loans) + GoPay Later (BNPL) have separate KYC ladders within the same app — friction noted across sources. https://www.transfi.com/blog/indonesias-top-e-wallets-ovo-gopay-dana-how-they-work-and-compare
- 2025–26 fraud-prevention upgrades: device binding, cooling-off on phone-number changes, anomaly detection.

### 5.C Vietnam
- **MoMo** (~30M users), **ZaloPay** (Zalo super-app), **ViettelPay** (Viettel telco), **VNPay** — major wallets.
- **VietQR** — national QR rail; ZaloPay, MoMo, ViettelPay all interoperate.
- **SBV (State Bank of Vietnam)** issued Circular 40/2024 + Circular 45/2025 (mandatory KYC + real-time monitoring) + Circular 25/2025 (zero QR fees < VND 500k). https://www.mordorintelligence.com/industry-reports/vietnam-mobile-payments-market
- National Public Service Portal hosts 3,800 govt services payable via MoMo / ZaloPay / ViettelPay (taxes, utilities, licenses).

### 5.D Thailand
- **PromptPay** — national RTP rail tied to mobile number or national ID. Used for P2P, bills, merchant QR. Dominant; nearly universal merchant acceptance.
- **TrueMoney** (Ascend Group), Rabbit LINE Pay — top-up wallets sit on top of PromptPay.
- **Cross-border**: PromptPay ↔ PayNow (Singapore) — world's first national RTP linkage (2021); ↔ DuitNow (Malaysia), ↔ QRIS (Indonesia), ↔ UPI (India), ↔ VietQR (Vietnam) expanding through ASEAN. Limit per day ~THB 25k / SGD 1k. https://www.bot.or.th/en/financial-innovation/digital-finance/digital-payment/cross-border-payment.html

### 5.E Singapore
- **PayNow** — national RTP, tied to mobile/national ID. Universal.
- **PayLah! (DBS), GrabPay, FavePay** — wallet front-ends.
- **MAS PS Act** (Payment Services Act 2019, amended 2024) — single license regime covering account issuance, payment processing, e-money, money-changing, digital-token (DPT) services. Strong regulatory clarity; Singapore is a major fintech & crypto hub.
- **Project Guardian / Project Orchid** — MAS-led tokenized deposit + asset experiments.

### 5.F India
- **UPI** — dominant; ~17B+ tx/month (2026), free for P2P + sub-₹2k merchant; powering ~80% of digital retail tx volume.
- **NPCI**-operated. Apps on top: PhonePe (~46%), Google Pay (~36%), Paytm (~10%, post-RBI restrictions), Amazon Pay, Cred, BHIM.
- **RBI BNPL crackdown** — BNPL/PPI (prepaid payment instrument) tightening since 2022 (no card-load via credit), continued in 2026 with transparent repayment + fee disclosure rules. https://www.digittrix.com/blogs/best-payment-gateway-upi-bnpl-india-2026-blueprint-for-india
- **ONDC (Open Network for Digital Commerce)** — protocol-level decoupling of buyer-app, seller-app, logistics. Growing in food delivery + grocery; payment leg uses UPI.
- **UPI Credit Line** — pre-approved bank credit accessible via UPI tap; major retail credit channel post-2024.
- **April 2026 RBI 2FA mandate** — all digital transactions need 2 distinct factors, at least one dynamic.

### 5.G Korea
- **Kakao Pay, Naver Pay, Toss Pay, Samsung Pay** — four-horse race. Toss dominant among 20s–30s for UX.
- **Mobile-payment market** ~$48.3B (2026 forecast).
- **Cross-border**: Kakao Pay ↔ PayPay (Sep 2025) — Korean tourists pay in Japan, Japanese tourists pay in Korea offline. Naver Pay ↔ LINE Pay (Japan) + Alipay+ + UnionPay. https://www.koreaherald.com/article/10583433
- Crypto: tightly regulated; only 5 won-fiat-licensed exchanges (Upbit, Bithumb, Coinone, Korbit, Gopax).

### 5.H Japan
- **PayPay** — ~50M users (out of ~125M population), dominant. SoftBank-backed. Alipay+ partnership extends acceptance to 16 partner wallets across Asia at PayPay merchants (3M+).
- **LINE Pay, Rakuten Pay, au PAY, d Barai (NTT Docomo)** — secondary.
- **JPQR** — national QR standard.
- **Konbini** (convenience store cash payment) still material — Japanese consumers pay e-commerce bills in cash at 7-Eleven, FamilyMart, Lawson.

### 5.I China
- **Alipay** (Ant) — 1.2B+ users. WeChat Pay (Tencent) — 900M+ MAU.
- Duopoly closed to outsiders; mainland-only by default. Foreign visitors now whitelisted via "Tour Card" for Alipay & WeChat Pay (limited tx).
- **Alipay+** — Ant's cross-border layer; one merchant integration accepts 25+ Asian e-wallets (PayPay, GCash, Kakao Pay, Touch'n Go, TrueMoney, etc.). https://www.alipayplus.com/mobile-payment-provider-list/
- Crypto banned for trading; some interest in DCEP (digital yuan, e-CNY) merchant pilots.

### 5.J AI/agent products regional reception
- **Philippines, Indonesia, Vietnam** — strongly receptive; mobile-first cohorts comfortable with chatbots in messaging apps; LLM-driven assistants common in banking apps (e.g., GCash "Pera Coach" with Microsoft, Mar 2026).
- **Singapore, Japan, Korea** — high acceptance + tight regulatory scrutiny (MAS AI risk framework; Korea's PIPA; Japan's METI guidelines).
- **India** — heavy adoption + DPDP Act 2023 enforcement ramp 2025–26; RBI's regulatory sandbox includes AI use cases.
- **China** — domestic LLMs (Tongyi, Doubao, DeepSeek, ERNIE) dominant; foreign AI apps largely blocked.

### 5.K Telegram penetration per country (APAC)
- **High**: Indonesia, Vietnam, Philippines, Malaysia, Sri Lanka.
- **Medium**: Thailand, Singapore, India (growing).
- **Low**: Japan, Korea (LINE/KakaoTalk dominant), China (blocked).

---

## 6. Cross-cutting Reference Primitives

### 6.A US business formation + banking
- **Stripe Atlas** — Delaware C-corp / LLC formation, EIN, IRS forms, banking introduction (Mercury), stock issuance, $500 flat. Open to non-US founders.
- **Mercury** — startup-friendly business banking; no minimum balance, FDIC-insured via partner banks, multi-account structure, treasury option, API access. Direct Stripe Atlas integration. https://nomad-labs.com/mercury-relay-brex-us-business-banking-abroad/
- **Brex** — corporate cards + business banking; acquired by Capital One April 2026 ($5.15B).
- **Relay** — banking + AP/AR, popular with bookkeepers.
- **None of the above are "crypto-friendly"** in the Bridge/Anchorage sense. For crypto: Bridge.xyz (post-Stripe acquisition), Anchorage Digital, BVNK, Rain.

### 6.B Stablecoin off-ramp APIs
- **Bridge.xyz** (Stripe-acquired 2025) — virtual accounts USD/EUR/MXN auto-convert inbound wires to USDC/USDT; REST + webhooks. Deepest geographic licensing. https://www.bridge.xyz/
- **BVNK** — programmable stablecoin pay-ins/payouts, virtual accounts, enterprise SLA, 99.9% uptime, Merchant API for B2B.
- **Sphere** — programmable treasury (conditional disbursement, multi-signer approvals).
- **Beam** — focuses on real-time fiat <> stablecoin settlement.
- **Conduit, Triple-A, Eco, Stably** — smaller competitors covering specific corridors.

### 6.C Account-abstraction infrastructure
- **Pimlico** — bundler + paymaster, 100+ chains, 200M+ tx relayed; chosen by MetaMask & Safe. https://docs.pimlico.io/guides/conceptual/account-abstraction
- **Stackup** — Go-based open-source bundler.
- **Alchemy Account Kit** — Rust-based bundler + AA SDKs.
- **Biconomy** — paymaster + bundler, gas-tank model.
- **ZeroDev** — Kernel smart account + SDK; popular for white-labeled AA UX.
- **Candide, Plasma, Etherspot** — secondary providers.

### 6.D Email-to-wallet bridges
- **Privy, Magic, Web3Auth, Dynamic** — embedded wallet from email/social. Most APAC-friendly defaults.
- **Turnkey** — non-custodial key infrastructure with email/passkey auth, raw secp256k1 signing API.
- **Coinbase Smart Wallet** — passkey-from-browser, no email step required.

### 6.E Notification infrastructure
- **Knock** — multi-channel orchestration; React feed/toast/banner components; 30+ providers. Best for in-app UX. https://knock.app/
- **Courier** — multi-channel orchestration; 50+ providers. Best for breadth.
- **Resend** — developer-friendly transactional email, React Email template support.
- **Novu** — open-source competitor.
- **SendGrid, Postmark, Amazon SES** — underlying email senders (Knock/Courier route through them).
- **Twilio, MessageBird (Bird)** — SMS + WhatsApp + voice.
- **OneSignal, Firebase Cloud Messaging** — mobile push.

### 6.F Embedded chat / dispute UX
- **Intercom** — chat + helpdesk + AI-resolution agent (Fin). Strong in SaaS.
- **Crisp, Front, HelpScout** — competitors.
- **Plain, Pylon** — newer developer-focused customer-support stacks.
- Use case: dispute UX is increasingly shifting from email-only to in-app chat with attached transaction context + structured forms.

### 6.G Open Banking APIs
- **Plaid** (US + Canada + UK + EU + select) — deepest US bank coverage; Plaid Auth, Identity, Income, Investments, Liabilities, Transfer. Pricing: MAU-based + per-API-call. https://www.fintegrationfs.com/post/plaid-vs-tink-vs-truelayer-which-open-banking-api-is-best-for-your-fintech
- **Tink** (EU, Visa-owned) — data + payments; strong Nordics + DACH.
- **TrueLayer** (UK + EU) — payments-first; per-tx pricing 0.3%–1.5%.
- **MX** (US) — data aggregation, alternative to Plaid.
- **Yodlee, Finicity (Mastercard)** — legacy aggregators.
- **Belvo** (LATAM), **Brankas, Finantier** (SEA) — regional Open Banking aggregators.

### 6.H Payment-method aggregator layers
- **Adyen** — global, single integration covers 100+ local methods.
- **Checkout.com** — similar profile, EU-rooted.
- **Worldpay (FIS)** — enterprise.
- **Antom** (Ant International) — Alipay+'s merchant-facing layer, 50+ APAC wallets in one integration. https://docs.antom.com/ac/antomop/zalopay
- **dLocal, EBANX, PayU** — emerging-markets payment aggregators (LATAM, India, Africa, SEA).

### 6.I AML / fraud / risk
- **Sift, Forter, Riskified, Signifyd** — chargeback / fraud prevention with shared graph models.
- **Sardine** — fraud + AML + compliance for fintech/crypto, behavioral biometrics.
- **Alloy** — KYC/KYB orchestration layer (routes across Onfido, Persona, Sumsub, etc. based on policy).
- **Hummingbird** — case management for SAR/CTR filings.

---

## Source URLs (canonical)

### Payment standards & widgets
- Stripe Checkout vs Payment Intents: https://docs.stripe.com/payments/checkout-sessions-and-payment-intents-comparison
- Stripe Payment Element: https://docs.stripe.com/payments/payment-element
- Stripe Payment Intent lifecycle: https://docs.stripe.com/payments/paymentintents/lifecycle
- Klarna Web Payments integration: https://docs.klarna.com/payments/web-payments/integrate-with-klarna-payments/how-to-integrate-klarna-payments/
- Klarna widget presentation: https://docs.klarna.com/klarna-network-distribution/payment-presentation/present-klarna-in-the-checkout/
- Apple Pay Merchant Integration Guide (March 2026): https://developer.apple.com/apple-pay/Apple-Pay-Merchant-Integration-Guide.pdf
- Coinbase Commerce docs: https://commerce.coinbase.com/docs
- Base + Coinbase Commerce + OnchainKit: https://docs.base.org/cookbook/accept-crypto-payments
- BitPay: https://www.bitpay.com/
- NOWPayments: https://nowpayments.io/
- Helio Pay overview: https://igamingpaymentsolutions.com/providers/helio-pay

### Account abstraction & smart wallets
- EIP-4337 spec: https://eips.ethereum.org/EIPS/eip-4337
- Pimlico AA guide: https://docs.pimlico.io/guides/conceptual/account-abstraction
- Coinbase Smart Wallet: https://www.coinbase.com/blog/a-new-era-in-crypto-wallets-smart-wallet-is-here
- Paymaster risks (OSec): https://osec.io/blog/2025-12-02-paymasters-evm/
- Smart Wallet recovery patterns 2026: https://eco.com/support/en/articles/15254048

### Embedded wallets & auth
- Privy: https://www.privy.io/
- WalletConnect / Reown SIWE: https://docs.reown.com/appkit/next/core/siwe
- WalletConnect auth spec: https://specs.walletconnect.com/2.0/specs/clients/sign/wallet-authentication

### Telegram
- Telegram Mini Apps: https://core.telegram.org/bots/webapps
- Telegram Mini Apps (Core API view): https://core.telegram.org/api/bots/webapps
- Bot API changelog (Stars / XTR): https://core.telegram.org/bots/api-changelog
- Telegram Stars + TON Wallet: https://help.wallet.tg/article/632-telegram-stars-in-ton-space
- TON Pay launch coverage: https://www.tradingview.com/news/cointelegraph:5baa08296094b:0-ton-pay-aims-to-turn-telegram-into-a-crypto-checkout-layer-for-ton/

### Merchant standards
- ISO 20022 (Swift): https://www.swift.com/standards/iso-20022/iso-20022-standards
- Stripe SCA guide: https://stripe.com/guides/strong-customer-authentication
- Stripe Atlas business banking: https://docs.stripe.com/atlas/payments-business-bank
- Stripe webhook security: https://www.hooklistener.com/learn/stripe-webhook-security-guide
- ISO 20022 fraud / investigations: https://www.evonsys.com/blog/iso-20022-and-the-new-era-of-domestic-payment-investigations

### KYC / compliance
- Sumsub on FATF Travel Rule: https://sumsub.com/blog/what-is-the-fatf-travel-rule/
- KYC API comparison 2026: https://apidog.com/blog/best-kyc-api/
- zkPass: https://zkpass.org/
- Au10tix progressive KYC trends 2026: https://www.au10tix.com/blog/fintech-trends-and-best-practices/

### Stablecoin / off-ramp
- Bridge.xyz: https://www.bridge.xyz/
- BVNK summary: https://eco.com/support/en/articles/15232571
- Top stablecoin APIs 2026: https://eco.com/support/en/articles/14728029

### Open banking
- Plaid vs Tink vs TrueLayer 2026: https://www.fintegrationfs.com/post/plaid-vs-tink-vs-truelayer-which-open-banking-api-is-best-for-your-fintech

### APAC fintech
- BoT cross-border payments: https://www.bot.or.th/en/financial-innovation/digital-finance/digital-payment/cross-border-payment.html
- Philippines fintech 2026: https://fintechnewsph.com/philippines-set-for-fintech-boom-2026/
- Vietnam mobile payments: https://www.mordorintelligence.com/industry-reports/vietnam-mobile-payments-market
- Indonesia top e-wallets: https://www.transfi.com/blog/indonesias-top-e-wallets-ovo-gopay-dana-how-they-work-and-compare
- Korea Kakao Pay ↔ PayPay: https://www.koreaherald.com/article/10583433
- India RBI 2FA mandate April 2026: https://www.useideem.com/post/how-rbis-new-2fa-mandate-impacts-indias-digital-payments
- India BNPL/UPI 2026 blueprint: https://www.digittrix.com/blogs/best-payment-gateway-upi-bnpl-india-2026-blueprint-for-india
- Alipay+ wallet partner list: https://www.alipayplus.com/mobile-payment-provider-list/

### Notification & tooling
- Knock: https://knock.app/
- Top notification platforms 2026 (Knock blog): https://knock.app/blog/the-top-notification-infrastructure-platforms-for-developers

### MoR landscape
- Lemon Squeezy 2026 update (Stripe Managed Payments backend): https://www.lemonsqueezy.com/blog/2026-update
- MoR comparison: https://fintechspecs.com/blog/stripe-vs-paddle-vs-lemon-squeezy-vs-polar-merchant-of-record-b2b-saas/
