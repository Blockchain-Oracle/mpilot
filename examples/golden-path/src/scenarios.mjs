/**
 * Scenario manifest — Mantle Sepolia (5003) playground deploy.
 *
 * Each entry: a plain-English goal + a per-scenario assertion that reads
 * on-chain state and returns {pass, detail}. Tokens come from the SEPOLIA_TOKENS
 * injected by the runner (canonical addresses from `@concierge-mantle/shared`).
 */
import { erc20Abi, formatUnits, parseUnits } from 'viem';

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
    async snapshot({ publicClient, owner, tokens }) {
      return { usdc: await readErc20(publicClient, tokens.USDC, owner) };
    },
    async assert({ before, after }) {
      const drained = before.usdc - after.usdc;
      const ok = drained >= parseUnits('10', 6);
      return { pass: ok, detail: `USDC out: ${formatUnits(drained, 6)} (need ≥10)` };
    },
  },
  {
    id: 'supply-then-borrow',
    goal: 'Supply 100 USDC to Aave V3, then borrow 5 WMNT at a safe LTV.',
    async snapshot({ publicClient, owner, tokens }) {
      return {
        usdc: await readErc20(publicClient, tokens.USDC, owner),
        wmnt: await readErc20(publicClient, tokens.WMNT, owner),
      };
    },
    async assert({ before, after }) {
      const usdcOut = before.usdc - after.usdc;
      const wmntIn = after.wmnt - before.wmnt;
      const ok = usdcOut >= parseUnits('100', 6) && wmntIn >= parseUnits('5', 18);
      return {
        pass: ok,
        detail: `USDC out: ${formatUnits(usdcOut, 6)} | WMNT in: ${formatUnits(wmntIn, 18)}`,
      };
    },
  },
  {
    id: 'meth-stake',
    goal: 'Stake 1 MNT into mETH.',
    async snapshot({ publicClient, owner, tokens }) {
      return {
        meth: await readErc20(publicClient, tokens.mETH, owner),
        native: await publicClient.getBalance({ address: owner }),
      };
    },
    async assert({ before, after }) {
      const methIn = after.meth - before.meth;
      // Expect at least ~0.9 mETH (allow for the exchange rate < 1).
      const ok = methIn > parseUnits('0.9', 18);
      return { pass: ok, detail: `mETH in: ${formatUnits(methIn, 18)}` };
    },
  },
  {
    id: 'withdraw-from-aave',
    goal: 'Withdraw 5 USDC from Aave V3 back to my wallet.',
    async snapshot({ publicClient, owner, tokens }) {
      return { usdc: await readErc20(publicClient, tokens.USDC, owner) };
    },
    async assert({ before, after }) {
      const inflow = after.usdc - before.usdc;
      const ok = inflow >= parseUnits('5', 6);
      return { pass: ok, detail: `USDC in: ${formatUnits(inflow, 6)} (need ≥5)` };
    },
  },
];
