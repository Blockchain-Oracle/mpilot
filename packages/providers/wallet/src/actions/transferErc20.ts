import { erc20Abi } from '@mpilot/shared/abi';
import { encodeFunctionData } from 'viem';
import { z } from 'zod';
import type { WalletActionContext } from '../_context.ts';
import { NON_ZERO_ADDRESS, POSITIVE_AMOUNT } from '../_schema.ts';
import { createWriteTool } from '../_write.ts';

export const TransferErc20Input = z.object({
  token: NON_ZERO_ADDRESS.describe('ERC-20 token contract address'),
  recipient: NON_ZERO_ADDRESS.describe('Address receiving the tokens'),
  amount: POSITIVE_AMOUNT.describe('Amount in token base units (no decimals)'),
});

export function createTransferErc20Tool(ctx: WalletActionContext) {
  return createWriteTool(ctx, {
    name: 'transferErc20',
    description:
      'Send an ERC-20 token to an address on Mantle. In propose mode returns an unsigned transaction for ' +
      'the user to sign; in execute mode signs and broadcasts it.',
    inputSchema: TransferErc20Input,
    encode: (_ctx, args) => ({
      to: args.token,
      value: 0n,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [args.recipient, BigInt(args.amount)],
      }),
      summary: `Transfer ${args.amount} base units of ${args.token} to ${args.recipient}`,
    }),
  });
}
