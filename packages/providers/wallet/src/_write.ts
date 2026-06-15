// Shared machinery for write tools. Every write action reduces to building one
// `{ to, value, data }` tuple; `propose` mode returns it unsigned (chat signs
// client-side) and `execute` mode sends it via the walletClient. Centralised
// here so each action file is just an encoder + metadata.

import { ConciergeError } from '@mpilot/sdk';
import type { Address, Hex } from '@mpilot/shared';
import { tool } from '@mpilot/tools';
import { z } from 'zod';
import { requireWallet, type WalletActionContext } from './_context.ts';
import { HEX_ADDRESS, HEX32, NON_NEG_AMOUNT, TX_PROPOSAL } from './_schema.ts';

/** A fully-built, unsigned transaction tuple plus a human summary. */
export interface BuiltTx {
  readonly to: Address;
  readonly value: bigint;
  readonly data: Hex;
  readonly summary: string;
}

export const EXEC_RECEIPT = z.object({
  kind: z.literal('executed'),
  txHash: HEX32,
  from: HEX_ADDRESS,
  to: HEX_ADDRESS,
  value: NON_NEG_AMOUNT.describe('Native value moved in wei (0 for ERC-20 / approve)'),
  blockNumber: NON_NEG_AMOUNT,
  summary: z.string().min(1),
});
export type ExecReceipt = z.infer<typeof EXEC_RECEIPT>;

async function sendBuilt(
  ctx: WalletActionContext,
  action: string,
  built: BuiltTx,
): Promise<ExecReceipt> {
  const { walletClient, account } = await requireWallet(ctx, action);
  let hash: Hex;
  try {
    hash = await walletClient.sendTransaction({
      account,
      to: built.to,
      value: built.value,
      data: built.data,
      chain: walletClient.chain ?? null,
    });
  } catch (err) {
    if (err instanceof ConciergeError) throw err;
    throw new ConciergeError(
      'RpcError',
      `[@mpilot/wallet] ${action}: transaction send failed`,
      err instanceof Error ? err : undefined,
    );
  }
  let receipt: Awaited<ReturnType<typeof ctx.publicClient.waitForTransactionReceipt>>;
  try {
    receipt = await ctx.publicClient.waitForTransactionReceipt({ hash });
  } catch (err) {
    throw new ConciergeError(
      'RpcError',
      `[@mpilot/wallet] ${action}: timed out waiting for tx ${hash}`,
      err instanceof Error ? err : undefined,
    );
  }
  if (receipt.status === 'reverted') {
    throw new ConciergeError('RpcError', `[@mpilot/wallet] ${action}: tx ${hash} reverted`);
  }
  return {
    kind: 'executed',
    txHash: hash,
    from: account,
    to: built.to,
    value: built.value.toString(),
    blockNumber: receipt.blockNumber.toString(),
    summary: built.summary,
  };
}

export interface WriteToolDef<TIn extends z.ZodObject<z.ZodRawShape>> {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: TIn;
  readonly encode: (ctx: WalletActionContext, args: z.infer<TIn>) => BuiltTx | Promise<BuiltTx>;
}

/**
 * Build a write tool whose contract depends on `ctx.mode`:
 *  - `propose` → outputSchema `TX_PROPOSAL`, invoke returns the unsigned tuple.
 *  - `execute` → outputSchema `EXEC_RECEIPT`, invoke signs + sends + waits.
 */
export function createWriteTool<TIn extends z.ZodObject<z.ZodRawShape>>(
  ctx: WalletActionContext,
  def: WriteToolDef<TIn>,
) {
  const outputSchema = ctx.mode === 'propose' ? TX_PROPOSAL : EXEC_RECEIPT;
  return tool({
    name: def.name,
    description: def.description,
    inputSchema: def.inputSchema,
    outputSchema,
    annotations: { openWorldHint: true, destructiveHint: ctx.mode === 'execute' },
    supportsNetwork: (chainId) => chainId === ctx.chainId,
    invoke: async (args) => {
      const built = await def.encode(ctx, args);
      if (ctx.mode === 'propose') {
        return {
          kind: 'proposal' as const,
          to: built.to,
          value: built.value.toString(),
          data: built.data,
          chainId: ctx.chainId,
          summary: built.summary,
        };
      }
      return sendBuilt(ctx, def.name, built);
    },
  });
}
