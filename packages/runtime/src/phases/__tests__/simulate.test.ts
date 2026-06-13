import { ConciergeError } from '@concierge/sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AgentState, Plan } from '../../types.ts';
import type { ActionSimResult } from '../deltaState.ts';
import { type ActionSimulator, runSimulate, type SimulatorRegistry } from '../simulate.ts';

afterEach(() => vi.restoreAllMocks());

const STATE: AgentState = {
  agentId: 'agent-sim',
  userId: 'u',
  chain: 'mantle-sepolia',
  goal: 'idle yield',
  policyId: 'p',
  recentTicks: [],
  openPositions: [],
};

const HF_BEFORE = 2_000_000_000_000_000_000n; // 2.0
const HF_FLOOR = 1_500_000_000_000_000_000n; // 1.5

const USDC = '0xUSDC';

function planOf(...calls: Array<{ provider: string; action: string; args?: unknown }>): Plan {
  return {
    intent: 'rebalance',
    providerCalls: calls.map((c) => ({
      provider: c.provider,
      action: c.action,
      args: (c.args as Record<string, unknown>) ?? {},
    })),
  };
}

function ok(over: Partial<ActionSimResult> = {}): ActionSimResult {
  return {
    ok: true,
    gasUsed: 100_000n,
    balanceDeltas: {},
    debtDeltas: {},
    healthFactorAfter: HF_BEFORE,
    oracleStale: false,
    ...over,
  };
}

function registryOf(entries: Array<[string, ActionSimulator]>): SimulatorRegistry {
  return new Map(entries);
}

describe('runSimulate — happy path', () => {
  it('single supply returns ok=true with aggregated gas + delta', async () => {
    const sim: ActionSimulator = vi
      .fn()
      .mockResolvedValue(ok({ balanceDeltas: { [USDC]: -100_000_000n }, gasUsed: 250_000n }));
    const out = await runSimulate({
      preState: STATE,
      plan: planOf({ provider: 'aave', action: 'supply', args: { asset: USDC, amount: '100' } }),
      registry: registryOf([['aave:supply', sim]]),
      healthFactorBefore: HF_BEFORE,
    });
    expect(out.kind).toBe('continue');
    if (out.kind === 'continue') {
      expect(out.data.ok).toBe(true);
      expect(out.data.gasEstimateWei).toBe(250_000n);
      expect(out.data.deltaState.balanceDeltas[USDC]).toBe(-100_000_000n);
      expect(out.data.error).toBeUndefined();
    }
  });

  it('passes signal + args to each simulator', async () => {
    const sim: ActionSimulator = vi.fn().mockResolvedValue(ok());
    await runSimulate({
      preState: STATE,
      plan: planOf({ provider: 'aave', action: 'supply', args: { x: 1 } }),
      registry: registryOf([['aave:supply', sim]]),
      healthFactorBefore: HF_BEFORE,
    });
    expect(sim).toHaveBeenCalledWith(STATE, { x: 1 }, expect.any(AbortSignal));
  });

  it('sequential actions: sums gas + aggregates deltas', async () => {
    const sim1 = vi
      .fn()
      .mockResolvedValue(ok({ gasUsed: 100_000n, balanceDeltas: { [USDC]: -50n } }));
    const sim2 = vi
      .fn()
      .mockResolvedValue(ok({ gasUsed: 200_000n, balanceDeltas: { [USDC]: 30n } }));
    const out = await runSimulate({
      preState: STATE,
      plan: planOf({ provider: 'aave', action: 'supply' }, { provider: 'aave', action: 'borrow' }),
      registry: registryOf([
        ['aave:supply', sim1],
        ['aave:borrow', sim2],
      ]),
      healthFactorBefore: HF_BEFORE,
    });
    if (out.kind === 'continue') {
      expect(out.data.gasEstimateWei).toBe(300_000n);
      expect(out.data.deltaState.balanceDeltas[USDC]).toBe(-20n);
    }
  });
});

