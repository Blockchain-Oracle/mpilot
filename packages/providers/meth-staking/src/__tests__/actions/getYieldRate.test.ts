import { ConciergeError } from '@concierge-mantle/sdk';
import { ADDRESSES } from '@concierge-mantle/shared';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { executeGetYieldRate } from '../../actions/getYieldRate.ts';
import { type AnvilFork, startAnvilFork } from '../setup.ts';

const AGNI_METH_WETH = '0x4f9E3683A523b66Da89d82BbA0a9CAA1C3243dF4' as const;

const addresses = {
  meth: ADDRESSES.mantleMainnet.tokens.mETH,
  weth: ADDRESSES.mantleMainnet.tokens.WETH,
  agniMethWeth: AGNI_METH_WETH,
};
const mockDex = { actions: { swap: { invoke: vi.fn() } } };

let fork: AnvilFork;

beforeAll(async () => {
  fork = await startAnvilFork();
}, 60_000);

afterAll(async () => {
  await fork.stop();
});

describe('getYieldRate — fork (real Mantle mainnet state)', () => {
  it('throws InsufficientLiquidity because mETH/WETH pool has observationCardinality=1 (< 7 days)', async () => {
    // Both Agni mETH/WETH pools have observationCardinality=1 as of 2026-06-11.
    // The pool exists but has not accumulated 7 days of TWAP history yet.
    const ctx = {
      publicClient: fork.publicClient,
      chainId: 5000 as const,
      addresses,
      dexProvider: mockDex,
    };
    await expect(executeGetYieldRate(ctx)).rejects.toSatisfy(
      (e: unknown) => e instanceof ConciergeError && e.type === 'InsufficientLiquidity',
    );
  }, 30_000);
});

describe('getYieldRate — fixture math (mocked)', () => {
  it('returns ~381 bps for synthetic tick data representing ~3.8% ETH staking APY', async () => {
    // tick_now=880, meanTick≈876.35, tickDeviation≈3.65 → yieldBps≈381
    const SQRT_PRICE = 82_798_739_410_433_829_082_732_242_045n;
    const TICK = 880;
    const TICK_CUMULATIVE_NOW = 20_000_000_000_000n;
    const TICK_CUMULATIVE_7D = TICK_CUMULATIVE_NOW - 530_020_109n;

    // biome-ignore lint/suspicious/noExplicitAny: minimal mock
    const publicClient: any = {
      readContract: vi.fn().mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === 'slot0') return Promise.resolve([SQRT_PRICE, TICK, 0, 1, 1, 0, true]);
        if (functionName === 'observe')
          return Promise.resolve([
            [TICK_CUMULATIVE_NOW, TICK_CUMULATIVE_7D],
            [0n, 0n],
          ]);
        return Promise.reject(new Error(`Unexpected: ${functionName}`));
      }),
    };
    const ctx = { publicClient, chainId: 5000 as const, addresses, dexProvider: mockDex };
    const result = await executeGetYieldRate(ctx);

    // ±50 bps tolerance for rounding
    expect(result.yieldBps).toBeGreaterThanOrEqual(330);
    expect(result.yieldBps).toBeLessThanOrEqual(430);
  });

  it('throws InsufficientLiquidity when observe reverts with OLD (pool < 7 days old)', async () => {
    const SQRT_PRICE = 82_798_739_410_433_829_082_732_242_045n;
    // biome-ignore lint/suspicious/noExplicitAny: minimal mock
    const publicClient: any = {
      readContract: vi.fn().mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === 'slot0') return Promise.resolve([SQRT_PRICE, 880, 0, 1, 1, 0, true]);
        if (functionName === 'observe') return Promise.reject(new Error('OLD'));
        return Promise.reject(new Error(`Unexpected: ${functionName}`));
      }),
    };
    const ctx = { publicClient, chainId: 5000 as const, addresses, dexProvider: mockDex };
    await expect(executeGetYieldRate(ctx)).rejects.toSatisfy(
      (e: unknown) => e instanceof ConciergeError && e.type === 'InsufficientLiquidity',
    );
  });
});
