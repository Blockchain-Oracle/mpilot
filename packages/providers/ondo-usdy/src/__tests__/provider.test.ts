// Integration tests for createOndoUsdyProvider — verifies the provider composes
// correctly and exposes the expected action surface and selector.
import { ADDRESSES } from '@mpilot/shared';
import { createPublicClient, http } from 'viem';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createOndoUsdyProvider } from '../provider.ts';
import { type AnvilFork, KNOWN_USDY_HOLDER, startAnvilFork } from './setup.ts';

const ADDRS = ADDRESSES.mantleMainnet;
const AGNI_USDY_USDC = '0xFF74722c79F7780D02967001c4E2C0E850f11810' as const;
const USDY_BLOCKLIST = '0xdBd7a7d8807f0C98c9A58f7732f2799c8587e5c6' as const;

// Valid non-zero address with no USDY history, not on any OFAC blocklist.
const RANDOM_EOA = '0x0000000000000000000000000000000000000001' as const;

describe('createOndoUsdyProvider — action surface', () => {
  it('exposes getBalance, getRateAccrual, getYieldRate — no mint or redeem', () => {
    const p = createOndoUsdyProvider({ chain: 'mantle-mainnet' });
    expect(Object.keys(p.actions).sort()).toEqual(['getBalance', 'getRateAccrual', 'getYieldRate']);
  });

  it('all actions support chainId 5000 but not 5003 via supportsNetwork()', () => {
    const p = createOndoUsdyProvider({ chain: 'mantle-mainnet' });
    for (const action of Object.values(p.actions)) {
      expect(action.supportsNetwork?.(5000)).toBe(true);
      expect(action.supportsNetwork?.(5003)).toBe(false);
    }
  });
});

describe('createOndoUsdyProvider — integration sanity (mocked full read-flow)', () => {
  it('getBalance + getRateAccrual + getYieldRate all resolve; all bigint fields are valid integer strings', async () => {
    const RAW = 1_000_000_000_000_000_000n;
    const SQRT_PRICE = 76_893_643_322_421_959_054_268_744_908_233_200n;
    const TICK = 275725;
    // Tick cumulatives representing ~500 bps APY (see agni.test.ts for derivation).
    const TICK_CUMULATIVE_NOW = 23_000_000_000_000n;
    const TICK_CUMULATIVE_7D = TICK_CUMULATIVE_NOW - 166_761_500_000n;

    // biome-ignore lint/suspicious/noExplicitAny: minimal mock
    const publicClient: any = {
      readContract: vi.fn().mockImplementation(({ functionName }: { functionName: string }) => {
        if (functionName === 'balanceOf') return Promise.resolve(RAW);
        if (functionName === 'slot0') return Promise.resolve([SQRT_PRICE, TICK, 0, 1, 1, 0, true]);
        if (functionName === 'observe')
          return Promise.resolve([
            [TICK_CUMULATIVE_NOW, TICK_CUMULATIVE_7D],
            [0n, 0n],
          ]);
        if (functionName === 'isBlocked') return Promise.resolve(false);
        return Promise.reject(new Error(`Unexpected: ${functionName}`));
      }),
      getBlockNumber: vi.fn().mockResolvedValue(99999n),
    };

    const provider = createOndoUsdyProvider({ publicClient, chain: 'mantle-mainnet' });

    const [balance, rate, yield_] = await Promise.all([
      provider.actions.getBalance.invoke({ user: KNOWN_USDY_HOLDER }),
      provider.actions.getRateAccrual.invoke({}),
      provider.actions.getYieldRate.invoke({}),
    ]);

    // All string-encoded bigint fields must match the non-negative integer string pattern.
    const INT_STR = /^\d+$/;
    expect(balance.raw).toMatch(INT_STR);
    expect(balance.usdValue).toMatch(INT_STR);
    expect(balance.yieldAccrued).toMatch(INT_STR);
    expect(rate.multiplier).toMatch(INT_STR);
    expect(rate.rateMantissa).toBe('0');
    expect(rate.lastUpdateBlock).toMatch(INT_STR);
    expect(yield_.yieldBps).toBeGreaterThan(0);
    expect(typeof yield_.yieldBps).toBe('number');
  });
});

describe('createOndoUsdyProvider — fork wiring', () => {
  let fork: AnvilFork;

  beforeAll(async () => {
    fork = await startAnvilFork();
  }, 60_000);

  afterAll(async () => {
    await fork.stop();
  });

  function makeProvider() {
    return createOndoUsdyProvider({
      publicClient: createPublicClient({
        chain: fork.chain,
        transport: http(`http://127.0.0.1:${fork.port}`),
      }),
      chain: fork.chain,
      addresses: {
        usdy: ADDRS.tokens.USDY,
        agniUsdyUsdc: AGNI_USDY_USDC,
        usdyBlocklist: USDY_BLOCKLIST,
      },
    });
  }

  it('isUserEligible returns true for a known USDY holder (fork — KnownEligible)', async () => {
    const eligible = await makeProvider().selectors.isUserEligible(KNOWN_USDY_HOLDER);
    expect(eligible).toBe(true);
  }, 30_000);

  it('isUserEligible returns true for a random EOA not on the OFAC blocklist (fork — KnownIneligible per blocklist semantics)', async () => {
    // USDY on Mantle uses an OFAC *blocklist*, not a KYC allowlist.
    // A random EOA that has never interacted with USDY is NOT blocked → isUserEligible = true.
    // Story-37 spec expected false (written assuming allowlist), but on-chain research
    // (story-36) confirmed the mechanism is blocklist-based. This fork test validates
    // the real Mantle blocklist contract ABI and address via a known-non-sanctioned EOA.
    const eligible = await makeProvider().selectors.isUserEligible(RANDOM_EOA);
    expect(eligible).toBe(true);
  }, 30_000);
});
