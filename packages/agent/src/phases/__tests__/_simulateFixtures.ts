import type { AgentState, Plan } from '../../types.ts';
import type { ActionSimResult } from '../deltaState.ts';
import type { ActionSimulator, SimulatorRegistry } from '../simulate.ts';

export const STATE: AgentState = {
  agentId: 'agent-sim',
  userId: 'u',
  chain: 'mantle-sepolia',
  goal: 'idle yield',
  policyId: 'p',
  recentTicks: [],
  openPositions: [],
};

export const HF_BEFORE = 2_000_000_000_000_000_000n;
export const HF_FLOOR = 1_500_000_000_000_000_000n;
export const USDC = '0xUSDC';

export function planOf(
  ...calls: Array<{ provider: string; action: string; args?: unknown }>
): Plan {
  return {
    intent: 'rebalance',
    providerCalls: calls.map((c) => ({
      provider: c.provider,
      action: c.action,
      args: (c.args as Record<string, unknown>) ?? {},
    })),
  };
}

export function okResult(
  over: Partial<Extract<ActionSimResult, { ok: true }>> = {},
): ActionSimResult {
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

export function revertResult(reason = 'r'): ActionSimResult {
  return { ok: false, gasUsed: 50_000n, reason: { kind: 'revert', revertReason: reason } };
}

export function oracleStaleResult(): ActionSimResult {
  return { ok: false, gasUsed: 50_000n, reason: { kind: 'oracle-stale' } };
}

export function registryOf(entries: Array<[string, ActionSimulator]>): SimulatorRegistry {
  return new Map(entries.map(([k, fn]) => [k as `${string}:${string}`, fn]));
}
