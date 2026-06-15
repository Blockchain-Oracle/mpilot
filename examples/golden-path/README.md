# golden-path — does Concierge actually achieve the goal?

The single test that decides whether this project ships. Everything else is
plumbing; this harness proves the loop end-to-end: **real LLM → real plan →
real on-chain execution → real assertion**.

## Why this exists

Every PR so far has shipped a slice: wallet connect, smart account, identity,
key validation, auth boundary, schemas. None of them prove the load-bearing
question: **when a user tells the agent "supply 10 USDC to Aave", does the
agent actually do it?**

Until this harness passes, no other surface matters. When it passes, every
other surface gets to claim "tested" because the loop underneath is real.

## How it runs — Anvil mainnet fork (NOT real Sepolia)

The audit on 2026-06-15 found that **Mantle Sepolia has zero protocol
deployments** — Aave / Merchant Moe / mETH / Ethena / Ondo are all at
`0x000…000` in `packages/shared/src/addresses.ts` because `story-192`
(Sepolia playground deploy) hasn't shipped. Running against Sepolia today
would silently target the zero address and pass every "tx submitted" check
without proving anything.

So the harness runs against a **local Anvil mainnet fork** — it hits the
REAL Aave V3, Merchant Moe, mETH, Ethena, Ondo, Li.Fi addresses on Mantle
Mainnet (chain 5000) via a forked node so no real funds move. This proves
the same code path that production will take.

Two modes:

| Mode | Command | Real funds? | What it proves |
|---|---|---|---|
| `forked` (default) | `pnpm fork && pnpm run` | No | Same provider code + same model + same tx encoding hit real Aave + real mETH + real DEX at real addresses |
| `live` (opt-in only) | `pnpm run -- --live` | YES — 0.05 MNT min | The forked path is reproducible against the real chain |

## Setup

1. **Install** the workspace:
   ```sh
   pnpm install
   ```

2. **Generate a fresh test EOA key** for the harness:
   ```sh
   pnpm --filter @concierge-mantle/golden-path keygen
   ```
   Writes a 32-byte hex key to `.env.local`. NEVER use a key tied to mainnet
   funds — this harness will sign real-shape txs.

3. **Configure secrets** in `.env.local`:
   ```
   GOLDEN_PRIVATE_KEY=0x…              # from keygen above
   ANTHROPIC_API_KEY=sk-ant-…          # real key, billed per scenario (~$0.05 each)
   PIMLICO_API_KEY=pim_…               # ONLY for the smart-account variant
   ANVIL_FORK_RPC=https://rpc.mantle.xyz  # mainnet RPC to fork from
   ```

4. **Boot Anvil** (one terminal):
   ```sh
   pnpm fork
   # spawns `anvil --fork-url $ANVIL_FORK_RPC --chain-id 5000 --port 8546`
   # then mints 100 MNT + 1000 USDC + 1 WETH to the harness EOA
   ```

5. **Run the harness** (another terminal):
   ```sh
   pnpm run
   ```

## Scenarios

Each scenario gives the agent a plain-English goal, runs one tick (plan →
simulate → propose → execute → record), and asserts the on-chain side
effects.

| # | Goal | Provider(s) | On-chain assertion |
|---|---|---|---|
| 1 | "Supply 10 USDC to Aave" | Aave V3 | `aUSDC.balanceOf(EOA)` increased by ≥ 10 USDC |
| 2 | "Supply 100 USDC to Aave, then borrow 30 MNT at safe LTV" | Aave V3 (supply + borrow + setUserEMode if needed) | Health factor between 1.5 and 3.0; debt token balance ≥ 30 MNT |
| 3 | "Swap 0.01 WETH for USDC on Merchant Moe with ≤ 1% slippage" | Mantle DEX | USDC balance increased; WETH balance decreased by 0.01 |
| 4 | "Stake 1 MNT to mETH" | mETH staking | mETH balance ≥ amount × exchange rate (allow 1bp tolerance) |
| 5 | "Withdraw 5 USDC from Aave back to my wallet" | Aave V3 (withdraw) | Free USDC balance increased; aUSDC balance decreased |
| 6 | "Record a feedback attestation for this tick" | ERC-8004 | `getFeedbackCount(agentId)` increased by 1 |

A pass is **all 6 green**. A partial result is a real finding — it tells us
exactly which protocol's provider needs a fix before the demo.

## Output

```
[1/6] supply-usdc-to-aave …………… PASS  (planner: 2.1s, sim: 0.4s, exec: 6.3s)
        before: aUSDC = 0
        after:  aUSDC = 10.000000
        tx:     0xabcd…1234
        attestation: 0xdef0…5678 (cid: bafy…)
[2/6] supply-and-borrow ……………… PASS
[3/6] dex-swap …………………………………… FAIL  (planner produced 'swap' action with slippageBps=undefined)
[4/6] mantle-staking …………………… PASS
[5/6] withdraw-from-aave ………… PASS
[6/6] attest-feedback ……………… PASS

5/6 green. FAIL at scenario 3 — see above. Fix and re-run.
```

The harness exits with code 0 iff all scenarios pass.

## What it does NOT cover (yet)

- The smart-account / kernel signing path (a separate harness pinned in
  `apps/web` r2 covers that; this one uses a plain EOA so it isolates the
  agent loop from the ERC-4337 stack)
- The Privy auth boundary (covered by the `apps/web` r2.5 boundary tests)
- The MCP server (covered by `packages/mcp` tests + manual Claude Desktop)

Those are separately tested. This harness is laser-focused on the question
**"does the agent achieve the goal when given a real LLM, real protocols,
and real money mechanics?"**

## When this fails

When this fails, do NOT continue any other phase. Fix the scenario that
broke, re-run the harness, and only when 6/6 green move back to whatever
you were doing.
