# golden-path — does Concierge actually achieve the goal?

The single test that decides whether the project ships. Until this passes,
no other phase matters — every PR is plumbing.

## Status 2026-06-15

**Scenario 1: PASS on real Mantle Sepolia.**

```
[1/2] erc8004-register-agent
  goal: Mint an ERC-8004 identity for this wallet on Mantle Sepolia.
  Model: google gemini-2.5-flash
  before: {"agentCount":"1"}
  after:  {"agentCount":"2"}
  PASS  agentCount delta: 1 (need ≥1)
```

The agent received the goal, the LLM picked the right tool, the tool fired a
real `register()` tx against ERC-8004 IdentityRegistry on Sepolia
(`0x8004A818BFB912233c491871b3d84c89A494BD9e`), the on-chain agent count
moved 1 → 2. **The loop is real.**

**Scenario 2: known issue** — Gemini 2.5 Flash returns `finishReason: 'stop'`
with 0 tool calls when the tool input has `catchall(z.unknown())` fields. Same
goal works on Gemini 2.5 Pro (verified, but blocked by free-tier rate limits).
Production planner spec needs Anthropic / OpenAI / Gemini-Pro tier.

## Bugs uncovered + fixed

1. **`z.bigint()` in ConciergeTool schemas** — JSON Schema has no bigint type;
   every Concierge tool using bigint was uncallable end-to-end. Fixed in
   `packages/providers/erc8004/src/actions/{registerAgent,attestAction}.ts`.
2. **`DeployAll.s.sol` HelperConfig bug** — script logged correct simulation
   addresses but no code landed on Sepolia. Fixed via flat
   `contracts/script/DeploySepolia.s.sol`.
3. **Mantle Sepolia addresses all zero** — addresses.ts now points at real
   deployed mocks for USDC, WMNT, mETH, sUSDe, USDe, USDY.

See `~/.claude/projects/-Users-abu-dev-hackathon-mantel/memory/golden_path_findings_2026_06_15.md`
for the long-form post-mortem.

## How to run it

```sh
# 1. Generate a fresh test EOA in .env.local
cd examples/golden-path && pnpm keygen

# 2. Fund the address with Sepolia MNT (the harness prints the address)
#    https://faucet.sepolia.mantle.xyz

# 3. Deploy the mocks ONCE (~30s, costs ~0.05 MNT)
cd ../../contracts
GOLDEN_KEY=$(grep '^GOLDEN_PRIVATE_KEY=' ../examples/golden-path/.env.local | cut -d= -f2)
forge script script/DeploySepolia.s.sol \
  --rpc-url https://rpc.sepolia.mantle.xyz \
  --private-key "$GOLDEN_KEY" \
  --broadcast --skip-simulation --slow -vv

# 4. Update packages/shared/src/addresses.ts with the printed addresses
#    (already done at the commit on `feat/golden-path-e2e` — only rerun
#    if you deployed fresh mocks)

# 5. Mint test tokens to the EOA (deployer holds MINTER_ROLE)
cd ../examples/golden-path && node scripts/mint-test-funds.mjs

# 6. Set the LLM key
#    Anthropic: ANTHROPIC_API_KEY=sk-ant-... in apps/worker/.env
#    Google:    GEMINI_API_KEY in shell env (the harness picks whichever exists)

# 7. Run
node src/index.mjs
```

## Why Sepolia, not Anvil fork

Earlier draft of this harness used `anvil --fork-url` of Mantle mainnet.
Abu correctly called that out as glorified unit testing — same fancy mocks,
no real-network friction. The current path runs against ACTUAL Mantle Sepolia:
real RPC, real mempool, real MantleScan link to click, real faucet-funded
test EOA. The mocks ARE deployed (we own them via the test deployer key) but
the txs are real on the real chain.

## What this harness does NOT cover

- The smart-account / kernel signing path (a separate test in `apps/web` r2)
- The Privy auth boundary (covered by `apps/web` r2.5 boundary tests)
- The MCP server (covered by `packages/mcp` tests + manual Claude Desktop)

Those are separately tested. This harness is laser-focused on the question
**"does the agent achieve the user's goal when given a real LLM, real
protocols, and real testnet mechanics?"**

Scenario 1 PROVED YES.
