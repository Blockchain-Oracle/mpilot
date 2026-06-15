import { ConciergeError } from '@mpilot/sdk';
import { ADDRESSES } from '@mpilot/shared';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { executeGetBalance } from '../../actions/getBalance.ts';
import { type AnvilFork, KNOWN_METH_HOLDER, startAnvilFork } from '../setup.ts';

const AGNI_METH_WETH = '0x4f9E3683A523b66Da89d82BbA0a9CAA1C3243dF4' as const;
// A valid non-zero address with no mETH balance.
const NO_METH_ADDR = '0x0000000000000000000000000000000000000001' as const;

let fork: AnvilFork;

beforeAll(async () => {
  fork = await startAnvilFork();
}, 60_000);

afterAll(async () => {
  await fork.stop();
});

const addresses = {
  meth: ADDRESSES.mantleMainnet.tokens.mETH,
  weth: ADDRESSES.mantleMainnet.tokens.WETH,
  agniMethWeth: AGNI_METH_WETH,
};
const mockDex = { actions: { swap: { invoke: vi.fn() } } };

describe('getBalance — fork (real Mantle mainnet state)', () => {
  it('returns positive raw + ethValue > raw for a known mETH holder (test_getBalance_KnownHolder)', async () => {
    const ctx = {
      publicClient: fork.publicClient,
      chainId: 5000 as const,
      addresses,
      dexProvider: mockDex,
    };
    const result = await executeGetBalance(ctx, KNOWN_METH_HOLDER);

    const raw = BigInt(result.raw);
    const ethValue = BigInt(result.ethValue);

    expect(raw).toBeGreaterThan(0n);
    expect(ethValue).toBeGreaterThan(raw); // mETH > 1 WETH (staking accrued)
    expect(result.attestationPayload.schema).toBe('concierge.meth.read.v1');
  }, 30_000);

  it('returns zero raw + ethValue for an address with no mETH', async () => {
    const ctx = {
      publicClient: fork.publicClient,
      chainId: 5000 as const,
      addresses,
      dexProvider: mockDex,
    };
    const result = await executeGetBalance(ctx, NO_METH_ADDR);

    expect(BigInt(result.raw)).toBe(0n);
    expect(BigInt(result.ethValue)).toBe(0n);
  }, 30_000);
});

describe('getBalance — error paths (mocked)', () => {
  it('throws ConciergeError(RpcError) when balanceOf reverts', async () => {
    const SQRT_PRICE = 82_798_739_410_433_829_082_732_242_045n;
    // biome-ignore lint/suspicious/noExplicitAny: minimal mock
    const publicClient: any = {
      readContract: vi.fn().mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === 'balanceOf') return Promise.reject(new Error('revert'));
        if (functionName === 'slot0') return Promise.resolve([SQRT_PRICE, 880, 0, 1, 1, 0, true]);
        return Promise.reject(new Error(`Unexpected: ${functionName}`));
      }),
      getBlockNumber: vi.fn().mockResolvedValue(99_999n),
    };
    const ctx = { publicClient, chainId: 5000 as const, addresses, dexProvider: mockDex };
    await expect(executeGetBalance(ctx, KNOWN_METH_HOLDER)).rejects.toSatisfy(
      (e: unknown) => e instanceof ConciergeError && (e as ConciergeError).type === 'RpcError',
    );
  });

  it('throws ConciergeError(RpcError) when pool slot0 reverts', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: minimal mock
    const publicClient: any = {
      readContract: vi.fn().mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === 'balanceOf') return Promise.resolve(1_000_000_000_000_000_000n);
        if (functionName === 'slot0') return Promise.reject(new Error('slot0 revert'));
        return Promise.reject(new Error(`Unexpected: ${functionName}`));
      }),
      getBlockNumber: vi.fn().mockResolvedValue(99_999n),
    };
    const ctx = { publicClient, chainId: 5000 as const, addresses, dexProvider: mockDex };
    await expect(executeGetBalance(ctx, KNOWN_METH_HOLDER)).rejects.toSatisfy(
      (e: unknown) => e instanceof ConciergeError && (e as ConciergeError).type === 'RpcError',
    );
  });
});

describe('getBalance — happy path (mocked DEX)', () => {
  it('computes ethValue = raw * rate / 1e18 correctly', async () => {
    const RAW = 1_000_000_000_000_000_000n; // 1 mETH
    const SQRT_PRICE = 82_798_739_410_433_829_082_732_242_045n; // rate ≈ 1.092e18
    // biome-ignore lint/suspicious/noExplicitAny: minimal mock
    const publicClient: any = {
      readContract: vi.fn().mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === 'balanceOf') return Promise.resolve(RAW);
        if (functionName === 'slot0') return Promise.resolve([SQRT_PRICE, 880, 0, 1, 1, 0, true]);
        return Promise.reject(new Error(`Unexpected: ${functionName}`));
      }),
      getBlockNumber: vi.fn().mockResolvedValue(99_999n),
    };
    const ctx = { publicClient, chainId: 5000 as const, addresses, dexProvider: mockDex };
    const result = await executeGetBalance(ctx, KNOWN_METH_HOLDER);

    const raw = BigInt(result.raw);
    const ethValue = BigInt(result.ethValue);
    expect(ethValue).toBeGreaterThan(raw); // mETH rate > 1 WETH
    expect(result.attestationPayload.schema).toBe('concierge.meth.read.v1');
  });
});
