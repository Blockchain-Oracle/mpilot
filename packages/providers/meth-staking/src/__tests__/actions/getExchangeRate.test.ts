import { ConciergeError } from '@mpilot/sdk';
import { ADDRESSES } from '@mpilot/shared';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { executeGetExchangeRate } from '../../actions/getExchangeRate.ts';
import { type AnvilFork, startAnvilFork } from '../setup.ts';

const AGNI_METH_WETH = '0x4f9E3683A523b66Da89d82BbA0a9CAA1C3243dF4' as const;

const addresses = {
  meth: ADDRESSES.mantleMainnet.tokens.mETH,
  weth: ADDRESSES.mantleMainnet.tokens.WETH,
  agniMethWeth: AGNI_METH_WETH,
};

let fork: AnvilFork;

beforeAll(async () => {
  fork = await startAnvilFork();
}, 60_000);

afterAll(async () => {
  await fork.stop();
});

describe('getExchangeRate — fork (real Mantle mainnet state)', () => {
  it('returns rate in [1e18, 2e18] (test_getExchangeRate_InValidRange)', async () => {
    const mockDex = { actions: { swap: { invoke: vi.fn() } } };
    const ctx = {
      publicClient: fork.publicClient,
      chainId: 5000 as const,
      addresses,
      dexProvider: mockDex,
    };
    const result = await executeGetExchangeRate(ctx);
    const rate = BigInt(result.rate);
    expect(rate).toBeGreaterThanOrEqual(10n ** 18n);
    expect(rate).toBeLessThanOrEqual(2n * 10n ** 18n);
  }, 30_000);
});

describe('getExchangeRate — error paths (mocked)', () => {
  it('throws ConciergeError(RpcError) when pool slot0 reverts', async () => {
    const mockDex = { actions: { swap: { invoke: vi.fn() } } };
    // biome-ignore lint/suspicious/noExplicitAny: minimal mock
    const publicClient: any = {
      readContract: vi.fn().mockRejectedValue(new Error('slot0 revert')),
    };
    const ctx = { publicClient, chainId: 5000 as const, addresses, dexProvider: mockDex };
    await expect(executeGetExchangeRate(ctx)).rejects.toSatisfy(
      (e: unknown) => e instanceof ConciergeError && (e as ConciergeError).type === 'RpcError',
    );
  });
});

describe('getExchangeRate — happy path (mocked)', () => {
  it('computes correct rate from known sqrtPriceX96 (~1.092e18)', async () => {
    const mockDex = { actions: { swap: { invoke: vi.fn() } } };
    const SQRT_PRICE = 82_798_739_410_433_829_082_732_242_045n;
    // biome-ignore lint/suspicious/noExplicitAny: minimal mock
    const publicClient: any = {
      readContract: vi.fn().mockResolvedValue([SQRT_PRICE, 880, 0, 1, 1, 0, true]),
    };
    const ctx = { publicClient, chainId: 5000 as const, addresses, dexProvider: mockDex };
    const result = await executeGetExchangeRate(ctx);
    const rate = BigInt(result.rate);
    expect(rate).toBeGreaterThan(1_080_000_000_000_000_000n);
    expect(rate).toBeLessThan(1_100_000_000_000_000_000n);
  });
});

describe('getExchangeRate — monotonic rate property (test_getExchangeRate_Monotonic)', () => {
  it('higher sqrtPriceX96 produces a strictly higher rate (mETH appreciation is order-preserving)', async () => {
    // 2^96 → rate = exactly 1.0e18 (peg, no yield accrued yet)
    const SQRT_AT_PAR = 79_228_162_514_264_337_593_543_950_336n;
    // real on-chain value → rate ≈ 1.092e18 (staking yield accrued)
    const SQRT_APPRECIATED = 82_798_739_410_433_829_082_732_242_045n;

    const mockDex = { actions: { swap: { invoke: vi.fn() } } };
    // biome-ignore lint/suspicious/noExplicitAny: minimal mock
    const makeClient = (sqrt: bigint): any => ({
      readContract: vi.fn().mockResolvedValue([sqrt, 0, 0, 1, 1, 0, true]),
    });

    const parCtx = {
      publicClient: makeClient(SQRT_AT_PAR),
      chainId: 5000 as const,
      addresses,
      dexProvider: mockDex,
    };
    const appreciatedCtx = {
      publicClient: makeClient(SQRT_APPRECIATED),
      chainId: 5000 as const,
      addresses,
      dexProvider: mockDex,
    };

    const parResult = await executeGetExchangeRate(parCtx);
    const appreciatedResult = await executeGetExchangeRate(appreciatedCtx);

    expect(BigInt(appreciatedResult.rate)).toBeGreaterThan(BigInt(parResult.rate));
  });
});
