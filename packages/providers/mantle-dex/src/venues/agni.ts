import { ConciergeError } from '@concierge-mantle/sdk';
import type { Address } from '@concierge-mantle/shared';
import type { PublicClient, WalletClient } from 'viem';
import { BaseError, ContractFunctionRevertedError, parseAbi } from 'viem';
import type {
  Venue,
  VenueQuoteParams,
  VenueQuoteResult,
  VenueSwapParams,
  VenueSwapResult,
} from '../_types.ts';

const quoterAbi = parseAbi([
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) view returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
]);

const routerAbi = parseAbi([
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)',
]);

// 0.01% for stable pairs, 0.05%, 0.3%, 1% — checked in order.
const FEE_TIERS: readonly number[] = [100, 500, 3000, 10000];

// Stable-pair tokens (by lowercased address) that prefer the 100bps tier.
// sUSDe ≈ $1.23 and USDe ≈ $1.00 are both close-to-stable.
const STABLE_TOKENS = new Set([
  '0x09bc4e0d864854c6afb6eb9a9cdf58ac190d0df9', // USDC
  '0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34', // USDe
  '0x211cc4dd073734da055fbf44a2b4667d5e5fe5d2', // sUSDe
]);

function isStablePair(tokenIn: string, tokenOut: string): boolean {
  return STABLE_TOKENS.has(tokenIn.toLowerCase()) && STABLE_TOKENS.has(tokenOut.toLowerCase());
}

async function quoteSingleFee(
  publicClient: PublicClient,
  quoter: Address,
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  fee: number,
): Promise<{ amountOut: bigint; fee: number } | null> {
  try {
    const [amountOut] = await publicClient.readContract({
      address: quoter,
      abi: quoterAbi,
      functionName: 'quoteExactInputSingle',
      args: [{ tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n }],
    });
    if (amountOut === 0n) return null;
    return { amountOut, fee };
  } catch (err) {
    // readContract wraps reverts in ContractFunctionExecutionError; walk() finds the inner revert.
    if (err instanceof BaseError && err.walk((e) => e instanceof ContractFunctionRevertedError)) {
      return null;
    }
    throw err;
  }
}

export function createAgniVenue(
  publicClient: PublicClient,
  walletClient: WalletClient | undefined,
  swapRouter: Address,
  quoterV2: Address,
): Venue {
  async function quote(params: VenueQuoteParams): Promise<VenueQuoteResult | null> {
    const { tokenIn, tokenOut, amountIn } = params;
    const feesToTry = isStablePair(tokenIn, tokenOut)
      ? FEE_TIERS
      : ([FEE_TIERS[2], FEE_TIERS[1], FEE_TIERS[3], FEE_TIERS[0]] as number[]);

    const results = await Promise.all(
      feesToTry.map((fee) =>
        quoteSingleFee(publicClient, quoterV2, tokenIn, tokenOut, amountIn, fee),
      ),
    );
    const best = results
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => (b.amountOut > a.amountOut ? 1 : -1))[0];

    if (!best) return null;
    return { venue: 'agni', amountOut: best.amountOut };
  }

  async function swap(params: VenueSwapParams): Promise<VenueSwapResult> {
    if (!walletClient) {
      throw new ConciergeError(
        'ConfigError',
        '[@concierge-mantle/mantle-dex] agni.swap: walletClient required',
      );
    }
    const { tokenIn, tokenOut, amountIn, amountOutMin, recipient, account, deadline } = params;

    // Re-quote to get the best fee tier at execute time.
    const feesToTry = isStablePair(tokenIn, tokenOut)
      ? FEE_TIERS
      : ([FEE_TIERS[2], FEE_TIERS[1], FEE_TIERS[3], FEE_TIERS[0]] as number[]);
    const results = await Promise.all(
      feesToTry.map((fee) =>
        quoteSingleFee(publicClient, quoterV2, tokenIn, tokenOut, amountIn, fee),
      ),
    );
    const best = results
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => (b.amountOut > a.amountOut ? 1 : -1))[0];

    if (!best) {
      throw new ConciergeError(
        'InsufficientLiquidity',
        `[@concierge-mantle/mantle-dex] agni.swap: no route for ${tokenIn} → ${tokenOut}`,
      );
    }

    // Simulate to get actual amountOut and pre-flight slippage check.
    const { result: simulatedAmountOut, request } = await publicClient.simulateContract({
      address: swapRouter,
      abi: routerAbi,
      functionName: 'exactInputSingle',
      args: [
        {
          tokenIn,
          tokenOut,
          fee: best.fee,
          recipient,
          deadline,
          amountIn,
          amountOutMinimum: amountOutMin,
          sqrtPriceLimitX96: 0n,
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
        `[@concierge-mantle/mantle-dex] agni.swap: tx ${txHash} reverted`,
      );
    }
    return { txHash, amountOut: simulatedAmountOut, spender: swapRouter };
  }

  return { name: 'agni', quote, swap };
}
