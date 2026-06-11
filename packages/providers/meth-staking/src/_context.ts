import type { Address, EvmChainId } from '@concierge/shared';
import type { PublicClient } from 'viem';

export interface MethAddresses {
  readonly meth: Address;
  readonly weth: Address;
  /** Agni mETH/WETH pool (500 bps fee tier) — source of DEX price and TWAP. */
  readonly agniMethWeth: Address;
}

/** Minimal interface the unwrapToWETH action needs from the injected DEX provider. */
export interface DexProviderLike {
  readonly actions: {
    readonly swap: {
      invoke(args: {
        tokenIn: Address;
        tokenOut: Address;
        amountIn: bigint;
        slippageBps: number;
        recipient: Address;
      }): Promise<{ txHash: string; amountOut: string }>;
    };
  };
}

export interface ActionContext {
  readonly publicClient: PublicClient;
  readonly chainId: EvmChainId;
  readonly addresses: MethAddresses;
  readonly dexProvider: DexProviderLike;
}
