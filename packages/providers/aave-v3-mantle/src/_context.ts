// Internal shared context passed to every action factory — not part of the public API.

import { ConciergeError } from '@concierge/sdk';
import type { Address, EvmChainId } from '@concierge/shared';
import type { PublicClient, WalletClient } from 'viem';

export interface ActionContext {
  publicClient: PublicClient;
  walletClient?: WalletClient | undefined;
  chainId: EvmChainId;
  poolAddress: Address;
  oracleAddress: Address;
  // undefined when the rewards controller is not deployed on this chain (e.g. Mantle Sepolia).
  incentivesControllerAddress: Address | undefined;
  // Used in borrow's E-Mode pre-check to detect sUSDe collateral
  sUsdeAddress: Address;
}

/** Guards every write action: throws ConfigError when walletClient is absent or has no account. */
export async function requireWallet(
  ctx: ActionContext,
  action: string,
): Promise<{ walletClient: WalletClient; account: Address }> {
  if (!ctx.walletClient) {
    throw new ConciergeError(
      'ConfigError',
      `[@concierge/aave-v3-mantle] ${action}: walletClient is required for write operations. Initialise AaveV3MantleProvider with a connected WalletClient.`,
    );
  }
  // Prefer the account already bound to the wallet client (covers JSON-RPC accounts
  // created with `createWalletClient({ account: "0xaddr" })`). Falling back to
  // getAddresses()[0] would return ALL node accounts on a dev node (Anvil returns 10),
  // and the first of those is always the node's default account, not the caller's.
  let account: Address | undefined;
  if (ctx.walletClient.account) {
    account = ctx.walletClient.account.address as Address;
  } else {
    account = (await ctx.walletClient.getAddresses())[0] as Address | undefined;
  }
  if (!account) {
    throw new ConciergeError(
      'ConfigError',
      `[@concierge/aave-v3-mantle] ${action}: no account found in walletClient. Connect a wallet account before calling write operations.`,
    );
  }
  return { walletClient: ctx.walletClient, account };
}
