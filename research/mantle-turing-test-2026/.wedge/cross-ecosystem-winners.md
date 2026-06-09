# Cross-Ecosystem Winner Mining — Mantle Turing Test 2026 Wedge

**Captured:** 2026-06-02
**Subagent:** cross-ecosystem-winners
**Scope:** Find AI agent / DeFi-automation / wallet / commerce projects that WON prizes at major 2024–2026 hackathons, rank by Mantle-port viability with material differentiation potential.

## Sources searched

- Local ETHGlobal corpus (17,180 projects, all events ETHWaterloo 2019 → Cannes 2026) via `~/.claude/skills/sahil-hackathon-corpus/scripts/query.py` — keyword + prize-filter queries
- ETHGlobal showcase (Cannes 2026, HackMoney 2026, Buenos Aires 2025, New Delhi 2025, NY 2025, Taipei 2025, Trifecta Agents, Agentic Ethereum)
- Solana AI Hackathon 2025 winners — solanafloor.com recap
- Solana Breakout Hackathon 2025 — Colosseum blog
- SF Agentic Commerce x402 Hackathon — SKALE blog (Virtuals/Coinbase/Google tracks)
- Devpost gallery scan (MNEE, Yard Work, One Trillion Agents, AWS AI Agent Global)

---

## Top 10 port candidates (ranked by Mantle-port viability)

### 1. Croisette.cc

- **Hackathon:** ETHGlobal Cannes 2026
- **Prize:** 0G — Best OpenClaw Agent on 0G, 1st place (~$5K)
- **Chain:** Ethereum + 0G
- **Demo / repo:** https://croisette.cc — https://github.com/GianfrancoBazzani/croisette.cc — https://ethglobal.com/showcase/croisette-cc-8vdfk
- **What it does:** AI agents that run effortless 24/7 portfolio investing — replaces "banker's hours" + expensive brokers with always-on automated DeFi. Framing: "55% of people leave money in bank accounts losing to inflation; 80% of retail loses money managing portfolios."
- **Why it won:** Crisp consumer framing (inflation + Wall Street comparison), 0G compute integration for verifiable agent reasoning, polished demo URL/site.
- **Mantle-port viability:** 5/5 — Mantle has USDY (RWA), mETH, MI4, fBTC ready today; the "always-on banker" pitch maps perfectly onto Mantle's RWA thesis. Byreal CLMM (Solana side) provides the active yield leg.
- **What we'd add as differentiator:** ERC-8004 identity per agent (Croisette has no on-chain identity layer), portable rep score across chains, and cross-chain execution (Mantle RWA + Solana DEX via Byreal) — not just single-chain.
- **Track placement:** Track 3 (AI×RWA, primary) + Track 6 (Agentic Wallets, cross-track).
- **Complement check:** Re-frame as Nansen-AI's execution counterpart (Nansen tells you what; we execute it). Does not compete with Virtuals (no launchpad). PASS.
- **Live-demo-able in 90s?** YES — "deposit $1000 USDC → agent splits into USDY + mUSD strategies → live yield ticking on stream."

### 2. The Hive (Solana AI Hackathon 2025 winner)

- **Hackathon:** Solana AI Hackathon, Jan 2025
- **Prize:** Overall 1st, $60,000 from SendAI
- **Chain:** Solana
- **Demo / repo:** X @askthehive_ai — https://solanafloor.com/news/from-ideas-to-impact-meet-the-hackathon-winners-powering-solana-s-ai-revolution
- **What it does:** Modular interoperable DeFAI proxy network — AI agents transact directly from user wallets via Jupiter for swaps. "Conversational DeFi" execution layer.
- **Why it won:** Solana-native, executes real transactions from own wallet (non-custodial), Jupiter aggregator pairing.
- **Mantle-port viability:** 5/5 — direct conceptual fit for Byreal Agent Skills CLI (Solana side) + Mantle settlement. Byreal CLMM is literally the Solana DEX layer; Mantle is the identity + receipt + RWA layer.
- **What we'd add as differentiator:** ERC-8004 reputation portable across Solana DEX (Byreal) and Mantle RWA, plus RealClaw skill packaging — Hive was Solana-only.
- **Track placement:** Track 6 (primary, Byreal-sponsored Solana lane) + Track 3 (RWA strategies routed back to Mantle).
- **Complement check:** Hive is the direct architectural precedent — but our differentiator is cross-ecosystem (Solana+Mantle) and RWA-flavored, not pure spot. Re-frame as Hive's "settlement & identity rail." PASS — but watch for judge familiarity.
- **Live-demo-able in 90s?** YES — chat interface, live swap on Byreal, USDY position appearing on Mantle.

