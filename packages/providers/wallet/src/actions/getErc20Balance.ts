import { ConciergeError } from '@mpilot/sdk';
import { erc20Abi } from '@mpilot/shared/abi';
import { tool } from '@mpilot/tools';
import { z } from 'zod';
import type { WalletActionContext } from '../_context.ts';
import { NON_NEG_AMOUNT, NON_ZERO_ADDRESS } from '../_schema.ts';

export const GetErc20BalanceInput = z.object({
  user: NON_ZERO_ADDRESS.describe('Address to read the token balance of'),
  token: NON_ZERO_ADDRESS.describe('ERC-20 token contract address'),
});

export const GetErc20BalanceOutput = z.object({
  balance: NON_NEG_AMOUNT.describe('Token balance in base units (decimal string)'),
  decimals: z.number().int().describe('Token decimals'),
  symbol: z.string().describe('Token symbol'),
});

export async function executeGetErc20Balance(
  ctx: WalletActionContext,
  args: z.infer<typeof GetErc20BalanceInput>,
): Promise<z.infer<typeof GetErc20BalanceOutput>> {
  try {
    const [balance, decimals, symbol] = await Promise.all([
      ctx.publicClient.readContract({
        address: args.token,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [args.user],
      }),
      ctx.publicClient.readContract({
        address: args.token,
        abi: erc20Abi,
        functionName: 'decimals',
      }),
      ctx.publicClient.readContract({
        address: args.token,
        abi: erc20Abi,
        functionName: 'symbol',
      }),
    ]);
    return { balance: balance.toString(), decimals: Number(decimals), symbol };
  } catch (err) {
    throw new ConciergeError(
      'RpcError',
      `[@mpilot/wallet] getErc20Balance: failed to read ${args.token} balance for ${args.user}`,
      err instanceof Error ? err : undefined,
    );
  }
}

export function createGetErc20BalanceTool(ctx: WalletActionContext) {
  return tool({
    name: 'getErc20Balance',
    description:
      'Read the balance, decimals, and symbol of any ERC-20 token for an address on Mantle. ' +
      'Pure read — no transaction, no signature.',
    inputSchema: GetErc20BalanceInput,
    outputSchema: GetErc20BalanceOutput,
    annotations: { readOnlyHint: true, openWorldHint: true },
    supportsNetwork: (chainId) => chainId === ctx.chainId,
    invoke: (args) => executeGetErc20Balance(ctx, args),
  });
}
