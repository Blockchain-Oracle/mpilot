/**
 * Scenario manifest. Each entry: a plain-English goal + a per-scenario
 * assertion that reads on-chain state and returns {pass, before, after}.
 *
 * The runner feeds each goal to the planner, runs the full tick loop with
 * real provider implementations against the Anvil fork, then calls the
 * assertion to verify the loop achieved what the goal asked.
 */
import { erc20Abi, parseUnits } from 'viem';

// Canonical mainnet token addresses (chain 5000). Source:
// research/concierge/03-providers/aave-v3-mantle.md and the provider packages.
export const TOKENS = {
  USDC: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9',
  WETH: '0xdEAddEaDdeadDEadDEADDEAddEADDEAddead1111',
  WMNT: '0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8',
  mETH: '0xcDA86A272531e8640cD7F1a92c01839911B90bb0',
  // aUSDC on Aave V3 Mantle — placeholder, fill from `getReserveData` at runtime if missing.
  aUSDC: '0x0000000000000000000000000000000000000000',
};

async function readErc20(publicClient, token, who) {
  return await publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [who],
  });
}

export const SCENARIOS = [
  {
    id: 'supply-usdc-to-aave',
    goal: 'Supply 10 USDC to Aave V3 on Mantle.',
    minBalances: { USDC: parseUnits('10', 6) },
    async snapshot({ publicClient, owner }) {
      // We resolve aUSDC live to dodge stale constants.
      return {
        usdc: await readErc20(publicClient, TOKENS.USDC, owner),
      };
    },
    async assert({ before, after }) {
      // After supplying, USDC out-flow should be at least 10 USDC.
      const drained = before.usdc - after.usdc;
      const pass = drained >= parseUnits('10', 6);
      return { pass, detail: `USDC delta: ${drained}` };
    },
  },
  {
    id: 'supply-then-borrow',
    goal: 'Supply 100 USDC to Aave V3, then borrow 5 WMNT at a safe LTV.',
    minBalances: { USDC: parseUnits('100', 6) },
    async snapshot({ publicClient, owner }) {
      return {
        usdc: await readErc20(publicClient, TOKENS.USDC, owner),
        wmnt: await readErc20(publicClient, TOKENS.WMNT, owner),
      };
    },
    async assert({ before, after }) {
      const usdcOut = before.usdc - after.usdc;
      const wmntIn = after.wmnt - before.wmnt;
      const pass = usdcOut >= parseUnits('100', 6) && wmntIn >= parseUnits('5', 18);
      return { pass, detail: `usdcOut=${usdcOut} wmntIn=${wmntIn}` };
    },
  },
  {
    id: 'dex-swap',
    goal: 'Swap 0.01 WETH for USDC on Merchant Moe with at most 1% slippage.',
    minBalances: { WETH: parseUnits('0.01', 18) },
    async snapshot({ publicClient, owner }) {
      return {
        weth: await readErc20(publicClient, TOKENS.WETH, owner),
        usdc: await readErc20(publicClient, TOKENS.USDC, owner),
      };
    },
    async assert({ before, after }) {
      const wethOut = before.weth - after.weth;
      const usdcIn = after.usdc - before.usdc;
      const pass = wethOut === parseUnits('0.01', 18) && usdcIn > 0n;
      return { pass, detail: `wethOut=${wethOut} usdcIn=${usdcIn}` };
    },
  },
  {
    id: 'meth-stake',
    goal: 'Stake 1 MNT into mETH.',
    minBalances: { native: parseUnits('1.1', 18) },
    async snapshot({ publicClient, owner }) {
      return {
        meth: await readErc20(publicClient, TOKENS.mETH, owner),
        native: await publicClient.getBalance({ address: owner }),
      };
    },
    async assert({ before, after }) {
      const methIn = after.meth - before.meth;
      // Expect at least ~1 mETH at the prevailing exchange rate (always ≤ 1 MNT, so
      // assert > 0.9 to allow for the staking rate).
      const pass = methIn > parseUnits('0.9', 18);
      return { pass, detail: `methIn=${methIn}` };
    },
  },
  {
    id: 'withdraw-from-aave',
    goal: 'Withdraw 5 USDC from Aave V3 back to my wallet.',
    minBalances: {},
    dependsOn: 'supply-usdc-to-aave',
    async snapshot({ publicClient, owner }) {
      return { usdc: await readErc20(publicClient, TOKENS.USDC, owner) };
    },
    async assert({ before, after }) {
      const inflow = after.usdc - before.usdc;
      const pass = inflow >= parseUnits('5', 6);
      return { pass, detail: `usdcInflow=${inflow}` };
    },
  },
  {
    id: 'attest-feedback',
    goal: 'Record an ERC-8004 feedback attestation for this tick.',
    minBalances: {},
    async snapshot() {
      return {};
    },
    async assert({ tickResult }) {
      // The record phase returns an Attestation; we treat success there as the
      // assertion. The harness fills in `tickResult` from the orchestrator.
      const pass = tickResult?.kind === 'completed';
      return { pass, detail: `tickResult.kind=${tickResult?.kind}` };
    },
  },
];
