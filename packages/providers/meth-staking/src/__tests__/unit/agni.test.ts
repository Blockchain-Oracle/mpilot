import { ConciergeError } from '@mpilot/sdk';
import { describe, expect, it, vi } from 'vitest';
import { computeRateFromSqrt, fetchPoolState, fetchYieldBps } from '../../_agni.ts';

const POOL = '0x4f9E3683A523b66Da89d82BbA0a9CAA1C3243dF4' as const;

// sqrtPriceX96 for mETH/WETH rate ≈ 1.092 (verified on-chain 2026-06-11).
// rate_1e18 = sqrtPriceX96^2 * 1e18 / 2^192 ≈ 1.092e18
const SQRT_PRICE = 82_798_739_410_433_829_082_732_242_045n;
// tick_now ≈ 880 for mETH/WETH at 1.092 ratio
const TICK = 880;

function makeClient(slot0Result: unknown, observeResult?: unknown, observeError?: Error) {
  return {
    readContract: vi.fn().mockImplementation(({ functionName }: { functionName: string }) => {
      if (functionName === 'slot0') return Promise.resolve(slot0Result);
      if (functionName === 'observe') {
        if (observeError) return Promise.reject(observeError);
        return Promise.resolve(observeResult);
      }
      return Promise.reject(new Error(`Unexpected: ${functionName}`));
    }),
    // biome-ignore lint/suspicious/noExplicitAny: minimal mock
  } as any;
}

describe('computeRateFromSqrt', () => {
  it('returns ~1.092e18 for the real Mantle mETH/WETH sqrtPriceX96', () => {
    const rate = computeRateFromSqrt(SQRT_PRICE);
    expect(rate).toBeGreaterThan(1_080_000_000_000_000_000n);
    expect(rate).toBeLessThan(1_100_000_000_000_000_000n);
  });

  it('throws ConciergeError(RpcError) for sqrtPriceX96 = 0 (uninitialized pool)', () => {
    let thrown: unknown;
    try {
      computeRateFromSqrt(0n);
    } catch (e) {
      thrown = e;
    }
    expect(thrown instanceof ConciergeError && (thrown as ConciergeError).type === 'RpcError').toBe(
      true,
    );
  });

  it('throws ConciergeError(RpcError) when sqrtPriceX96 is too small (rate truncates to 0)', () => {
    let thrown: unknown;
    try {
      computeRateFromSqrt(1n);
    } catch (e) {
      thrown = e;
    }
    expect(thrown instanceof ConciergeError && (thrown as ConciergeError).type === 'RpcError').toBe(
      true,
    );
  });

  it('throws ConciergeError(RpcError) when computed rate is below 0.5e18 (sanity floor)', () => {
    // sqrtPriceX96 = 2^96 * 0.3 → rate ≈ 0.09e18 < 0.5e18 sanity floor
    const SQRT_LOW = (79228162514264337593543950336n * 3n) / 10n;
    let thrown: unknown;
    try {
      computeRateFromSqrt(SQRT_LOW);
    } catch (e) {
      thrown = e;
    }
    expect(thrown instanceof ConciergeError && (thrown as ConciergeError).type === 'RpcError').toBe(
      true,
    );
  });
});

describe('fetchPoolState', () => {
  it('returns sqrtPriceX96 and tick from slot0', async () => {
    const client = makeClient([SQRT_PRICE, TICK, 0, 1, 1, 0, true]);
    const result = await fetchPoolState(client, POOL, 'test');
    expect(result.sqrtPriceX96).toBe(SQRT_PRICE);
    expect(result.tick).toBe(TICK);
  });

  it('throws ConciergeError(RpcError) when slot0 reverts', async () => {
    const client = makeClient(undefined);
    client.readContract = vi.fn().mockRejectedValue(new Error('revert'));
    await expect(fetchPoolState(client, POOL, 'test')).rejects.toSatisfy(
      (e: unknown) => e instanceof ConciergeError && e.type === 'RpcError',
    );
  });
});

