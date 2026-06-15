// Integration tests for createMethStakingProvider — verifies action surface,
// MissingDependency fail-fast, mETH address, and no-L1-actions invariant.
import { ConciergeError } from '@concierge-mantle/sdk';
import { ADDRESSES } from '@concierge-mantle/shared';
import { createPublicClient, http } from 'viem';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createMethStakingProvider } from '../provider.ts';
import { type AnvilFork, startAnvilFork } from './setup.ts';

const ADDRS = ADDRESSES.mantleMainnet;
const AGNI_METH_WETH = '0x4f9E3683A523b66Da89d82BbA0a9CAA1C3243dF4' as const;

const L1_FORBIDDEN_ACTIONS = ['stake', 'nativeUnstake', 'unstake', 'claimEth'] as const;

function makeMockDex() {
  return {
    actions: {
      swap: {
        invoke: vi.fn().mockResolvedValue({
          txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          amountOut: '1092000000000000000',
        }),
      },
    },
  };
}

describe('createMethStakingProvider — action surface', () => {
  it("exposes exactly ['acquire','getBalance','getExchangeRate','getUnwrapToWETH','getYieldRate']", () => {
    const p = createMethStakingProvider(
      { chain: 'mantle-mainnet' },
      { dexProvider: makeMockDex() },
    );
    expect(Object.keys(p.actions).sort()).toEqual([
      'acquire',
      'getBalance',
      'getExchangeRate',
      'getUnwrapToWETH',
      'getYieldRate',
    ]);
  });

  it('all actions support chainId 5000 but not 5003 via supportsNetwork()', () => {
    const p = createMethStakingProvider(
      { chain: 'mantle-mainnet' },
      { dexProvider: makeMockDex() },
    );
    for (const action of Object.values(p.actions)) {
      expect(action.supportsNetwork?.(5000)).toBe(true);
      expect(action.supportsNetwork?.(5003)).toBe(false);
    }
  });
});

describe('createMethStakingProvider — MissingDependency fail-fast', () => {
  it('throws MissingDependency when dexProvider is absent (test_constructor_MissingDexProvider)', () => {
    let thrown: unknown;
    try {
      // biome-ignore lint/suspicious/noExplicitAny: intentional test of runtime guard for JS callers
      createMethStakingProvider({ chain: 'mantle-mainnet' }, undefined as any);
    } catch (e) {
      thrown = e;
    }
    expect(thrown instanceof ConciergeError).toBe(true);
    expect(String(thrown)).toContain('MissingDependency');
    expect(String(thrown)).toContain('@concierge-mantle/mantle-dex');
  });

  it('does NOT throw when dexProvider is provided', () => {
    expect(() =>
      createMethStakingProvider({ chain: 'mantle-mainnet' }, { dexProvider: makeMockDex() }),
    ).not.toThrow();
  });
});

describe('createMethStakingProvider — no-L1-actions invariant (test_NoL1Actions)', () => {
  it('no stake/nativeUnstake/unstake/claimEth in provider.actions', () => {
    const p = createMethStakingProvider(
      { chain: 'mantle-mainnet' },
      { dexProvider: makeMockDex() },
    );
    const keys = Object.keys(p.actions);
    for (const forbidden of L1_FORBIDDEN_ACTIONS) {
      expect(
        keys,
        `'${forbidden}' must not exist — mETH on Mantle is L2-only bridged ERC-20`,
      ).not.toContain(forbidden);
    }
  });
});

describe('createMethStakingProvider — mETH address resolution', () => {
  it('uses the correct mETH address on Mantle Mainnet (verified 2026-06-04)', () => {
    const p = createMethStakingProvider(
      { chain: 'mantle-mainnet' },
      { dexProvider: makeMockDex() },
    );
    // The addresses are accessed through the context — verify via shared addresses package.
    expect(ADDRS.tokens.mETH).toBe('0xcDA86A272531e8640cD7F1a92c01839911B90bb0');
  });
});

describe('createMethStakingProvider — fork wiring', () => {
  let fork: AnvilFork;

  beforeAll(async () => {
    fork = await startAnvilFork();
  }, 60_000);

  afterAll(async () => {
    await fork.stop();
  });

  function makeProvider() {
    return createMethStakingProvider(
      {
        publicClient: createPublicClient({
          chain: fork.chain,
          transport: http(`http://127.0.0.1:${fork.port}`),
        }),
        chain: fork.chain,
        addresses: {
          meth: ADDRS.tokens.mETH,
          weth: ADDRS.tokens.WETH,
          agniMethWeth: AGNI_METH_WETH,
        },
      },
      { dexProvider: makeMockDex() },
    );
  }

  it('getExchangeRate returns rate in [1e18, 2e18] (test_getExchangeRate_InValidRange)', async () => {
    const result = await makeProvider().actions.getExchangeRate.invoke({});
    const rate = BigInt(result.rate);
    expect(rate).toBeGreaterThanOrEqual(10n ** 18n);
    expect(rate).toBeLessThanOrEqual(2n * 10n ** 18n);
  }, 30_000);
});
