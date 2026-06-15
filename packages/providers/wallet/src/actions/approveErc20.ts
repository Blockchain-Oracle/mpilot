import { erc20Abi } from '@mpilot/shared/abi';
import { encodeFunctionData } from 'viem';
import { z } from 'zod';
import type { WalletActionContext } from '../_context.ts';
import { NON_NEG_AMOUNT, NON_ZERO_ADDRESS } from '../_schema.ts';
import { createWriteTool } from '../_write.ts';

export const ApproveErc20Input = z.object({
  token: NON_ZERO_ADDRESS.describe('ERC-20 token contract address'),
  spender: NON_ZERO_ADDRESS.describe('Address being granted the allowance'),
  amount: NON_NEG_AMOUNT.describe('Allowance amount in token base units (0 to revoke)'),
});

export function createApproveErc20Tool(ctx: WalletActionContext) {
  return createWriteTool(ctx, {
    name: 'approveErc20',
    description:
      'Approve an ERC-20 spender allowance on Mantle. In propose mode returns an unsigned transaction for ' +
      'the user to sign; in execute mode signs and broadcasts it.',
    inputSchema: ApproveErc20Input,
    encode: (_ctx, args) => ({
      to: args.token,
      value: 0n,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [args.spender, BigInt(args.amount)],
      }),
      summary: `Approve ${args.spender} to spend ${args.amount} base units of ${args.token}`,
    }),
  });
}