describe('fetchYieldBps', () => {
  // tick_now = 880 (rate ≈ 1.092), target ~381 bps yield (ETH staking range 3-5%).
  // For 381 bps: tickDeviation = 381 / (2 * 52.143) ≈ 3.653
  // meanTick = 880 - 3.653 = 876.347
  // tickCumulativeDiff = 876.350 * 604800 ≈ 530_020_109 → meanTick = 876.350
  // observe([0, 7d]) returns [cumulativeNow, cumulative7dAgo]
  // cumulativeNow > cumulative7dAgo (ticks lower in the past = mETH was cheaper)
  const TICK_CUMULATIVE_NOW = 20_000_000_000_000n;
  const TICK_CUMULATIVE_7D = TICK_CUMULATIVE_NOW - 530_020_109n;

  it('returns ~380 bps for synthetic 7-day tick data representing ~3.8% APY (test_getYieldRate_FixtureMath)', async () => {
    const slot0 = [SQRT_PRICE, TICK, 0, 1, 1, 0, true];
    const observeResult = [
      [TICK_CUMULATIVE_NOW, TICK_CUMULATIVE_7D],
      [0n, 0n],
    ];
    const client = makeClient(slot0, observeResult);
    const yieldBps = await fetchYieldBps(client, POOL, 'test');
    expect(yieldBps).toBeGreaterThanOrEqual(330);
    expect(yieldBps).toBeLessThanOrEqual(430);
  });

  it('throws ConciergeError(InsufficientLiquidity) when observe reverts with OLD', async () => {
    const slot0 = [SQRT_PRICE, TICK, 0, 1, 1, 0, true];
    const client = makeClient(slot0, undefined, new Error('OLD'));
    await expect(fetchYieldBps(client, POOL, 'test')).rejects.toSatisfy(
      (e: unknown) => e instanceof ConciergeError && e.type === 'InsufficientLiquidity',
    );
  });

  it('throws ConciergeError(RpcError) when observe fails with a non-OLD transport error', async () => {
    const slot0 = [SQRT_PRICE, TICK, 0, 1, 1, 0, true];
    const client = makeClient(slot0, undefined, new Error('connection refused'));
    await expect(fetchYieldBps(client, POOL, 'test')).rejects.toSatisfy(
      (e: unknown) => e instanceof ConciergeError && e.type === 'RpcError',
    );
  });

  it('throws ConciergeError(RpcError) when tick cumulative diff exceeds safe integer range', async () => {
    const slot0 = [SQRT_PRICE, TICK, 0, 1, 1, 0, true];
    const overflowDiff = 10_000_000_000_000_000n; // > Number.MAX_SAFE_INTEGER
    const client = makeClient(slot0, [
      [overflowDiff, 0n],
      [0n, 0n],
    ]);
    await expect(fetchYieldBps(client, POOL, 'test')).rejects.toSatisfy(
      (e: unknown) => e instanceof ConciergeError && e.type === 'RpcError',
    );
  });

  it('throws ConciergeError(RpcError) when computed yield exceeds 10,000 bps ceiling', async () => {
    const slot0 = [SQRT_PRICE, TICK, 0, 1, 1, 0, true];
    // For yieldBps > 10000: tickDeviation > 10000 / (2 * 52.143) = 95.9
    // tickCumulativeDiff such that meanTick < tick_now - 96 = 784
    // diff = 784 * 604800 = 474_163_200 — meanTick = 784, deviation = 880 - 784 = 96
    // yieldBps ≈ 2 * 96 * 52.143 ≈ 10,011
    const TICK_CUMULATIVE_7D_CEILING = TICK_CUMULATIVE_NOW - 474_163_200n;
    const client = makeClient(slot0, [
      [TICK_CUMULATIVE_NOW, TICK_CUMULATIVE_7D_CEILING],
      [0n, 0n],
    ]);
    await expect(fetchYieldBps(client, POOL, 'test')).rejects.toSatisfy(
      (e: unknown) => e instanceof ConciergeError && e.type === 'RpcError',
    );
  });

  it('throws ConciergeError(InsufficientLiquidity) when computed yield <= 0', async () => {
    const slot0 = [SQRT_PRICE, TICK, 0, 1, 1, 0, true];
    // meanTick > tick_now → mETH depreciated, negative yield
    // tickCumulativeDiff > tick_now * SECONDS_7D → diff = 882 * 604800 = 533_433_600
    const depreciatedDiff = 882n * 604800n;
    const client = makeClient(slot0, [
      [TICK_CUMULATIVE_NOW, TICK_CUMULATIVE_NOW - depreciatedDiff],
      [0n, 0n],
    ]);
    await expect(fetchYieldBps(client, POOL, 'test')).rejects.toSatisfy(
      (e: unknown) => e instanceof ConciergeError && e.type === 'InsufficientLiquidity',
    );
  });
});