### 3. Maki

- **Hackathon:** ETHGlobal Cannes 2026
- **Prize:** ETHGlobal Cannes 2026 Finalist (top 10/~400)
- **Chain:** Ethereum (Pi hardware)
- **Demo / repo:** https://trymaki.xyz — https://github.com/slaviquee/maki — https://ethglobal.com/showcase/maki-564eg
- **What it does:** Hardware-signed onchain agent for DeFi. Model interprets intent; keys live in Pi hardware. Skills are prompt-only; tools invoke deterministic adapters. Every write is simulated + policy-checked before signing.
- **Why it won:** Best-in-class agent safety architecture — "model never touches keys" is a judge-winning soundbite. Addresses the #1 fear of agentic DeFi.
- **Mantle-port viability:** 4/5 — Hardware angle harder to demo live, but the architecture (policy engine, simulation, deterministic adapters) is directly portable. Mantle settlement + Byreal execution + ERC-8004 identity binds nicely.
- **What we'd add as differentiator:** Replace "hardware isolation" with ERC-8004 verifiable agent attestation (any agent on the registry has its policy enforced) + cross-chain skills (Byreal Skills CLI). This makes the safety argument cryptographic, not just hardware-physical.
- **Track placement:** Track 6 (primary — Byreal Agent Skills CLI demo) + Track 3 (RWA policy enforcement).
- **Complement check:** Doesn't compete with any judge. Reads as Allora-AI / Nansen-AI safety layer. PASS.
- **Live-demo-able in 90s?** YES — "watch agent reject malicious tx in real-time" is a brilliant Demo-Day moment for the Human-vs-AI mechanism.

### 4. Autonome

- **Hackathon:** ETHGlobal New Delhi 2025
- **Prize:** Finalist + Polygon Best Use of x402 Agentic Payments 1st place + The Graph Hypergraph 2nd place
- **Chain:** Polygon
- **Demo / repo:** https://github.com/Suryansh-23/autonome — https://ethglobal.com/showcase/autonome-d8cxe
- **What it does:** Payment + identity infrastructure where humans and AI agents access content on equal terms — sites get compensated by scraping agents via x402. "The agent-friendly web."
- **Why it won:** Won x402 prize because it's actually deployed/functional; novel "publisher economy" framing.
- **Mantle-port viability:** 4/5 — x402 + ERC-8004 is exactly the Mantle Turing Test thesis. Pivot from "compensate publishers" to "compensate RWA data providers" or "agent-to-agent service marketplace settled on Mantle USDY/mUSD."
- **What we'd add as differentiator:** ERC-8004 reputation (Autonome doesn't have it), Byreal-Skills for the agent leg, Mantle as settlement chain instead of Polygon — and a Track 3 RWA twist (e.g., agents pay each other for RWA pricing oracles in mUSD).
- **Track placement:** Track 6 (primary, x402-shaped) + Track 3 (RWA settlement angle).
- **Complement check:** No competitive overlap with judges. PASS.
- **Live-demo-able in 90s?** YES — "AI agent pays human-curated RWA oracle agent in mUSD via x402, live."

### 5. DeFlow

- **Hackathon:** ETHOnline 2025
- **Prize:** Finalist + Lit Protocol Best DeFi Automation Vincent Apps
- **Chain:** 15+ EVM chains (Base, Arbitrum, Optimism, Polygon)
- **Demo / repo:** https://deflow.vikings.studio/ — https://github.com/AceVikings/ethonline-defi-layer — https://ethglobal.com/showcase/deflow-hoauz
- **What it does:** Natural-language → multi-step DeFi workflows. "Swap 0.01 ETH to USDC on Base" → AI plans, validates, executes across chains. ASI:One agents.
- **Why it won:** Strong NL→tx pipeline that actually works multi-chain, polished frontend, Lit/Vincent policy integration.
- **Mantle-port viability:** 4/5 — Add Mantle as supported chain, route RWA strategies (USDY, mUSD, MI4) through it. Add Byreal Solana leg via Skills CLI.
- **What we'd add as differentiator:** ERC-8004 verified workflow templates (every workflow signed by a registered agent w/ reputation), RWA-aware planner that knows mUSD vs USDY trade-offs, Byreal cross-chain leg. DeFlow is workflow-builder; we'd be workflow-builder-with-identity-and-RWA.
- **Track placement:** Track 3 (primary, RWA aware) + Track 6 (Byreal Solana cross-chain).
- **Complement check:** Doesn't directly compete with judges — DeFlow's market is "DeFi-savvy" users. PASS.
- **Live-demo-able in 90s?** YES — "type: rebalance $5K across USDY and Byreal LP → agent executes both legs" is clean.

