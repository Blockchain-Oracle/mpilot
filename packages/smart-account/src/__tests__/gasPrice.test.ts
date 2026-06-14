import { ConciergeError } from '@concierge-mantle/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const TEST_PIMLICO_KEY = 'test-pimlico-api-key';

// Context7 audit C1+H1: gasPrice.ts now delegates to permissionless's
// getUserOperationGasPrice. Tests mock at the permissionless boundary —
// not at the global `fetch`, which viem's bundler transport bypasses.
const mockGetUserOperationGasPrice = vi.fn();

vi.mock('permissionless/actions/pimlico', () => ({
  getUserOperationGasPrice: (...args: unknown[]) => mockGetUserOperationGasPrice(...args),
}));

import { getUserOpGasPrice } from '../gasPrice.ts';

const FAKE_TIERED_PRICE = {
  slow: { maxFeePerGas: 100_000_000n, maxPriorityFeePerGas: 1_000_000_000n },
  standard: { maxFeePerGas: 2_000_000_000n, maxPriorityFeePerGas: 1_000_000_000n },
  fast: { maxFeePerGas: 2_500_000_000n, maxPriorityFeePerGas: 1_000_000_000n },
};

describe('getUserOpGasPrice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('PIMLICO_API_KEY', TEST_PIMLICO_KEY);
    mockGetUserOperationGasPrice.mockResolvedValue(FAKE_TIERED_PRICE);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns the STANDARD tier (safe default for autonomous tick workers)', async () => {
    const result = await getUserOpGasPrice({ chain: 'mantle-sepolia' });
    expect(result.maxFeePerGas).toBe(FAKE_TIERED_PRICE.standard.maxFeePerGas);
    expect(result.maxPriorityFeePerGas).toBe(FAKE_TIERED_PRICE.standard.maxPriorityFeePerGas);
  });

  it('returns fetchedAt as a numeric Unix-ms timestamp', async () => {
    const before = Date.now();
    const result = await getUserOpGasPrice({ chain: 'mantle-sepolia' });
    const after = Date.now();
    expect(result.fetchedAt).toBeGreaterThanOrEqual(before);
    expect(result.fetchedAt).toBeLessThanOrEqual(after);
  });

  it('calls permissionless getUserOperationGasPrice exactly once per request', async () => {
    await getUserOpGasPrice({ chain: 'mantle-sepolia' });
    expect(mockGetUserOperationGasPrice).toHaveBeenCalledTimes(1);
  });

  it('throws ConfigError when PIMLICO_API_KEY is missing', async () => {
    vi.stubEnv('PIMLICO_API_KEY', '');
    await expect(getUserOpGasPrice({ chain: 'mantle-sepolia' })).rejects.toMatchObject({
      type: 'ConfigError',
    });
  });

  it('respects apiKey override', async () => {
    vi.stubEnv('PIMLICO_API_KEY', '');
    const result = await getUserOpGasPrice({ chain: 'mantle-sepolia', apiKey: 'override-key' });
    expect(result.maxFeePerGas).toBe(FAKE_TIERED_PRICE.standard.maxFeePerGas);
  });

  it('throws ConfigError on unsupported chain', async () => {
    await expect(
      // biome-ignore lint/suspicious/noExplicitAny: intentional bad input
      getUserOpGasPrice({ chain: 'arbitrum' as any }),
    ).rejects.toMatchObject({ type: 'ConfigError' });
  });

  it('throws RpcError when standard tier is non-positive (Pimlico misbehaving)', async () => {
    mockGetUserOperationGasPrice.mockResolvedValueOnce({
      slow: FAKE_TIERED_PRICE.slow,
      standard: { maxFeePerGas: 0n, maxPriorityFeePerGas: 1n },
      fast: FAKE_TIERED_PRICE.fast,
    });
    await expect(getUserOpGasPrice({ chain: 'mantle-sepolia' })).rejects.toMatchObject({
      type: 'RpcError',
    });
  });

  it('throws RpcError when EIP-1559 invariant violated (priority > max)', async () => {
    mockGetUserOperationGasPrice.mockResolvedValueOnce({
      slow: FAKE_TIERED_PRICE.slow,
      standard: { maxFeePerGas: 1_000n, maxPriorityFeePerGas: 5_000n },
      fast: FAKE_TIERED_PRICE.fast,
    });
    await expect(getUserOpGasPrice({ chain: 'mantle-sepolia' })).rejects.toMatchObject({
      type: 'RpcError',
    });
  });

  it('wraps permissionless errors as RpcError (and preserves ConciergeError instances)', async () => {
    mockGetUserOperationGasPrice.mockRejectedValueOnce(new Error('upstream-bundler-down'));
    const err = await getUserOpGasPrice({ chain: 'mantle-sepolia' }).catch((e) => e);
    expect(err).toBeInstanceOf(ConciergeError);
    expect((err as ConciergeError).type).toBe('RpcError');
  });

  it('silent-failure C-NEW-5: throws RpcError when standard tier is absent (Pimlico contract change)', async () => {
    mockGetUserOperationGasPrice.mockResolvedValueOnce({
      slow: FAKE_TIERED_PRICE.slow,
      fast: FAKE_TIERED_PRICE.fast,
    } as never);
    await expect(getUserOpGasPrice({ chain: 'mantle-sepolia' })).rejects.toMatchObject({
      type: 'RpcError',
      message: expect.stringContaining('missing or malformed'),
    });
  });

  it('silent-failure C-NEW-5: throws RpcError when standard fields are non-bigint (regressed permissionless returns hex strings)', async () => {
    mockGetUserOperationGasPrice.mockResolvedValueOnce({
      slow: FAKE_TIERED_PRICE.slow,
      standard: { maxFeePerGas: '0x1' as never, maxPriorityFeePerGas: '0x1' as never },
      fast: FAKE_TIERED_PRICE.fast,
    });
    await expect(getUserOpGasPrice({ chain: 'mantle-sepolia' })).rejects.toMatchObject({
      type: 'RpcError',
      message: expect.stringContaining('missing or malformed'),
    });
  });
});
