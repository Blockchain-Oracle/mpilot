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

// Algebra V3 QuoterV2 — individual params, no fee tier input.
const quoterAbi = parseAbi([
  'function quoteExactInputSingle(address tokenIn, address tokenOut, uint256 amountIn, uint160 limitSqrtPrice) view returns (uint256 amountOut, uint16 fee, uint32 initializedTicksCrossed, uint256 gasEstimate)',
]);

// Algebra V3 SwapRouter — no fee in ExactInputSingleParams.
const routerAbi = parseAbi([
  'function exactInputSingle((address tokenIn, address tokenOut, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 limitSqrtPrice) params) payable returns (uint256 amountOut)',
]);

export function createFusionXVenue(
  publicClient: PublicClient,
  walletClient: WalletClient | undefined,
  swapRouter: Address,
  quoterV2: Address,
): Venue {
  async function quote(params: VenueQuoteParams): Promise<VenueQuoteResult | null> {
    const { tokenIn, tokenOut, amountIn } = params;
    try {
      const [amountOut] = await publicClient.readContract({
        address: quoterV2,
        abi: quoterAbi,
        functionName: 'quoteExactInputSingle',
        args: [tokenIn, tokenOut, amountIn, 0n],
      });
      if (amountOut === 0n) return null;
      return { venue: 'fusionx', amountOut };
    } catch (err) {
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
        '[@concierge/mantle-dex] fusionx.swap: walletClient required',
      );
    }
    const { tokenIn, tokenOut, amountIn, amountOutMin, recipient, account, deadline } = params;

    // Re-quote for freshness — discriminate revert (no route) from system errors.
    let freshAmountOut: bigint;
    try {
      const [ao] = await publicClient.readContract({
        address: quoterV2,
        abi: quoterAbi,
        functionName: 'quoteExactInputSingle',
        args: [tokenIn, tokenOut, amountIn, 0n],
      });
      if (ao === 0n) {
        throw new ConciergeError(
          'InsufficientLiquidity',
          `[@concierge/mantle-dex] fusionx.swap: quoter returned zero for ${tokenIn} → ${tokenOut}`,
        );
      }
      freshAmountOut = ao;
    } catch (err) {
      if (err instanceof ConciergeError) throw err;
      if (err instanceof BaseError && err.walk((e) => e instanceof ContractFunctionRevertedError)) {
        throw new ConciergeError(
          'InsufficientLiquidity',
          `[@concierge/mantle-dex] fusionx.swap: no route for ${tokenIn} → ${tokenOut}`,
        );
      }
      throw err;
    }
    void freshAmountOut; // used below via simulateContract result

    // Simulate to get actual amountOut and pre-flight slippage check.
    const { result: simulatedAmountOut, request } = await publicClient.simulateContract({
      address: swapRouter,
      abi: routerAbi,
      functionName: 'exactInputSingle',
      args: [
        {
          tokenIn,
          tokenOut,
          recipient,
          deadline,
          amountIn,
          amountOutMinimum: amountOutMin,
          limitSqrtPrice: 0n,
        },
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
        `[@concierge/mantle-dex] fusionx.swap: tx ${txHash} reverted`,
      );
    }
    return { txHash, amountOut: simulatedAmountOut, spender: swapRouter };
  }

  return { name: 'fusionx', quote, swap };
}