### 6. Opto (Hedera Overall Winner)

- **Hackathon:** ETHGlobal New York 2025
- **Prize:** Hedera Overall Winner + Hedera EVM Smart Contracts 1st + Flow Builder Pool
- **Chain:** Hedera + multi-chain
- **Demo / repo:** https://opto-one.vercel.app/ — https://github.com/abcd5251/Opto — https://ethglobal.com/showcase/opto-owf77
- **What it does:** Cross-chain investment protocol — maximize yield across multiple protocols and chains in ONE click, with AI assistant for strategy tailoring and portfolio checks.
- **Why it won:** "Hedera Overall Winner" = a single sponsor's top prize. One-click cross-chain is judge-friendly.
- **Mantle-port viability:** 5/5 — Mantle has all the RWA primitives Opto would aggregate (USDY, mETH, fBTC, MI4). Direct port: replace Hedera with Mantle as home base, add Byreal Solana leg for spot yield.
- **What we'd add as differentiator:** ERC-8004 agent identity per strategy (so agents earn portable rep), RWA-first (not just any token), Byreal cross-chain.
- **Track placement:** Track 3 (primary — RWA cross-chain yield) + Track 6 (Byreal leg).
- **Complement check:** No judge overlap. PASS.
- **Live-demo-able in 90s?** YES — one-click is literally a 90s demo by definition.

### 7. NYAnCAT

- **Hackathon:** ETHGlobal Cannes 2025
- **Prize:** Oasis Protocol Build on Oasis Stack 1st place + World Pool Prize
- **Chain:** Oasis + World
- **Demo / repo:** https://nyancat.finance/ — https://github.com/NYANCAT-IO/NYANCAT-CORE — https://ethglobal.com/showcase/nyancat-p11d3
- **What it does:** AI "personal banking cat" Mini App — searches CEXs for low-risk yield, executes strategies, surfaces news, runs governance. Consumer-friendly framing as a pet/companion.
- **Why it won:** Consumer-facing personality + actual fund management. Demo-friendly mascot.
- **Mantle-port viability:** 4/5 — Replace CEX-yield with RWA yield (USDY, MI4). Personality + RWA banker is judge-friendly + thesis-aligned for Hashed (judges).
- **What we'd add as differentiator:** ERC-8004 reputation (so the cat earns trust over time and "remembers" you across sessions cryptographically), Byreal as the spot-yield leg, mUSD as settlement. NYAnCAT is CEX-leaning; we'd be DeFi-and-RWA-leaning.
- **Track placement:** Track 3 (primary RWA personal banker) + Track 6 (agentic wallet face).
- **Complement check:** No judge overlap, in fact Hashed thesis-aligned (stablecoins + AI agents). PASS.
- **Live-demo-able in 90s?** YES — cute mascot + live yield ticking.

### 8. Ask CaiShen

- **Hackathon:** ETHGlobal Taipei 2025
- **Prize:** ETHGlobal Taipei 2025 Finalist
- **Chain:** Ethereum
- **Demo / repo:** https://ask-caishen.up.railway.app/ — https://github.com/antoncoding/ask-vennett — https://ethglobal.com/showcase/ask-ciashen-n2fja
- **What it does:** AI portfolio analyzer with dynamic UI generation. Suggests hedging, yield enhancement, risk reduction — tailored UI for beginner vs pro.
- **Why it won:** Dynamic UI generation is novel; portfolio reasoning is reliable.
- **Mantle-port viability:** 4/5 — Add Mantle RWA (USDY, MI4, fBTC) to the asset universe; let CaiShen suggest mUSD vs USDY rotations. Easy.
- **What we'd add as differentiator:** Execution layer (CaiShen only analyzes — we execute via Byreal + Mantle), ERC-8004 reputation so the agent has track record. CaiShen is advice-only; we'd be advice + execute + reputable.
- **Track placement:** Track 3 (primary) + Track 6 (execution leg).
- **Complement check:** Nansen-AI competitor — re-frame as "Nansen tells you what; CaiShen-portfolio executes it on Mantle." PASS as complement.
- **Live-demo-able in 90s?** YES — chat + dynamic UI is great on a livestream.