describe('runSimulate — domain failures (returned, NOT thrown)', () => {
  it('action returns ok=false → SimError.kind="revert" with failedAtIndex', async () => {
    const sim: ActionSimulator = vi
      .fn()
      .mockResolvedValue(ok({ ok: false, revertReason: 'INSUFFICIENT_LIQUIDITY' }));
    const out = await runSimulate({
      preState: STATE,
      plan: planOf({ provider: 'aave', action: 'borrow' }),
      registry: registryOf([['aave:borrow', sim]]),
      healthFactorBefore: HF_BEFORE,
    });
    if (out.kind === 'continue') {
      expect(out.data.ok).toBe(false);
      expect(out.data.error?.kind).toBe('revert');
      if (out.data.error?.kind === 'revert') {
        expect(out.data.error.failedAtIndex).toBe(0);
        expect(out.data.error.revertReason).toContain('INSUFFICIENT_LIQUIDITY');
      }
    }
  });

  it('SHORT-CIRCUITS after first failed action (does NOT call subsequent simulators)', async () => {
    const sim1: ActionSimulator = vi.fn().mockResolvedValue(ok({ ok: false, revertReason: 'r' }));
    const sim2: ActionSimulator = vi.fn().mockResolvedValue(ok());
    await runSimulate({
      preState: STATE,
      plan: planOf({ provider: 'aave', action: 'supply' }, { provider: 'aave', action: 'borrow' }),
      registry: registryOf([
        ['aave:supply', sim1],
        ['aave:borrow', sim2],
      ]),
      healthFactorBefore: HF_BEFORE,
    });
    expect(sim1).toHaveBeenCalledTimes(1);
    expect(sim2).not.toHaveBeenCalled();
  });

  it('oracleStale → SimError.kind="oracle-stale" (precedes revert classification)', async () => {
    const sim: ActionSimulator = vi
      .fn()
      .mockResolvedValue(ok({ ok: false, oracleStale: true, revertReason: 'whatever' }));
    const out = await runSimulate({
      preState: STATE,
      plan: planOf({ provider: 'aave', action: 'supply' }),
      registry: registryOf([['aave:supply', sim]]),
      healthFactorBefore: HF_BEFORE,
    });
    if (out.kind === 'continue') expect(out.data.error?.kind).toBe('oracle-stale');
  });

  it('healthFactorAfter < floor → SimError.kind="hf-breach"', async () => {
    const sim: ActionSimulator = vi.fn().mockResolvedValue(
      ok({ healthFactorAfter: 1_400_000_000_000_000_000n }), // 1.4 < 1.5
    );
    const out = await runSimulate({
      preState: STATE,
      plan: planOf({ provider: 'aave', action: 'borrow' }),
      registry: registryOf([['aave:borrow', sim]]),
      healthFactorBefore: HF_BEFORE,
    });
    if (out.kind === 'continue') {
      expect(out.data.ok).toBe(false);
      expect(out.data.error?.kind).toBe('hf-breach');
    }
  });

  it('unknown action (missing registry entry) → SimError.kind="unknown-action"', async () => {
    const out = await runSimulate({
      preState: STATE,
      plan: planOf({ provider: 'mystery', action: 'doStuff' }),
      registry: registryOf([]),
      healthFactorBefore: HF_BEFORE,
    });
    if (out.kind === 'continue') {
      expect(out.data.ok).toBe(false);
      expect(out.data.error?.kind).toBe('unknown-action');
    }
  });

  it('gas-overrun → SimError.kind="gas-overrun"', async () => {
    const sim: ActionSimulator = vi.fn().mockResolvedValue(ok({ gasUsed: 40_000_000n })); // > 30M default
    const out = await runSimulate({
      preState: STATE,
      plan: planOf({ provider: 'aave', action: 'supply' }),
      registry: registryOf([['aave:supply', sim]]),
      healthFactorBefore: HF_BEFORE,
    });
    if (out.kind === 'continue') expect(out.data.error?.kind).toBe('gas-overrun');
  });

  it('SECURITY: revertReason sanitized (Pimlico apikey URL redacted)', async () => {
    const sim: ActionSimulator = vi
      .fn()
      .mockResolvedValue(
        ok({ ok: false, revertReason: 'revert at https://x/v2/rpc?apikey=FAKE_SIM_KEY' }),
      );
    const out = await runSimulate({
      preState: STATE,
      plan: planOf({ provider: 'aave', action: 'supply' }),
      registry: registryOf([['aave:supply', sim]]),
      healthFactorBefore: HF_BEFORE,
    });
    if (out.kind === 'continue' && out.data.error?.kind === 'revert') {
      expect(out.data.error.revertReason).not.toContain('FAKE_SIM_KEY');
      expect(out.data.error.revertReason).toContain('<redacted>');
    }
  });
});

