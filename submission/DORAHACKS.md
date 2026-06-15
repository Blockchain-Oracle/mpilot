# {{PRODUCT_NAME}} — DoraHacks BUIDL Submission

**Hackathon:** Mantle Turing Test 2026 — AI Awakening (Phase 2)
**Track:** AI x RWA

---

## What it is

{{PRODUCT_NAME}} is an autonomous AI agent that manages a DeFi position on Mantle 24/7. The user sets a financial goal in plain English; the agent runs a continuous **plan → simulate → propose → execute → record** loop across 7 Mantle protocols: Aave V3, Mantle DEXes, Ethena sUSDe, Ondo USDY, mETH staking, Li.Fi bridge, and ERC-8004 reputation.

## Which RWA is brought on-chain

We act on **two real-world-asset yield sources already tokenized on Mantle**:

- **Ondo USDY — tokenized US Treasuries.** The agent reads the live USDY redemption-price oracle to track real Treasury yield on-chain.
- **mETH — ETH staking yield.** The agent reads the mETH exchange rate (the on-chain accrual of staking rewards) to track staking yield.

The agent monitors these RWA yields continuously and acts on them. **mETH** entry/exit is executable today: the agent acquires mETH from WETH via a DEX swap and can unwind back to WETH. **USDY** is currently monitoring-focused — we read its real on-chain yield, but DEX liquidity for USDY on Mantle is presently thin, so we surface USDY opportunities rather than force a low-liquidity swap. (Honest caveat, stated up front.)

## The AI's role

The AI is the decision-maker, not a chatbot wrapper. Each tick, it:

1. **Plans** — interprets the user's goal against live on-chain state and RWA yields.
2. **Simulates** — dry-runs the candidate action (expected APR delta, post-action health factor).
3. **Proposes** — surfaces the action with a structured rationale for approval or autopilot.
4. **Executes** — signs and submits via the user's ERC-4337 session key.
5. **Records** — writes an **ERC-8004 reputation attestation** for the action, on-chain, forever.

## How it's realized on Mantle

- All 7 protocol integrations target Mantle.
- RWA yields are read from **on-chain sources on Mantle**: the USDY redemption-price oracle and the mETH exchange rate.
- Reputation uses the **canonical ERC-8004 contracts on Mantle**: Identity `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`, Reputation `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`.
- Our own **ConciergeRegistry** is deployed on **Mantle mainnet** (UUPS proxy, see below).

## Which actions are autonomous

The agent autonomously **plans, simulates, and proposes** every tick. **Execution** is autonomous per category once the user grants autopilot, and manual-approval otherwise; an Emergency Stop halts the loop at any moment. The **ERC-8004 attestation (`record`)** runs autonomously after every successful execution. Concretely, the agent autonomously: monitors RWA yields (USDY oracle, mETH rate), acquires/unwinds mETH via DEX swap, supplies/borrows on Aave V3, bridges via Li.Fi, and attests each action.

## Key differentiator — four surfaces, one core

Unlike competitors who ship a single web app, the **same agent core** is consumable as:

1. **Web app** — the flagship reference consumer.
2. **MCP server** — `claude mcp add ... -- npx -y {{NPM_SCOPE}}/mcp`, runs inside Claude Desktop and other MCP hosts.
3. **npm SDK** — `pnpm add {{NPM_SCOPE}}/sdk`, drop the agent's DeFi tools into any agent runtime.
4. **Agent skill** — installable into agent hosts via `npx skills add`.

The marginal cost of each extra surface is ~20-40 LOC of adapter code, because all four hang off one framework-agnostic tool registry.

## Deployed contracts (Mantle mainnet)

- **ConciergeRegistry (UUPS proxy):** `0xE54B60382bC85C14abc15A20a0fB90d6FAea8025`
- **ConciergeRegistry (implementation):** `0xc784362387E1DCD2A99D1000d9c852F4EA244761`

## Live mainnet proof

The agent registered its own **ERC-8004 identity (agent #133)** on Mantle mainnet.
Transaction: `0x5d0fcdd38f44b1a07e279562587cf03a655eeb3cf2ba3cc1e5e9dc7022cb80ed`

## Links

- **Demo video:** {{DEMO_URL}}
- **Live app:** https://{{DOMAIN}}
- **Repo:** {{REPO_URL}}
- **ConciergeRegistry on MantleScan:** https://mantlescan.xyz/address/0xE54B60382bC85C14abc15A20a0fB90d6FAea8025
- **Identity registration tx:** https://mantlescan.xyz/tx/0x5d0fcdd38f44b1a07e279562587cf03a655eeb3cf2ba3cc1e5e9dc7022cb80ed
