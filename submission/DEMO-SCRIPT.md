# mPilot — Demo Video Script

**Target length:** 2:00–2:30. Scene-by-scene, with on-screen action + voiceover (VO).

---

## Scene 1 — Hook (0:00–0:15)

**On screen:** mPilot web app hero at https://mpilot.xyz, a live tick streaming — status pill animating `planning → simulating → proposing`.

**VO:** "This is mPilot — an autonomous AI agent that manages your DeFi on Mantle 24/7. It's working right now, before I've clicked anything. You set a goal in plain English; it does the rest."

---

## Scene 2 — The goal + the loop (0:15–0:40)

**On screen:** Type a goal: *"Track RWA yields. Move idle WETH into mETH when staking yield beats my threshold. Never break 70% Aave LTV."* Show the tick card expanding through its phases.

**VO:** "Every tick, the agent runs the same loop: plan, simulate, propose, execute, record. Plan reads live on-chain state. Simulate dry-runs the action — here, expected APR and post-action health factor. Then it proposes."

---

## Scene 3 — The AI x RWA core (0:40–1:10)

**On screen:** Zoom into a tick reading the **mETH exchange rate** and the **Ondo USDY redemption oracle**. Show the agent proposing a WETH → mETH DEX swap.

**VO:** "Here's the AI-x-RWA part. It reads real on-chain real-world-asset yields — Ondo USDY, tokenized US Treasuries, from its redemption-price oracle; and mETH, ETH staking yield, from its exchange rate. When mETH yield clears the threshold, the agent acquires mETH from WETH through a DEX swap — and can unwind it back later. USDY liquidity on Mantle is thin today, so for now USDY is monitoring-focused. We act where the liquidity is real."

---

## Scene 4 — Execute + ERC-8004 attestation (1:10–1:35)

**On screen:** Click Approve. Pill goes `executing → confirmed`. Tx hash links to MantleScan. Card auto-expands the attestation line: *"ERC-8004 feedback written to ReputationRegistry."*

**VO:** "I approve. The action signs with my session key, confirms on Mantle, and the agent writes an ERC-8004 reputation attestation — on-chain, forever. This isn't a black box. Every move the agent makes leaves a verifiable receipt."

---

## Scene 5 — Live mainnet proof (1:35–1:55)

**On screen:** MantleScan, ConciergeRegistry at `0xE54B60382bC85C14abc15A20a0fB90d6FAea8025`. Then the identity-registration tx `0x5d0fcdd...cb80ed` showing **ERC-8004 agent #133**.

**VO:** "And this is live on Mantle mainnet. Our ConciergeRegistry is deployed as a UUPS proxy. The agent registered its own ERC-8004 identity — agent number 133 — on mainnet. Real contracts, real transactions, not a testnet mockup."

---

## Scene 6 — The differentiator: four surfaces (1:55–2:20)

**On screen:** Split view. Left: the web app. Right: Claude Desktop running the MCP server, rendering the same portfolio card and approving an action inside the chat. Then a terminal: `pnpm add @mpilot/sdk` and `npx skills add ...`.

**VO:** "And here's what no single-app competitor can match. The same agent core runs across four surfaces: the web app, an MCP server inside Claude Desktop, an npm SDK any developer can drop into their stack, and an installable agent skill. One core. Same Mantle actions everywhere. That's infrastructure — not just a demo."

---

## Scene 7 — Close (2:20–2:30)

**On screen:** mPilot logo + links: https://mpilot.xyz, repo, demo, `#MantleAIHackathon`.

**VO:** "mPilot. Autonomous DeFi on Mantle, attested on-chain, composable everywhere. Built for the Mantle Turing Test 2026, AI-x-RWA track."

---

### Capture checklist
- [ ] Live tick streaming through all phases (planning → … → attested)
- [ ] mETH rate + USDY oracle reads visible on a tick card
- [ ] Approve → confirmed tx hash → MantleScan link
- [ ] ERC-8004 attestation line visible
- [ ] ConciergeRegistry + agent #133 registration tx on MantleScan
- [ ] Web app + Claude Desktop MCP side by side; SDK/skill install in terminal
