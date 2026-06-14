import { tool } from '@concierge-mantle/tools';
import { z } from 'zod';
import { fetchYieldBps } from '../_agni.ts';
import type { ActionContext } from '../_context.ts';

export const GetYieldRateInput = z.object({});

export const GetYieldRateOutput = z.object({
  yieldBps: z
    .number()
    .int()
    .positive()
    .max(10_000)
    .describe('Annualised mETH staking yield in basis points, derived from 7-day Agni DEX TWAP'),
});

export async function executeGetYieldRate(ctx: ActionContext) {
  const yieldBps = await fetchYieldBps(
    ctx.publicClient,
    ctx.addresses.agniMethWeth,
    'getYieldRate',
  );
  return { yieldBps };
}

export function createGetYieldRateTool(ctx: ActionContext) {
  return tool({
    name: 'getYieldRate',
    description:
      'Returns the annualised mETH staking yield in basis points derived from a 7-day Agni DEX TWAP. ' +
      'Throws InsufficientLiquidity if the mETH/WETH pool has fewer than 7 days of observations. ' +
      'Pure read — no transaction.',
    inputSchema: GetYieldRateInput,
    outputSchema: GetYieldRateOutput,
    supportsNetwork: (chainId) => chainId === ctx.chainId,
    invoke: () => executeGetYieldRate(ctx),
  });
}
