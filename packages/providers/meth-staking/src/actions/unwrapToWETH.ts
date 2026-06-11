import { ConciergeError } from '@concierge/sdk';
import { tool } from '@concierge/tools';
import { z } from 'zod';
import { computeRateFromSqrt, fetchPoolState } from '../_agni.ts';
import type { ActionContext } from '../_context.ts';
import { NON_NEG_INT_STR, NON_ZERO_ADDRESS } from '../_validators.ts';
import { METH_UNWRAP_SCHEMA, UnwrapAttestationPayloadSchema } from '../attestation.ts';

export const GetUnwrapToWETHInput = z.object({
  amountMeth: z.coerce
    .bigint()
    .positive()
    .describe('Amount of mETH to swap to WETH, in base units (18 decimals)'),
  slippageBps: z
    .number()
    .int()
    .min(1)
    .max(5000)
    .default(50)
    .describe('Max slippage in bps (default 50 = 0.5%)'),
  recipient: NON_ZERO_ADDRESS.describe('Address to receive WETH proceeds'),
});

export const GetUnwrapToWETHOutput = z.object({
  dexTxHash: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/)
    .describe('Transaction hash of the DEX swap that unwrapped mETH → WETH'),
  expectedEthOut: NON_NEG_INT_STR.describe(
    'WETH expected from oracle exchange rate × mETH amount (18 dec, bigint as string). ' +
      'Compare to DEX amountOut via dexTxHash to detect price manipulation.',
  ),
  attestationPayload: UnwrapAttestationPayloadSchema.describe('ERC-8004 attestation payload'),
});

export async function executeGetUnwrapToWETH(
  ctx: ActionContext,
  args: z.infer<typeof GetUnwrapToWETHInput>,
): Promise<z.infer<typeof GetUnwrapToWETHOutput>> {
  const { amountMeth, slippageBps, recipient } = args;

  // Compute oracle-based expected output BEFORE the swap for attestation anchoring.
  const { sqrtPriceX96 } = await fetchPoolState(
    ctx.publicClient,
    ctx.addresses.agniMethWeth,
    'getUnwrapToWETH',
  );
  const rate = computeRateFromSqrt(sqrtPriceX96);
  const expectedEthOut = (amountMeth * rate) / 10n ** 18n;

  let swapResult: { txHash: string; amountOut: string };
  try {
    swapResult = await ctx.dexProvider.actions.swap.invoke({
      tokenIn: ctx.addresses.meth,
      tokenOut: ctx.addresses.weth,
      amountIn: amountMeth,
      slippageBps,
      recipient: recipient as `0x${string}`,
    });
  } catch (err) {
    if (err instanceof ConciergeError) throw err;
    throw new ConciergeError(
      'RpcError',
      '[@concierge/meth-staking] getUnwrapToWETH: DEX swap failed',
      err instanceof Error ? err : undefined,
    );
  }

  const dexTxHash = swapResult.txHash as `0x${string}`;

  const attestationPayload = UnwrapAttestationPayloadSchema.parse({
    schema: METH_UNWRAP_SCHEMA,
    chain: ctx.chainId,
    dexTxHash,
    amountMethIn: amountMeth.toString(),
    expectedEthOut: expectedEthOut.toString(),
    slippageBps,
    ts: Math.floor(Date.now() / 1000),
  });

  return { dexTxHash, expectedEthOut: expectedEthOut.toString(), attestationPayload };
}

export function createGetUnwrapToWETHTool(ctx: ActionContext) {
  return tool({
    name: 'getUnwrapToWETH',
    description:
      'Routes mETH → WETH via the best DEX on Mantle. This is NOT a native unstake — mETH on Mantle ' +
      'is a bridged ERC-20 with no L2 unstake function. The action is a DEX swap. Returns the tx hash ' +
      'and a `concierge.meth.unwrap-via-dex.v1` attestation so future auditors can verify the swap.',
    inputSchema: GetUnwrapToWETHInput,
    outputSchema: GetUnwrapToWETHOutput,
    supportsNetwork: (chainId) => chainId === ctx.chainId,
    invoke: (args) => executeGetUnwrapToWETH(ctx, args),
  });
}
