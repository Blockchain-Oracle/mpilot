import { ConciergeError } from '@mpilot/sdk';
import type { Address, EvmChainId } from '@mpilot/shared';
import type { PublicClient, WalletClient } from 'viem';
import { parseAbi } from 'viem';

/** WETH9-style wrapped-native interface (Mantle WMNT implements deposit/withdraw). */
export const weth9Abi = parseAbi([
  'function deposit() payable',
  'function withdraw(uint256 amount)',
]);

/**
 * `execute` — write tools sign + send via `walletClient` and return a receipt.
 * `propose` — write tools need only `publicClient`, encode the calldata, and
 * return an unsigned `TxProposal` for client-side signing (the chat surface).
 * Read tools behave identically in both modes.
 */
export type WalletProviderMode = 'execute' | 'propose';

export interface WalletActionContext {
  readonly publicClient: PublicClient;
  readonly walletClient?: WalletClient;
  readonly chainId: EvmChainId;
  readonly mode: WalletProviderMode;
  /** Canonical addresses the wallet tools need (currently the wrapped-native token). */
  readonly addresses: { readonly wrappedNative: Address };
}

export async function requireWallet(
  ctx: WalletActionContext,
  action: string,
): Promise<{ walletClient: WalletClient; account: Address }> {
  if (!ctx.walletClient) {
    throw new ConciergeError(
      'ConfigError',
      `[@mpilot/wallet] ${action}: walletClient is required for execute-mode writes.`,
    );
  }
  const account = ctx.walletClient.account?.address as Address | undefined;
  if (!account) {
    throw new ConciergeError(
      'ConfigError',
      `[@mpilot/wallet] ${action}: walletClient has no bound account. Pass createWalletClient({ account: privateKeyToAccount(...) }).`,
    );
  }
  return { walletClient: ctx.walletClient, account };
}
