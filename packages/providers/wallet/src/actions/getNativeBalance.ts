import { ConciergeError } from '@mpilot/sdk';
import { tool } from '@mpilot/tools';
import { z } from 'zod';
import type { WalletActionContext } from '../_context.ts';
import { NON_NEG_AMOUNT, NON_ZERO_ADDRESS } from '../_schema.ts';

export const GetNativeBalanceInput = z.object({
  user: NON_ZERO_ADDRESS.describe('Address to read the native MNT balance of'),
});

export const GetNativeBalanceOutput = z.object({
  balance: NON_NEG_AMOUNT.describe('Native balance in wei (decimal string)'),
  decimals: z.number().int().describe('Native token decimals (18)'),
  symbol: z.string().describe('Native token symbol'),
});

export async function executeGetNativeBalance(
  ctx: WalletActionContext,
  args: z.infer<typeof GetNativeBalanceInput>,
): Promise<z.infer<typeof GetNativeBalanceOutput>> {
  let balance: bigint;
  try {
    balance = await ctx.publicClient.getBalance({ address: args.user });
  } catch (err) {
    throw new ConciergeError(
      'RpcError',
      `[@mpilot/wallet] getNativeBalance: failed to read balance for ${args.user}`,
      err instanceof Error ? err : undefined,
    );
  }
  return { balance: balance.toString(), decimals: 18, symbol: 'MNT' };
}

export function createGetNativeBalanceTool(ctx: WalletActionContext) {
  return tool({
    name: 'getNativeBalance',
    description:
      'Read the native MNT balance of an address on Mantle. Pure read — no transaction, no signature.',
    inputSchema: GetNativeBalanceInput,
    outputSchema: GetNativeBalanceOutput,
    annotations: { readOnlyHint: true, openWorldHint: true },
    supportsNetwork: (chainId) => chainId === ctx.chainId,
    invoke: (args) => executeGetNativeBalance(ctx, args),
  });
}
