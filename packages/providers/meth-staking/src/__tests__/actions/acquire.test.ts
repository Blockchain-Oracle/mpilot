import { ConciergeError } from '@concierge-mantle/sdk';
import { ADDRESSES } from '@concierge-mantle/shared';
import { describe, expect, it, vi } from 'vitest';
import { executeAcquire } from '../../actions/acquire.ts';

const AGNI_METH_WETH = '0x4f9E3683A523b66Da89d82BbA0a9CAA1C3243dF4' as const;
const RECIPIENT = '0x1111111111111111111111111111111111111111' as const;
const DEX_TX_HASH = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as const;
const SQRT_PRICE = 82_798_739_410_433_829_082_732_242_045n; // rate ≈ 1.092e18 WETH/mETH

const addresses = {
  meth: ADDRESSES.mantleMainnet.tokens.mETH,
  weth: ADDRESSES.mantleMainnet.tokens.WETH,
  agniMethWeth: AGNI_METH_WETH,
};

function makePublicClient(sqrtPriceX96 = SQRT_PRICE) {
  return {
    readContract: vi.fn().mockResolvedValue([sqrtPriceX96, 880, 0, 1, 1, 0, true]),
    // biome-ignore lint/suspicious/noExplicitAny: minimal mock
  } as any;
}

describe('acquire — routes WETH → mETH through dex provider', () => {
  it('calls dexProvider.swap with correct args and returns dexTxHash + attestation', async () => {
    const swapSpy = vi
      .fn()
      .mockResolvedValue({ txHash: DEX_TX_HASH, amountOut: '915000000000000000' });
    const dexProvider = { actions: { swap: { invoke: swapSpy } } };
    const ctx = {
      publicClient: makePublicClient(),
      chainId: 5000 as const,
      addresses,
      dexProvider,
    };

    const result = await executeAcquire(ctx, {
      amountWeth: 1_000_000_000_000_000_000n,
      slippageBps: 50,
      recipient: RECIPIENT,
    });

    expect(swapSpy).toHaveBeenCalledOnce();
    expect(swapSpy).toHaveBeenCalledWith({
      tokenIn: ADDRESSES.mantleMainnet.tokens.WETH,
      tokenOut: ADDRESSES.mantleMainnet.tokens.mETH,
      amountIn: 1_000_000_000_000_000_000n,
      slippageBps: 50,
      recipient: RECIPIENT,
    });

    expect(result.dexTxHash).toBe(DEX_TX_HASH);
    expect(result.actualMethOut).toBe('915000000000000000');
    expect(result.attestationPayload.schema).toBe('concierge.meth.acquire-via-dex.v1');
    expect(result.attestationPayload.dexTxHash).toBe(DEX_TX_HASH);
    expect(result.attestationPayload.actualMethOut).toBe('915000000000000000');
  });

  it('expectedMethOut = amountWeth * 1e18 / rate (mETH worth > 1 WETH so out < in)', async () => {
    const swapSpy = vi
      .fn()
      .mockResolvedValue({ txHash: DEX_TX_HASH, amountOut: '915000000000000000' });
    const dexProvider = { actions: { swap: { invoke: swapSpy } } };
    const ctx = {
      publicClient: makePublicClient(),
      chainId: 5000 as const,
      addresses,
      dexProvider,
    };

    const result = await executeAcquire(ctx, {
      amountWeth: 1_000_000_000_000_000_000n, // 1 WETH
      slippageBps: 50,
      recipient: RECIPIENT,
    });

    // rate ≈ 1.092e18 WETH/mETH → expectedMethOut ≈ 0.9157e18 (less than 1 mETH)
    const expectedMethOut = BigInt(result.expectedMethOut);
    expect(expectedMethOut).toBeLessThan(1_000_000_000_000_000_000n);
    expect(expectedMethOut).toBeGreaterThan(800_000_000_000_000_000n);
    expect(result.attestationPayload.expectedMethOut).toBe(result.expectedMethOut);
  });
});

describe('acquire — error propagation', () => {
  it('re-throws ConciergeError(SwapSlippageBreach) from dex provider unchanged', async () => {
    const slippageError = new ConciergeError(
      'SwapSlippageBreach',
      '[@concierge-mantle/mantle-dex] swap: slippage breach',
    );
    const swapSpy = vi.fn().mockRejectedValue(slippageError);
    const dexProvider = { actions: { swap: { invoke: swapSpy } } };
    const ctx = {
      publicClient: makePublicClient(),
      chainId: 5000 as const,
      addresses,
      dexProvider,
    };

    await expect(
      executeAcquire(ctx, {
        amountWeth: 1_000_000_000_000_000_000n,
        slippageBps: 50,
        recipient: RECIPIENT,
      }),
    ).rejects.toSatisfy(
      (e: unknown) => e instanceof ConciergeError && e.type === 'SwapSlippageBreach',
    );
  });

  it('wraps a non-ConciergeError DEX failure as ConciergeError(RpcError)', async () => {
    const swapSpy = vi.fn().mockRejectedValue(new Error('connection reset'));
    const dexProvider = { actions: { swap: { invoke: swapSpy } } };
    const ctx = {
      publicClient: makePublicClient(),
      chainId: 5000 as const,
      addresses,
      dexProvider,
    };

    await expect(
      executeAcquire(ctx, {
        amountWeth: 1_000_000_000_000_000_000n,
        slippageBps: 50,
        recipient: RECIPIENT,
      }),
    ).rejects.toSatisfy((e: unknown) => e instanceof ConciergeError && e.type === 'RpcError');
  });
});
