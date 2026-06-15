# mPilot — X Thread (#MantleAIHackathon)

---

**1/**
Meet mPilot: an autonomous AI agent that manages your DeFi on @Mantle_Official 24/7.

Set a goal in plain English. It runs plan → simulate → propose → execute → record across 7 Mantle protocols — and attests every move on-chain.

Live on mainnet. 🧵 #MantleAIHackathon

---

**2/**
The AI x RWA angle 👇

It reads REAL on-chain RWA yields and acts on them:
• Ondo USDY — tokenized US Treasuries (redemption-price oracle)
• mETH — ETH staking yield (exchange rate)

It can acquire/unwind mETH via DEX swaps. USDY liquidity on Mantle is thin today, so USDY is monitoring-focused (honest caveat). #MantleAIHackathon

---

**3/**
Every action earns an ERC-8004 on-chain reputation attestation.

Not a black box — a verifiable, forever audit trail of what the agent did and how it performed. Each tick: plan, simulate, propose, execute, then RECORD. #MantleAIHackathon

---

**4/**
The differentiator: most entries are a single web app.

mPilot ships the SAME agent core across 4 surfaces:
• 🌐 Web app
• 🔌 MCP server (runs in Claude Desktop)
• 📦 npm SDK
• 🛠 Agent skill

One core. ~20-40 LOC per adapter. Infrastructure, not a demo. #MantleAIHackathon

---

**5/**
Proof it's real — already live on Mantle mainnet:

• ConciergeRegistry (UUPS proxy): 0xE54B60382bC85C14abc15A20a0fB90d6FAea8025
• Agent registered ERC-8004 identity #133 on mainnet
• tx: 0x5d0fcdd38f44b1a07e279562587cf03a655eeb3cf2ba3cc1e5e9dc7022cb80ed

#MantleAIHackathon

---

**6/**
Watch it tick live, then run it yourself:

🎥 Demo: https://mpilot.xyz
🌐 App: https://mpilot.xyz
💻 Repo: https://github.com/Blockchain-Oracle/mpilot
🔌 MCP: npx -y @mpilot/mcp

Built for the Mantle Turing Test 2026 — AI x RWA track. #MantleAIHackathon
