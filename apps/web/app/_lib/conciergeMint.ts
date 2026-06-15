/**
 * r2 — wires onboarding to the ERC-8004 identity mint via
 * `@concierge-mantle/erc8004`.
 *
 * Reuses the kernel `walletClient` from the smart-account deploy step;
 * `registerAgent` sends the on-chain tx through the kernel client (so the
 * paymaster sponsors gas). Returns the minted `agentId` from the
 * `NewAgent` event so the UI can surface "Agent #N".
 */
import { createErc8004Provider } from '@concierge-mantle/erc8004';
import type { PublicClient, WalletClient } from 'viem';

export interface MintArgs {
  readonly walletClient: WalletClient;
  readonly publicClient: PublicClient;
  /** Mantle Sepolia only for r2. */
  readonly chain: 'mantle-sepolia';
}

export interface MintResult {
  readonly agentId: bigint;
  readonly txHash: `0x${string}`;
}

export async function mintConciergeIdentity(args: MintArgs): Promise<MintResult> {
  const provider = createErc8004Provider({
    chain: args.chain,
    // The ZeroDev kernel client + viem PublicClient both implement the
    // structural surface registerAgent reads. We cast at the boundary
    // because the workspace pulls in two copies of viem under different
    // TypeScript versions and TS treats the resulting types as unrelated
    // even though they are structurally identical at runtime.
    // biome-ignore lint/suspicious/noExplicitAny: cross-version viem
    walletClient: args.walletClient as any,
    // biome-ignore lint/suspicious/noExplicitAny: cross-version viem
    publicClient: args.publicClient as any,
  });
  const result = await provider.actions.registerAgent.invoke({});
  return {
    agentId: result.agentId,
    // The Zod schema validates `txHash` as `^0x[0-9a-fA-F]{64}$` but exposes it
    // as `string`; the regex guarantees the branded shape at runtime.
    txHash: result.txHash as `0x${string}`,
  };
}
