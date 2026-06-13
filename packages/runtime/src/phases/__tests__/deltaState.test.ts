import { describe, expect, it } from 'vitest';
import { type ActionSimResult, computeDeltaState } from '../deltaState.ts';

const USDC = '0xUSDC';
const USDT = '0xUSDT';

function action(over: Partial<ActionSimResult> = {}): ActionSimResult {
  return {
    ok: true,
    gasUsed: 100_000n,
    balanceDeltas: {},
    debtDeltas: {},
    healthFactorAfter: 2_000_000_000_000_000_000n, // 2.0
    oracleStale: false,
    ...over,
  };
}

describe('computeDeltaState — aggregation', () => {
  it('sums per-token balance deltas across actions', () => {
    const out = computeDeltaState({
      healthFactorBefore: 1_800_000_000_000_000_000n,
      perAction: [
        action({ balanceDeltas: { [USDC]: -100n } }),
        action({ balanceDeltas: { [USDC]: -50n, [USDT]: 200n } }),
      ],
    });
    expect(out.balanceDeltas[USDC]).toBe(-150n);
    expect(out.balanceDeltas[USDT]).toBe(200n);
  });

  it('sums per-token debt deltas independently', () => {
    const out = computeDeltaState({
      healthFactorBefore: 2n,
      perAction: [
        action({ debtDeltas: { [USDC]: 100n } }),
        action({ debtDeltas: { [USDC]: -40n } }),
      ],
    });
    expect(out.debtDeltas[USDC]).toBe(60n);
  });

  it('carries LAST successful action’s HF as healthFactorAfter', () => {
    const out = computeDeltaState({
      healthFactorBefore: 5n,
      perAction: [
        action({ healthFactorAfter: 4n }),
        action({ healthFactorAfter: 3n }),
        action({ healthFactorAfter: 2n }),
      ],
    });
    expect(out.healthFactorAfter).toBe(2n);
  });

  it('FREEZES HF projection at the first failed action', () => {
    const out = computeDeltaState({
      healthFactorBefore: 5n,
      perAction: [
        action({ healthFactorAfter: 4n }),
        action({ ok: false, healthFactorAfter: 1n }), // would-be-but-failed
        action({ healthFactorAfter: 99n }), // never reached
      ],
    });
    // HF stays at the last *successful* action.
    expect(out.healthFactorAfter).toBe(4n);
  });

  it('ORs oracleStale across all actions (any stale poisons the plan)', () => {
    const out = computeDeltaState({
      healthFactorBefore: 1n,
      perAction: [action({ oracleStale: false }), action({ oracleStale: true })],
    });
    expect(out.oracleChecks.stale).toBe(true);
  });

  it('empty perAction → DeltaState mirrors pre-HF and empty maps', () => {
    const out = computeDeltaState({
      healthFactorBefore: 1_700_000_000_000_000_000n,
      perAction: [],
    });
    expect(out.healthFactorBefore).toBe(1_700_000_000_000_000_000n);
    expect(out.healthFactorAfter).toBe(1_700_000_000_000_000_000n);
    expect(Object.keys(out.balanceDeltas)).toEqual([]);
    expect(Object.keys(out.debtDeltas)).toEqual([]);
    expect(out.oracleChecks.stale).toBe(false);
  });

  it('returned maps are frozen (caller cannot mutate aggregation)', () => {
    const out = computeDeltaState({
      healthFactorBefore: 1n,
      perAction: [action({ balanceDeltas: { [USDC]: 1n } })],
    });
    expect(() => {
      (out.balanceDeltas as Record<string, bigint>)[USDC] = 999n;
    }).toThrow();
  });
});
