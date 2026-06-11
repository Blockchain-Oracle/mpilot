// Unit tests for executeSwap — no fork required; venues are mocked.
import { ConciergeError } from '@concierge/sdk';
import type { Address } from '@concierge/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionContext } from '../../_context.ts';
import type { Venue } from '../../_types.ts';
import { executeSwap } from '../../actions/swap.ts';

// Mock buildVenues so we can control venue behaviour without a running node.
vi.mock('../../actions/quote.ts', () => ({
  buildVenues: vi.fn(),
}));

import { buildVenues } from '../../actions/quote.ts';

const ADDR = (n: number) => `0x${'0'.repeat(39)}${n}` as Address;
const TOKEN_A = '0x09bc4e0d864854c6afb6eb9a9cdf58ac190d0df9' as Address;
const TOKEN_B = '0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34' as Address;
const RECIPIENT = ADDR(2);

const mockAddresses: ActionContext['addresses'] = {
  merchantMoe: { lbRouter: ADDR(1), lbQuoter: ADDR(1) },
  agni: { swapRouter: ADDR(1), quoterV2: ADDR(1) },
  fusionx: { swapRouter: ADDR(1), quoterV2: ADDR(1) },
  woofi: { router: ADDR(1), pool: ADDR(1) },
  lifi: { diamond: ADDR(1) },
};

const validArgs = {
  tokenIn: TOKEN_A,
  tokenOut: TOKEN_B,
  amountIn: 1_000_000n,
  slippageBps: 50,
  recipient: RECIPIENT,
};

function makeNullVenue(name: Venue['name']): Venue {
  return { name, quote: () => Promise.resolve(null), swap: vi.fn() };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('executeSwap — ConfigError', () => {
  it('throws ConfigError when walletClient is absent', async () => {
    const ctx: ActionContext = {
      publicClient: {} as never,
      chainId: 5000,
      addresses: mockAddresses,
    };
    await expect(executeSwap(ctx, validArgs)).rejects.toSatisfy(
      (e: unknown) => e instanceof ConciergeError && e.type === 'ConfigError',
    );
  });

  it('throws ConfigError when walletClient has no bound account', async () => {
    const ctx: ActionContext = {
      publicClient: {} as never,
      chainId: 5000,
      addresses: mockAddresses,
      walletClient: { account: undefined, chain: null, writeContract: vi.fn() } as never,
    };
    await expect(executeSwap(ctx, validArgs)).rejects.toSatisfy(
      (e: unknown) => e instanceof ConciergeError && e.type === 'ConfigError',
    );
  });
});

describe('executeSwap — InsufficientLiquidity', () => {
  it('throws InsufficientLiquidity when all venues return null quotes', async () => {
    vi.mocked(buildVenues).mockReturnValue([
      makeNullVenue('merchantMoe'),
      makeNullVenue('agni'),
      makeNullVenue('fusionx'),
      makeNullVenue('woofi'),
      makeNullVenue('lifi'),
    ]);
    const ctx: ActionContext = {
      publicClient: {} as never,
      chainId: 5000,
      addresses: mockAddresses,
      walletClient: {
        account: { address: ADDR(9) },
        chain: null,
        writeContract: vi.fn(),
      } as never,
    };
    await expect(executeSwap(ctx, validArgs)).rejects.toSatisfy(
      (e: unknown) => e instanceof ConciergeError && e.type === 'InsufficientLiquidity',
    );
  });
});

describe('executeSwap — SwapSlippageBreach', () => {
  it('throws SwapSlippageBreach when venue returns amountOut below computed minimum', async () => {
    const QUOTE_AMOUNT = 1_000_000n;
    const mockSwap = vi.fn().mockResolvedValue({
      txHash: `0x${'a'.repeat(64)}`,
      amountOut: 0n, // far below amountOutMin derived from QUOTE_AMOUNT
      spender: ADDR(1),
    });
    vi.mocked(buildVenues).mockReturnValue([
      {
        name: 'merchantMoe',
        quote: () => Promise.resolve({ venue: 'merchantMoe', amountOut: QUOTE_AMOUNT }),
        swap: mockSwap,
      },
      makeNullVenue('agni'),
      makeNullVenue('fusionx'),
      makeNullVenue('woofi'),
      makeNullVenue('lifi'),
    ]);

    const mockPublicClient = {
      readContract: vi.fn().mockResolvedValue(QUOTE_AMOUNT), // allowance >= amountIn → skip approve
      waitForTransactionReceipt: vi.fn(),
    };
    const ctx: ActionContext = {
      publicClient: mockPublicClient as never,
      chainId: 5000,
      addresses: mockAddresses,
      walletClient: {
        account: { address: ADDR(9) },
        chain: null,
        writeContract: vi.fn(),
      } as never,
    };

    await expect(executeSwap(ctx, validArgs)).rejects.toSatisfy(
      (e: unknown) => e instanceof ConciergeError && e.type === 'SwapSlippageBreach',
    );
  });
});
