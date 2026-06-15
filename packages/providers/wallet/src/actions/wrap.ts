import { encodeFunctionData } from 'viem';
import { z } from 'zod';
import { type WalletActionContext, weth9Abi } from '../_context.ts';
import { POSITIVE_AMOUNT } from '../_schema.ts';
import { createWriteTool } from '../_write.ts';

export const WrapInput = z.object({
  amount: POSITIVE_AMOUNT.describe('Amount in wei (base units, no decimals)'),
});

export function createWrapNativeTool(ctx: WalletActionContext) {
  return createWriteTool(ctx, {
    name: 'wrapNative',
    description:
      'Wrap native MNT into WMNT (the ERC-20 wrapped native) on Mantle. In propose mode returns an ' +
      'unsigned transaction for the user to sign; in execute mode signs and broadcasts it.',
    inputSchema: WrapInput,
    encode: (c, args) => ({
      to: c.addresses.wrappedNative,
      value: BigInt(args.amount),
      data: encodeFunctionData({ abi: weth9Abi, functionName: 'deposit' }),
      summary: `Wrap ${args.amount} wei MNT into WMNT`,
    }),
  });
}

export function createUnwrapNativeTool(ctx: WalletActionContext) {
  return createWriteTool(ctx, {
    name: 'unwrapNative',
    description:
      'Unwrap WMNT back into native MNT on Mantle. In propose mode returns an unsigned transaction for ' +
      'the user to sign; in execute mode signs and broadcasts it.',
    inputSchema: WrapInput,
    encode: (c, args) => ({
      to: c.addresses.wrappedNative,
      value: 0n,
      data: encodeFunctionData({
        abi: weth9Abi,
        functionName: 'withdraw',
        args: [BigInt(args.amount)],
      }),
      summary: `Unwrap ${args.amount} wei WMNT into native MNT`,
    }),
  });
}
