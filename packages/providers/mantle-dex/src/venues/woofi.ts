import { ConciergeError } from '@concierge/sdk';
import type { Address } from '@concierge/shared';
import type { PublicClient, WalletClient } from 'viem';
import { BaseError, ContractFunctionRevertedError, parseAbi } from 'viem';
import type {
  Venue,
  VenueQuoteParams,
  VenueQuoteResult,
  VenueSwapParams,
  VenueSwapResult,
} from '../_types.ts';

// WooRouterV2 — both quote and execution live here.
const routerAbi = parseAbi([
  'function querySwap(address fromToken, address toToken, uint256 fromAmount) view returns (uint256 toAmount)',
  'function swap(address fromToken, address toToken, uint256 fromAmount, uint256 minToAmount, address to, address rebateTo) payable returns (uint256 realToAmount)',
]);

export function createWooFiVenue(
  publicClient: PublicClient,
  walletClient: WalletClient | undefined,
  router: Address,
): Venue {
  async function quote(params: VenueQuoteParams): Promise<VenueQuoteResult | null> {
    const { tokenIn, tokenOut, amountIn } = params;
    try {
      const toAmount = await publicClient.readContract({
        address: router,
        abi: routerAbi,
        functionName: 'querySwap',
        args: [tokenIn, tokenOut, amountIn],
      });
      if (toAmount === 0n) return null;
      return { venue: 'woofi', amountOut: toAmount };
    } catch (err) {
      // WooFi reverts when pair has no listing — return null to let aggregation continue.
      // readContract wraps reverts in ContractFunctionExecutionError; walk() finds the inner revert.
      if (err instanceof BaseError && err.walk((e) => e instanceof ContractFunctionRevertedError)) {
        return null;
      }
      throw err;
    }
  }

  async function swap(params: VenueSwapParams): Promise<VenueSwapResult> {
    if (!walletClient) {
      throw new ConciergeError(
        'ConfigError',
        '[@concierge/mantle-dex] woofi.swap: walletClient required',
      );
    }
    const { tokenIn, tokenOut, amountIn, amountOutMin, recipient, account } = params;

    // Simulate to get actual realToAmount and pre-flight slippage check.
    const { result: simulatedAmountOut, request } = await publicClient.simulateContract({
      address: router,
      abi: routerAbi,
      functionName: 'swap',
      args: [
        tokenIn,
        tokenOut,
        amountIn,
        amountOutMin,
        recipient,
        '0x0000000000000000000000000000000000000000',
      ],
      account: account as Address,
    });

    const txHash = await walletClient.writeContract({
      ...request,
      chain: walletClient.chain ?? null,
      account: account as Address,
    } as Parameters<typeof walletClient.writeContract>[0]);

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status === 'reverted') {
      throw new ConciergeError(
        'RpcError',
        `[@concierge/mantle-dex] woofi.swap: tx ${txHash} reverted`,
      );
    }
    return { txHash, amountOut: simulatedAmountOut, spender: router };
  }

  return { name: 'woofi', quote, swap };
}
