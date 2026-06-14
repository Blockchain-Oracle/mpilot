// Unit tests for createLifiVenue — fetch is mocked via vi.stubGlobal; no fork required.
import { ConciergeError } from '@concierge-mantle/sdk';
import type { Address } from '@concierge-mantle/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLifiVenue } from '../../venues/lifi.ts';

const DIAMOND = '0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae' as Address;
const TOKEN_IN = '0x09bc4e0d864854c6afb6eb9a9cdf58ac190d0df9' as Address;
const TOKEN_OUT = '0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34' as Address;
const ACCOUNT = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266' as Address;

function makeVenue() {
  return createLifiVenue(5000, {} as never, undefined, DIAMOND);
}

// Use vi.stubGlobal to mock fetch — avoids needing DOM lib types for vi.spyOn(globalThis).
function stubFetchOk(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) }),
  );
}

function stubFetchNotOk(status: number) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: false, status, json: () => Promise.resolve({}) }),
  );
}

function stubFetchReject(err: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(err));
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

const SWAP_PARAMS = {
  tokenIn: TOKEN_IN,
  tokenOut: TOKEN_OUT,
  amountIn: 1_000_000n,
  amountOutMin: 990_000n,
  slippageBps: 50,
  recipient: ACCOUNT,
  account: ACCOUNT,
  deadline: BigInt(Math.floor(Date.now() / 1000) + 600),
} as const;

describe('createLifiVenue — quote', () => {
  it('returns null when Li.Fi returns HTTP 4xx', async () => {
    stubFetchNotOk(400);
    const result = await makeVenue().quote({
      tokenIn: TOKEN_IN,
      tokenOut: TOKEN_OUT,
      amountIn: 1_000_000n,
    });
    expect(result).toBeNull();
  });

  it('returns null when estimate.toAmount is missing', async () => {
    stubFetchOk({ estimate: {} });
    const result = await makeVenue().quote({
      tokenIn: TOKEN_IN,
      tokenOut: TOKEN_OUT,
      amountIn: 1_000_000n,
    });
    expect(result).toBeNull();
  });

  it('returns null when estimate.toAmount is 0', async () => {
    stubFetchOk({ estimate: { toAmount: '0' } });
    const result = await makeVenue().quote({
      tokenIn: TOKEN_IN,
      tokenOut: TOKEN_OUT,
      amountIn: 1_000_000n,
    });
    expect(result).toBeNull();
  });

  it('returns result with approvalAddress when present', async () => {
    const approvalAddress = '0xabcd000000000000000000000000000000000000';
    stubFetchOk({ estimate: { toAmount: '999000', approvalAddress } });
    const result = await makeVenue().quote({
      tokenIn: TOKEN_IN,
      tokenOut: TOKEN_OUT,
      amountIn: 1_000_000n,
    });
    expect(result).toMatchObject({ venue: 'lifi', amountOut: 999_000n, approvalAddress });
  });

  it('returns result without approvalAddress when not in response', async () => {
    stubFetchOk({ estimate: { toAmount: '999000' } });
    const result = await makeVenue().quote({
      tokenIn: TOKEN_IN,
      tokenOut: TOKEN_OUT,
      amountIn: 1_000_000n,
    });
    expect(result).toMatchObject({ venue: 'lifi', amountOut: 999_000n });
    expect(result).not.toHaveProperty('approvalAddress');
  });

  it('returns null on TimeoutError (AbortSignal.timeout fires TimeoutError, not AbortError)', async () => {
    stubFetchReject(new DOMException('signal timed out', 'TimeoutError'));
    const result = await makeVenue().quote({
      tokenIn: TOKEN_IN,
      tokenOut: TOKEN_OUT,
      amountIn: 1_000_000n,
    });
    expect(result).toBeNull();
  });

  it('returns null on AbortError (manually aborted AbortController)', async () => {
    stubFetchReject(new DOMException('aborted', 'AbortError'));
    const result = await makeVenue().quote({
      tokenIn: TOKEN_IN,
      tokenOut: TOKEN_OUT,
      amountIn: 1_000_000n,
    });
    expect(result).toBeNull();
  });

  it('propagates non-abort errors (network failure)', async () => {
    stubFetchReject(new TypeError('Failed to fetch'));
    await expect(
      makeVenue().quote({ tokenIn: TOKEN_IN, tokenOut: TOKEN_OUT, amountIn: 1_000_000n }),
    ).rejects.toThrow(TypeError);
  });

  it('returns null on malformed JSON response (200 OK but non-JSON body)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      }),
    );
    const result = await makeVenue().quote({
      tokenIn: TOKEN_IN,
      tokenOut: TOKEN_OUT,
      amountIn: 1_000_000n,
    });
    expect(result).toBeNull();
  });
});

