/**
 * Scenario manifest — Mantle Sepolia (5003). Each scenario gives the agent a
 * plain-English goal + an on-chain assertion that the goal was actually met.
 *
 * Failures here are LOAD-BEARING — they identify a real production bug in
 * either the model's tool-picking, the tool's schema, or the on-chain target.
 */
import { ADDRESSES } from '@mpilot/shared';
import { erc20Abi, formatUnits, parseAbi, parseUnits } from 'viem';

const IDENTITY_REGISTRY = ADDRESSES.mantleSepolia.erc8004.identityRegistry;
const identityAbi = parseAbi(['function balanceOf(address owner) view returns (uint256)']);

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
    id: 'erc8004-register-agent',
    goal: 'Mint an ERC-8004 identity NFT for this wallet on Mantle Sepolia.',
    async snapshot({ publicClient, owner }) {
      return {
        agentCount: await publicClient.readContract({
          address: IDENTITY_REGISTRY,
          abi: identityAbi,
          functionName: 'balanceOf',
          args: [owner],
        }),
      };
    },
    async assert({ before, after }) {
      const delta = after.agentCount - before.agentCount;
      return { pass: delta >= 1n, detail: `agentCount delta: ${delta} (need ≥1)` };
    },
  },
  {
    id: 'aave-supply-usdc',
    goal:
      'Supply 10 USDC to the Aave V3 pool on Mantle Sepolia. The USDC reserve is at ' +
      `${ADDRESSES.mantleSepolia.tokens.USDC}.`,
    async snapshot({ publicClient, owner, tokens }) {
      return { usdc: await readErc20(publicClient, tokens.USDC, owner) };
    },
    async assert({ before, after }) {
      const out = before.usdc - after.usdc;
      return {
        pass: out >= parseUnits('10', 6),
        detail: `USDC drained: ${formatUnits(out, 6)} (need ≥10)`,
      };
    },
  },
  {
    id: 'aave-supply-then-borrow',
    goal: 'Supply 100 USDC to Aave V3, then borrow 5 WMNT at safe LTV.',
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
    id: 'aave-withdraw',
    goal: 'Withdraw 5 USDC from Aave V3 back to my wallet.',
    async snapshot({ publicClient, owner, tokens }) {
      return { usdc: await readErc20(publicClient, tokens.USDC, owner) };
    },
    async assert({ before, after }) {
      const inflow = after.usdc - before.usdc;
      return {
        pass: inflow >= parseUnits('5', 6),
        detail: `USDC inflow: ${formatUnits(inflow, 6)} (need ≥5)`,
      };
    },
  },
  {
    id: 'erc8004-register-then-attest',
    goal:
      'First mint an ERC-8004 identity NFT for this wallet, then record an attestation ' +
      'against that new agent for a completed Aave supply action. Use providerSchema ' +
      '"concierge.aave.v3.supply.v1" and an actionPayload of ' +
      '{ "schema": "concierge.aave.v3.supply.v1", "asset": "USDC", "amount": "10000000" }. ' +
      'Pass the agentId returned by the mint into the attestation call.',
    async snapshot({ publicClient, owner }) {
      return {
        agentCount: await publicClient.readContract({
          address: IDENTITY_REGISTRY,
          abi: identityAbi,
          functionName: 'balanceOf',
          args: [owner],
        }),
      };
    },
    async assert({ before, after, planner }) {
      const minted = after.agentCount - before.agentCount >= 1n;
      const names = (planner.toolCalls ?? []).map((c) => c.toolName);
      const attested = names.includes('erc8004_attestAction');
      const attestResult = (planner.toolResults ?? []).find(
        (r) => r.toolName === 'erc8004_attestAction',
      );
      const feedbackHash = (attestResult?.output ?? attestResult?.result)?.feedbackHash;
      return {
        pass: minted && attested && Boolean(feedbackHash),
        detail: `minted: ${minted} | attest called: ${attested} | feedbackHash: ${feedbackHash ?? '—'}`,
      };
    },
  },
  {
    id: 'dex-swap-wmnt-usdc',
    goal: 'Swap 1 WMNT for USDC on Merchant Moe with ≤1% slippage.',
    async snapshot({ publicClient, owner, tokens }) {
      return {
        wmnt: await readErc20(publicClient, tokens.WMNT, owner),
        usdc: await readErc20(publicClient, tokens.USDC, owner),
      };
    },
    async assert({ before, after }) {
      const wmntOut = before.wmnt - after.wmnt;
      const usdcIn = after.usdc - before.usdc;
      return {
        pass: wmntOut === parseUnits('1', 18) && usdcIn > 0n,
        detail: `WMNT out: ${formatUnits(wmntOut, 18)} | USDC in: ${formatUnits(usdcIn, 6)}`,
      };
    },
  },
];