### 9. Nimble

- **Hackathon:** Agentic Ethereum 2025
- **Prize:** Finalist + Coinbase AgentKit Pool
- **Chain:** Base
- **Demo / repo:** https://github.com/PureBl00d/Nimble — https://ethglobal.com/showcase/nimble-d5y6f
- **What it does:** AI-agent-based solver network that gets best swap price + handles Morpho vault deposits/withdrawals. Chain-agnostic, demoed on Base. Built on Coinbase AgentKit.
- **Why it won:** Solver network is a clean architecture; Morpho integration is real-yield not toy.
- **Mantle-port viability:** 4/5 — Swap Morpho for Mantle RWA vaults (USDY, MI4), retain solver-network structure. Add Byreal for the swap leg.
- **What we'd add as differentiator:** Solvers are ERC-8004 registered agents with reputation (Nimble's solvers are anonymous). Reputation + reliability = better pricing over time. Byreal Skills CLI per solver.
- **Track placement:** Track 6 (primary, solver/agent commerce) + Track 3 (RWA vault leg).
- **Complement check:** No judge overlap. PASS.
- **Live-demo-able in 90s?** MAYBE — solver networks demo less viscerally than chat agents; need a strong "watch this race" framing.

### 10. Latinum (Solana Breakout Hackathon 2025)

- **Hackathon:** Solana Breakout Hackathon 2025
- **Prize:** AI Track 1st prize, $25,000 USDC
- **Chain:** Solana
- **Demo / repo:** https://arena.colosseum.org/projects/explore/latinum-agentic-commerce
- **What it does:** Payment middleware that lets MCP builders get paid — agentic commerce infrastructure. Solana-native x402 analog.
- **Why it won:** Solid agent-commerce primitive; landed during MCP hype window.
- **Mantle-port viability:** 4/5 — Reframe as Mantle-settled agent commerce that uses Byreal as Solana liquidity entry. Mantle = identity + receipts; Byreal = Solana spot; settle in mUSD or USDC.
- **What we'd add as differentiator:** ERC-8004 identity per MCP-payable agent (Latinum is identity-light), cross-chain (Solana MCP server, Mantle settlement, Byreal liquidity).
- **Track placement:** Track 6 (primary — agentic commerce) + Track 3 (settlement RWA angle).
- **Complement check:** Doesn't overlap judges — different segment (MCP builders, not consumer agents). PASS.
- **Live-demo-able in 90s?** YES — "AI agent calls MCP tool, pays in USDC, gets RWA price oracle response, settles on Mantle" is a fast clean flow.

---

## Honorable mentions (lower fit but instructive)

### Cleopetra (Solana AI Hackathon)
DeFi Agents Track 1st, $15K. Auto-LP positioning + impermanent loss management on Solana DEXes. Excellent Byreal-track fit but pure execution, no identity layer. https://solanafloor.com/news/from-ideas-to-impact-meet-the-hackathon-winners-powering-solana-s-ai-revolution

### Project Plutus (Solana AI Hackathon)
Trading Agents Track 1st, $15K. AI-driven DeFi strategy automation + portfolio mgmt + analytics. Conceptually close to many candidates above; mainly differs by being pure-trading not RWA.

### YieldSeeker (Agentic Ethereum)
ETHGlobal Finalist + Coinbase AgentKit. AI agent finds + executes best yield options. Clean concept, low novelty — easily upstaged by ERC-8004+RWA twist. https://ethglobal.com/showcase/yieldseeker-crg12

### YieldCraft AI (ETHGlobal New Delhi)
Hedera AI 1st place. Cross-chain DeFi yield optimizer on Hedera + Rootstock. Solid execution but no RWA angle, no agent-commerce. https://ethglobal.com/showcase/yieldcraft-ai-96iaa