describe('createLifiVenue — swap', () => {
  it('throws ConfigError when walletClient is absent', async () => {
    await expect(makeVenue().swap(SWAP_PARAMS)).rejects.toSatisfy(
      (e: unknown) => e instanceof ConciergeError && e.type === 'ConfigError',
    );
  });

  it('throws InsufficientLiquidity when Li.Fi returns no transactionRequest', async () => {
    stubFetchOk({ estimate: { toAmount: '999000' } });
    const walletClient = { chain: null, sendTransaction: vi.fn(), account: { address: ACCOUNT } };
    const venue = createLifiVenue(5000, {} as never, walletClient as never, DIAMOND);
    await expect(venue.swap(SWAP_PARAMS)).rejects.toSatisfy(
      (e: unknown) => e instanceof ConciergeError && e.type === 'InsufficientLiquidity',
    );
  });

  it('throws RpcError when transactionRequest.to is missing', async () => {
    stubFetchOk({
      estimate: { toAmount: '999000' },
      transactionRequest: { data: '0x', value: '0' },
    });
    const walletClient = { chain: null, sendTransaction: vi.fn(), account: { address: ACCOUNT } };
    const venue = createLifiVenue(5000, {} as never, walletClient as never, DIAMOND);
    await expect(venue.swap(SWAP_PARAMS)).rejects.toSatisfy(
      (e: unknown) => e instanceof ConciergeError && e.type === 'RpcError',
    );
  });

  it('throws RpcError when estimate.toAmount is missing on swap response', async () => {
    stubFetchOk({
      transactionRequest: {
        to: '0xabcd000000000000000000000000000000000001',
        data: '0x',
        value: '0',
      },
    });
    const txHash = `0x${'e'.repeat(64)}` as `0x${string}`;
    const walletClient = {
      chain: null,
      sendTransaction: vi.fn().mockResolvedValue(txHash),
      account: { address: ACCOUNT },
    };
    const publicClient = {
      waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: 'success' }),
    };
    const venue = createLifiVenue(5000, publicClient as never, walletClient as never, DIAMOND);
    await expect(venue.swap(SWAP_PARAMS)).rejects.toSatisfy(
      (e: unknown) => e instanceof ConciergeError && e.type === 'RpcError',
    );
  });

  it('throws RpcError when swap tx is reverted', async () => {
    stubFetchOk({
      estimate: { toAmount: '999000' },
      transactionRequest: {
        to: '0xabcd000000000000000000000000000000000001',
        data: '0x',
        value: '0',
      },
    });
    const txHash = `0x${'f'.repeat(64)}` as `0x${string}`;
    const walletClient = {
      chain: null,
      sendTransaction: vi.fn().mockResolvedValue(txHash),
      account: { address: ACCOUNT },
    };
    const publicClient = {
      waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: 'reverted' }),
    };
    const venue = createLifiVenue(5000, publicClient as never, walletClient as never, DIAMOND);
    await expect(venue.swap(SWAP_PARAMS)).rejects.toSatisfy(
      (e: unknown) => e instanceof ConciergeError && e.type === 'RpcError',
    );
  });
});
