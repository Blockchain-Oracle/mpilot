import { describe, expect, it } from 'vitest';
import { type ActionSimResult, computeDeltaState } from '../deltaState.ts';

const USDC = '0xUSDC';
const USDT = '0xUSDT';

function okResult(over: Partial<Extract<ActionSimResult, { ok: true }>> = {}): ActionSimResult {
  return {
    ok: true,
    gasUsed: 100_000n,
    balanceDeltas: {},
    debtDeltas: {},
    healthFactorAfter: 2_000_000_000_000_000_000n,
    oracleStale: false,
    ...over,
  };
}

function revertResult(reason = 'r'): ActionSimResult {
  return { ok: false, gasUsed: 50_000n, reason: { kind: 'revert', revertReason: reason } };
}

function oracleStaleFailure(): ActionSimResult {
  return { ok: false, gasUsed: 50_000n, reason: { kind: 'oracle-stale' } };
}

describe('computeDeltaState — aggregation (round-1: discriminated ActionSimResult)', () => {
  it('sums per-token balance deltas across SUCCESSFUL actions', () => {
    const out = computeDeltaState({
      healthFactorBefore: 1_800_000_000_000_000_000n,
      perAction: [
        okResult({ balanceDeltas: { [USDC]: -100n } }),
        okResult({ balanceDeltas: { [USDC]: -50n, [USDT]: 200n } }),
      ],
    });
    expect(out.balanceDeltas[USDC]).toBe(-150n);
    expect(out.balanceDeltas[USDT]).toBe(200n);
  });

  it('sums per-token debt deltas independently', () => {
    const out = computeDeltaState({
      healthFactorBefore: 2n,
      perAction: [
        okResult({ debtDeltas: { [USDC]: 100n } }),
        okResult({ debtDeltas: { [USDC]: -40n } }),
      ],
    });
    expect(out.debtDeltas[USDC]).toBe(60n);
  });

  it('carries LAST successful action’s HF as healthFactorAfter', () => {
    const out = computeDeltaState({
      healthFactorBefore: 5n,
      perAction: [
        okResult({ healthFactorAfter: 4n }),
        okResult({ healthFactorAfter: 3n }),
        okResult({ healthFactorAfter: 2n }),
      ],
    });
    expect(out.healthFactorAfter).toBe(2n);
  });

  it('FREEZES HF projection at the first failed action', () => {
    const out = computeDeltaState({
      healthFactorBefore: 5n,
      perAction: [
        okResult({ healthFactorAfter: 4n }),
        revertResult('boom'),
        okResult({ healthFactorAfter: 99n }), // never reached
      ],
    });
    expect(out.healthFactorAfter).toBe(4n);
  });

  it('ORs oracleStale across all actions (ADR-008)', () => {
    const out = computeDeltaState({
      healthFactorBefore: 1n,
      perAction: [okResult({ oracleStale: false }), okResult({ oracleStale: true })],
    });
    expect(out.oracleChecks.stale).toBe(true);
  });

  it('oracle-stale FAILURE marks deltaState.oracleChecks.stale = true', () => {
    const out = computeDeltaState({
      healthFactorBefore: 1n,
      perAction: [oracleStaleFailure()],
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
      perAction: [okResult({ balanceDeltas: { [USDC]: 1n } })],
    });
    expect(() => {
      (out.balanceDeltas as Record<string, bigint>)[USDC] = 999n;
    }).toThrow();
  });
});
