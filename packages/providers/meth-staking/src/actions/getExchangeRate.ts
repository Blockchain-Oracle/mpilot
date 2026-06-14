import { tool } from '@concierge-mantle/tools';
import { z } from 'zod';
import { computeRateFromSqrt, fetchPoolState } from '../_agni.ts';
import type { ActionContext } from '../_context.ts';
import { POSITIVE_INT_STR } from '../_validators.ts';

export const GetExchangeRateInput = z.object({});

export const GetExchangeRateOutput = z.object({
  rate: POSITIVE_INT_STR.describe(
    'mETH/WETH exchange rate from Agni DEX spot price (1e18-scaled; 1e18 = 1:1 peg)',
  ),
});

export async function executeGetExchangeRate(
  ctx: ActionContext,
): Promise<z.infer<typeof GetExchangeRateOutput>> {
  const { sqrtPriceX96 } = await fetchPoolState(
    ctx.publicClient,
    ctx.addresses.agniMethWeth,
    'getExchangeRate',
  );
  const rate = computeRateFromSqrt(sqrtPriceX96);
  return { rate: rate.toString() };
}

export function createGetExchangeRateTool(ctx: ActionContext) {
  return tool({
    name: 'getExchangeRate',
    description:
      'Returns the current mETH/WETH exchange rate from the Agni DEX spot price, expressed as ' +
      'a 1e18-scaled integer (e.g. 1_092_000_000_000_000_000 = 1.092 WETH per mETH). ' +
      'Pure read — no transaction.',
    inputSchema: GetExchangeRateInput,
    outputSchema: GetExchangeRateOutput,
    supportsNetwork: (chainId) => chainId === ctx.chainId,
    invoke: () => executeGetExchangeRate(ctx),
  });
}
