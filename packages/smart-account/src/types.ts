import type { Address } from 'viem';
import type { CHAIN_CONFIGS } from './constants.ts';

export type SupportedChain = keyof typeof CHAIN_CONFIGS;

export interface ConciergeAccountConfig {
  owner: { address: Address; sign?: unknown };
  chain: SupportedChain;
}

export interface ConnectAccountConfig {
  address: Address;
  owner: { address: Address; sign?: unknown };
  chain: SupportedChain;
}

/**
 * Core account bundle returned by createConciergeAccount / connectToConciergeAccount.
 *
 * kernelAccount  — cast to CreateKernelAccountReturnType from @zerodev/sdk as needed
 * clientPromise  — cast to KernelAccountClient from @zerodev/sdk as needed
 *
 * The opaque `object` types avoid a viem peer-dep version skew in the DTS build;
 * ZeroDev SDK ships types compiled against viem 2.38 while the project uses viem 2.52.
 */
export interface ConciergeAccount {
  smartAccountAddress: Address;
  kernelAccount: { address: Address } & object;
  clientPromise: Promise<object>;
}
