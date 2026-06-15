import { z } from 'zod';
import type { WalletActionContext } from '../_context.ts';
import { NON_ZERO_ADDRESS, POSITIVE_AMOUNT } from '../_schema.ts';
import { createWriteTool } from '../_write.ts';

export const TransferNativeInput = z.object({
  recipient: NON_ZERO_ADDRESS.describe('Address receiving the native MNT'),
  amount: POSITIVE_AMOUNT.describe('Amount in wei (base units, no decimals)'),
});

export function createTransferNativeTool(ctx: WalletActionContext) {
  return createWriteTool(ctx, {
    name: 'transferNative',
    description:
      'Send native MNT to an address on Mantle. In propose mode returns an unsigned transaction for the ' +
      'user to sign; in execute mode signs and broadcasts it.',
    inputSchema: TransferNativeInput,
    encode: (_ctx, args) => ({
      to: args.recipient,
      value: BigInt(args.amount),
      data: '0x',
      summary: `Send ${args.amount} wei MNT to ${args.recipient}`,
    }),
  });
}
