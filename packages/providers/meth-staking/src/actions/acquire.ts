import { ConciergeError } from '@concierge-mantle/sdk';
import { tool } from '@concierge-mantle/tools';
import { z } from 'zod';
import { computeRateFromSqrt, fetchPoolState } from '../_agni.ts';
import type { ActionContext } from '../_context.ts';
import { NON_NEG_INT_STR, NON_ZERO_ADDRESS } from '../_validators.ts';
import {
  type AcquireAttestationPayload,
  AcquireAttestationPayloadSchema,
  METH_ACQUIRE_SCHEMA,
} from '../attestation.ts';

export const AcquireInput = z.object({
  amountWeth: z
    .string()
    .regex(/^[1-9]\d*$/)
    .describe('Amount of WETH to swap into mETH (18 decimals) — decimal string'),
  slippageBps: z
    .number()
    .int()
    .min(1)
    .max(5000)
    .default(50)
    .describe('Max slippage in bps (default 50 = 0.5%)'),
  recipient: NON_ZERO_ADDRESS.transform((v) => v as `0x${string}`).describe(
    'Address to receive the mETH',
  ),
});

export const AcquireOutput = z.object({
  dexTxHash: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/)
    .describe('Transaction hash of the DEX swap that acquired mETH'),
  expectedMethOut: NON_NEG_INT_STR.describe(
    'mETH expected from the pool exchange rate × WETH amount (18 dec, bigint as string). ' +
      'Compare to actualMethOut to detect price manipulation between the pre-swap quote and DEX execution.',
  ),
  actualMethOut: NON_NEG_INT_STR.describe(
    'Actual mETH received from the DEX swap (18 dec, bigint as string). Recorded in the attestation.',
  ),
  attestationPayload: AcquireAttestationPayloadSchema.describe('ERC-8004 attestation payload'),
});

export async function executeAcquire(
  ctx: ActionContext,
  args: z.infer<typeof AcquireInput>,
): Promise<z.infer<typeof AcquireOutput>> {
  const { amountWeth: amountWethStr, slippageBps, recipient } = args;
  const amountWeth = BigInt(amountWethStr);

  // Pre-swap pool rate anchors the expected output for the attestation. Pool read
  // and rate computation are pre-swap — any failure here moved no funds, safe to retry.
  let rate: bigint;
  try {
    const { sqrtPriceX96 } = await fetchPoolState(
      ctx.publicClient,
      ctx.addresses.agniMethWeth,
      'acquire',
    );
    rate = computeRateFromSqrt(sqrtPriceX96);
  } catch (err) {
    if (err instanceof ConciergeError && err.type === 'OracleUnavailable') throw err;
    throw new ConciergeError(
      'OracleUnavailable',
      '[@concierge-mantle/meth-staking] acquire: pool price read or rate computation failed before swap — no funds moved, safe to retry',
      err instanceof Error ? err : undefined,
    );
  }
  // rate = WETH per mETH (1e18). mETH out = WETH in × 1e18 / rate.
  const expectedMethOut = rate > 0n ? (amountWeth * 10n ** 18n) / rate : 0n;

  let swapResult: { txHash: string; amountOut: string };
  try {
    swapResult = await ctx.dexProvider.actions.swap.invoke({
      tokenIn: ctx.addresses.weth,
      tokenOut: ctx.addresses.meth,
      amountIn: amountWeth,
      slippageBps,
      recipient,
    });
  } catch (err) {
    if (err instanceof ConciergeError) throw err;
    throw new ConciergeError(
      'RpcError',
      '[@concierge-mantle/meth-staking] acquire: DEX swap failed',
      err instanceof Error ? err : undefined,
    );
  }

  const rawTxHash = swapResult.txHash;
  if (!/^0x[0-9a-fA-F]{64}$/.test(rawTxHash)) {
    throw new ConciergeError(
      'RpcError',
      `[@concierge-mantle/meth-staking] acquire: DEX provider returned a malformed txHash: '${rawTxHash}' — swap may have executed; verify manually`,
    );
  }
  const dexTxHash = rawTxHash as `0x${string}`;
  const actualMethOut = swapResult.amountOut;

  // Swap executed — wrap any attestation failure with the txHash so it can be recorded manually.
  let attestationPayload: AcquireAttestationPayload;
  try {
    attestationPayload = AcquireAttestationPayloadSchema.parse({
      schema: METH_ACQUIRE_SCHEMA,
      chain: ctx.chainId,
      dexTxHash,
      amountWethIn: amountWeth.toString(),
      expectedMethOut: expectedMethOut.toString(),
      actualMethOut,
      slippageBps,
      ts: Math.floor(Date.now() / 1000),
    });
  } catch (err) {
    throw new ConciergeError(
      'AttestationFailed',
      `[@concierge-mantle/meth-staking] acquire: swap executed (txHash: ${dexTxHash}) but attestation payload validation failed — record the tx hash manually`,
      err instanceof Error ? err : undefined,
    );
  }

  return {
    dexTxHash,
    expectedMethOut: expectedMethOut.toString(),
    actualMethOut,
    attestationPayload,
  };
}

export function createAcquireTool(ctx: ActionContext) {
  return tool({
    name: 'acquire',
    description:
      'Acquires mETH by routing WETH → mETH via the best DEX on Mantle. This is NOT an L1 stake — ' +
      'minting fresh mETH happens on Ethereum L1, so on Mantle the practical entry into mETH staking ' +
      'yield is a DEX swap against the liquid mETH/WETH pool. Returns the tx hash and a ' +
      '`concierge.meth.acquire-via-dex.v1` attestation so future auditors can verify the entry.',
    inputSchema: AcquireInput,
    outputSchema: AcquireOutput,
    supportsNetwork: (chainId) => chainId === ctx.chainId,
    invoke: (args) => executeAcquire(ctx, args),
  });
}