describe('runSimulate — abort signal', () => {
  it('pre-aborted signal → SimError.kind="aborted" at index 0; no simulators called', async () => {
    const sim: ActionSimulator = vi.fn().mockResolvedValue(ok());
    const ctl = new AbortController();
    ctl.abort();
    const out = await runSimulate(
      {
        preState: STATE,
        plan: planOf({ provider: 'aave', action: 'supply' }),
        registry: registryOf([['aave:supply', sim]]),
        healthFactorBefore: HF_BEFORE,
      },
      { abortSignal: ctl.signal },
    );
    if (out.kind === 'continue') {
      expect(out.data.error?.kind).toBe('aborted');
      if (out.data.error?.kind === 'aborted') expect(out.data.error.failedAtIndex).toBe(0);
    }
    expect(sim).not.toHaveBeenCalled();
  });
});

describe('runSimulate — infra failures (THROW, not capture)', () => {
  it('simulator throws → ConciergeError("RpcError") with failedAtIndex metadata', async () => {
    const sim: ActionSimulator = vi.fn().mockRejectedValue(new Error('viem rpc 500'));
    let captured: ConciergeError | undefined;
    try {
      await runSimulate({
        preState: STATE,
        plan: planOf({ provider: 'aave', action: 'supply' }),
        registry: registryOf([['aave:supply', sim]]),
        healthFactorBefore: HF_BEFORE,
      });
    } catch (e) {
      captured = e as ConciergeError;
    }
    expect(captured).toBeInstanceOf(ConciergeError);
    expect(captured?.type).toBe('RpcError');
    expect(captured?.metadata?.['failedAtIndex']).toBe(0);
  });

  it('simulator throw cause-chain sanitized (no raw apikey)', async () => {
    const leaky = new Error('rpc at https://x/v2/rpc?apikey=FAKE_INFRA_KEY');
    const sim: ActionSimulator = vi.fn().mockRejectedValue(leaky);
    let captured: ConciergeError | undefined;
    try {
      await runSimulate({
        preState: STATE,
        plan: planOf({ provider: 'aave', action: 'supply' }),
        registry: registryOf([['aave:supply', sim]]),
        healthFactorBefore: HF_BEFORE,
      });
    } catch (e) {
      captured = e as ConciergeError;
    }
    let cur: unknown = captured;
    let depth = 0;
    while (cur instanceof Error && depth < 10) {
      expect(cur.message).not.toContain('FAKE_INFRA_KEY');
      cur = cur.cause;
      depth++;
    }
  });
});

describe('runSimulate — orchestrator contract', () => {
  it('PhaseOutcome shape is { kind: "continue" } regardless of ok=true/false', async () => {
    const sim: ActionSimulator = vi.fn().mockResolvedValue(ok({ ok: false, revertReason: 'r' }));
    const out = await runSimulate({
      preState: STATE,
      plan: planOf({ provider: 'aave', action: 'supply' }),
      registry: registryOf([['aave:supply', sim]]),
      healthFactorBefore: HF_BEFORE,
    });
    // Domain failures are RETURNED inside `continue` — they don't become PhaseOutcome.error.
    expect(out.kind).toBe('continue');
  });
});

describe('runSimulate — HF floor configurability', () => {
  it('custom healthFactorFloor (lower) accepts a riskier plan', async () => {
    const sim: ActionSimulator = vi.fn().mockResolvedValue(
      ok({ healthFactorAfter: 1_100_000_000_000_000_000n }), // 1.1
    );
    const out = await runSimulate(
      {
        preState: STATE,
        plan: planOf({ provider: 'aave', action: 'borrow' }),
        registry: registryOf([['aave:borrow', sim]]),
        healthFactorBefore: HF_BEFORE,
      },
      { healthFactorFloor: HF_FLOOR / 2n }, // floor 0.75
    );
    if (out.kind === 'continue') expect(out.data.ok).toBe(true);
  });
});
