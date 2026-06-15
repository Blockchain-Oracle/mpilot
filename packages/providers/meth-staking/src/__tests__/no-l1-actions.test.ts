// L2-only scope invariant for @mpilot/meth-staking.
// mETH on Mantle is a bridged ERC-20 — no L1 staking functions exist on L2.
// This guard prevents any future PR from accidentally exposing L1-only actions
// (stake, nativeUnstake, unstake, claimEth) via the Concierge provider API.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createMethStakingProvider } from '../provider.ts';

const L1_FORBIDDEN_ACTIONS = ['stake', 'nativeUnstake', 'unstake', 'claimEth'] as const;
// `acquire` is a DEX swap (WETH→mETH), NOT an L1 stake — allowed on L2.
const EXPECTED_ACTIONS = [
  'acquire',
  'getBalance',
  'getExchangeRate',
  'getUnwrapToWETH',
  'getYieldRate',
];

describe('MethStakingProvider — v1 L2-only scope invariant', () => {
  let provider: ReturnType<typeof createMethStakingProvider>;

  beforeAll(() => {
    provider = createMethStakingProvider(
      { chain: 'mantle-mainnet' },
      {
        dexProvider: {
          actions: { swap: { invoke: vi.fn() } },
        },
      },
    );
  });

  it('provider.actions contains ONLY the expected non-L1 actions (NoL1Actions guard)', () => {
    expect(Object.keys(provider.actions).sort()).toEqual(EXPECTED_ACTIONS.sort());
    const actionKeys = Object.keys(provider.actions);
    for (const forbidden of L1_FORBIDDEN_ACTIONS) {
      expect(
        actionKeys,
        `'${forbidden}' must not exist — L1 staking is Ethereum-only, not available on Mantle mETH bridged image`,
      ).not.toContain(forbidden);
    }
  });
});