### DynaVest (ETHGlobal Taipei)
Finalist. "AI-powered gateway to seamless DeFi." Polished UI but generic positioning. https://ethglobal.com/showcase/dynavest-8noha

### Aegis Pay (ETHGlobal Cannes 2026)
Trust layer for AI agents — risk score, policy enforcement, on Hedera. Strong safety architecture but no execution legs. https://ethglobal.com/showcase/aegis-pay-8emw4

### Jarvis (ETHGlobal Buenos Aires)
EVVM MATE 1st. "Agent buys Uber/Amazon via x402." Cute consumer demo but only payment leg. https://ethglobal.com/showcase/jarvis-mcgk0

### joe-y (ETHGlobal Cannes 2026)
Personal finance conversational agent across crypto + traditional. World-ecosystem-only. https://ethglobal.com/showcase/joe-y-cp06v

### Omni402 (ETHGlobal Buenos Aires)
LayerZero Best Omnichain 1st. Pay x402 from any chain, settle in USDC on Base. Direct cross-chain settlement primitive. https://ethglobal.com/showcase/omni402-dvpjd

### Superpage (SF Agentic Commerce x402)
Virtuals SDK 1st. Bridge AI agent economy with global e-commerce via autonomous payments. https://skale.space/blog/san-francisco-agentic-commerce-x402-hackathon-recap-winners

---

## Patterns observed

1. **Winners shipped working execution, not just analysis.** Every top finalist has a real demo URL. Pure "AI analytics" projects (Habeas Data tier) rarely take the top spot — agents that *move money* win.
2. **Cross-chain + agent identity is the 2026 meta.** Cannes 2026 + HackMoney 2026 finalists disproportionately featured ENS identity, x402 payments, and multi-chain skills. The Mantle Turing Test thesis (ERC-8004 + RWA + cross-chain via Byreal) is squarely on this wave.
3. **Mascot / personality framing helps.** NYAnCAT, Maki, Ask CaiShen — winners often wrap technical depth in a consumer character. Helps demo-day livestream optics.
4. **Solana ecosystem favors DeFAI as a category.** Hive, Cleopetra, Plutus, Latinum — Solana's top hackathons explicitly reward "AI executing real DeFi positions." Byreal (Solana) + Mantle (settlement+RWA) inherits that mandate cleanly.
5. **The "safety / non-custodial" angle wins judges' confidence.** Maki's "model never touches keys" was a finalist-determining narrative. Mantle wedges should bake in ERC-8004 attested policy + simulation-before-sign equivalent.

## Anti-patterns observed

1. **"AI trading bot, ML powered" with no real ML** — judges pattern-match these to scams; consistent losers in 2024/2025 trading-agent tracks.
2. **Pure NL-to-tx interface with no differentiation** — DeFlow won by going broad (15+ chains, Lit/Vincent policy), but generic "ChatGPT for DeFi" submissions consistently lose to specialized agents.
3. **Single-chain agents in 2026** — judges expect cross-chain by default now; Solana-only or Mantle-only submissions read as undersized.
4. **Analytics dashboards rebranded as "AI agents"** — Habeas Data won an Octav-specific prize but never breaks into ETHGlobal Finalist tier. "Agent" must *act* not just *display*.
5. **Token launchpads as the wedge** — already saturated by Virtuals, Clanker, etc. Will read as a Virtuals competitor and get punished by the judge panel.

## Open questions / couldn't-find

- **Devpost winner details for MNEE / One Trillion Agents / Yard Work hackathons** — these are recent / ongoing; no completed winner gallery yet to mine.
- **DoraHacks BUIDL gallery direct queries** — didn't get to deep-dive these; ETHGlobal corpus was richer and time-budgeted.
- **Exact $-prizes for several Cannes 2026 sponsor tracks** — ETHGlobal corpus has prize titles but not amounts. Doesn't change ranking but matters for "is this a paid winner or just a finalist mention."
- **Whether ETHGlobal NY 2025 had a dedicated agent-commerce track winner separate from Opto** — partial visibility into that gallery.
- **Virtuals ACP-specific Base hackathon winners** — found Superpage + Pincer references from SF x402, but no dedicated Virtuals ACP hackathon recap surfaced.
