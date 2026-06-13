import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tick } from '../tick.ts';
import type {
  AgentState,
  Attestation,
  Exec,
  PhaseOutcome,
  Plan,
  Proposal,
  Sim,
  TickConfig,
  TickLock,
  TickLogger,
} from '../types.ts';

const AGENT_ID = '11111111-1111-4111-8111-111111111111';

const SAMPLE_STATE: AgentState = {
  agentId: AGENT_ID,
  userId: 'user-1',
  chain: 'mantle-sepolia',
  goal: 'idle yield on USDC',
  policyId: 'policy-1',
  recentTicks: [],
  openPositions: [],
};

const PLAN: Plan = { intent: 'supply', providerCalls: [] };
const SIM: Sim = { ok: true, gasEstimateWei: 100n, expectedValueDeltaUsd: 0.01, warnings: [] };
const PROP: Proposal = { id: 'p1', requiresApproval: false, summary: 'supply', txParams: [] };
const EXEC: Exec = { txHashes: ['0xabc'], blockNumbers: [1n] };
const ATTEST: Attestation = { attestationUid: 'uid-1', recordedAt: new Date() };

function ok<T>(data: T): PhaseOutcome<T> {
  return { kind: 'continue', data };
}
function stop<T>(reason: string): PhaseOutcome<T> {
  return { kind: 'stop', reason };
}
function err<T>(error: unknown): PhaseOutcome<T> {
  return { kind: 'error', error };
}

interface Capture {
  acquired: string[];
  released: string[];
}

function makeLock(opts: { acquireReturns?: boolean; releaseThrows?: Error } = {}): {
  lock: TickLock;
  cap: Capture;
} {
  const cap: Capture = { acquired: [], released: [] };
  return {
    cap,
    lock: {
      async acquire(key) {
        cap.acquired.push(key);
        return opts.acquireReturns ?? true;
      },
      async release(key) {
        cap.released.push(key);
        if (opts.releaseThrows) throw opts.releaseThrows;
      },
    },
  };
}

function makeSilentLogger(): TickLogger {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

function makeConfig(overrides: Partial<TickConfig> = {}): TickConfig {
  const { lock } = makeLock();
  return {
    agentId: AGENT_ID,
    loadState: vi.fn().mockResolvedValue(SAMPLE_STATE),
    plan: vi.fn().mockResolvedValue(ok(PLAN)),
    simulate: vi.fn().mockResolvedValue(ok(SIM)),
    propose: vi.fn().mockResolvedValue(ok(PROP)),
    execute: vi.fn().mockResolvedValue(ok(EXEC)),
    record: vi.fn().mockResolvedValue(ok(ATTEST)),
    lock,
    ...overrides,
  };
}

describe('tick — lock contention', () => {
  it('returns { kind: "skipped" } when lock already held; does NOT load state', async () => {
    const { lock, cap } = makeLock({ acquireReturns: false });
    const loadState = vi.fn();
    const result = await tick(makeConfig({ lock, loadState }));
    expect(result).toEqual({ kind: 'skipped', reason: 'already_running' });
    expect(cap.acquired).toEqual([`lock:agent:${AGENT_ID}`]);
    expect(cap.released).toEqual([]); // never acquired → never released
    expect(loadState).not.toHaveBeenCalled();
  });

  it('uses default 60s TTL when not overridden', async () => {
    let capturedTtl = 0;
    const lock: TickLock = {
      async acquire(_k, ttl) {
        capturedTtl = ttl;
        return true;
      },
      async release() {},
    };
    await tick(makeConfig({ lock }));
    expect(capturedTtl).toBe(60_000);
  });

  it('honors custom lockTtlMs', async () => {
    let capturedTtl = 0;
    const lock: TickLock = {
      async acquire(_k, ttl) {
        capturedTtl = ttl;
        return true;
      },
      async release() {},
    };
    await tick(makeConfig({ lock, lockTtlMs: 5_000 }));
    expect(capturedTtl).toBe(5_000);
  });
});

describe('tick — phase sequencing happy path', () => {
  it('runs plan → simulate → propose → execute → record in order, returns completed', async () => {
    const order: string[] = [];
    const cfg = makeConfig({
      plan: vi.fn(async () => {
        order.push('plan');
        return ok(PLAN);
      }),
      simulate: vi.fn(async () => {
        order.push('simulate');
        return ok(SIM);
      }),
      propose: vi.fn(async () => {
        order.push('propose');
        return ok(PROP);
      }),
      execute: vi.fn(async () => {
        order.push('execute');
        return ok(EXEC);
      }),
      record: vi.fn(async () => {
        order.push('record');
        return ok(ATTEST);
      }),
    });
    const result = await tick(cfg);
    expect(result).toEqual({ kind: 'completed', attestation: ATTEST });
    expect(order).toEqual(['plan', 'simulate', 'propose', 'execute', 'record']);
  });

  it('passes prior phase data into the next phase', async () => {
    const cfg = makeConfig();
    await tick(cfg);
    expect(cfg.plan).toHaveBeenCalledWith(SAMPLE_STATE);
    expect(cfg.simulate).toHaveBeenCalledWith(SAMPLE_STATE, PLAN);
    expect(cfg.propose).toHaveBeenCalledWith(SAMPLE_STATE, SIM);
    expect(cfg.execute).toHaveBeenCalledWith(SAMPLE_STATE, PROP);
    expect(cfg.record).toHaveBeenCalledWith(SAMPLE_STATE, EXEC);
  });
});

describe('tick — early returns (stop) by phase', () => {
  it('plan stop → halts BEFORE simulate; releases lock', async () => {
    const { lock, cap } = makeLock();
    const cfg = makeConfig({
      lock,
      plan: vi.fn().mockResolvedValue(stop('noop')),
      simulate: vi.fn(),
      propose: vi.fn(),
      execute: vi.fn(),
      record: vi.fn(),
    });
    const result = await tick(cfg);
    expect(result).toEqual({ kind: 'stopped', phase: 'plan', reason: 'noop' });
    expect(cfg.simulate).not.toHaveBeenCalled();
    expect(cfg.record).not.toHaveBeenCalled();
    expect(cap.released).toEqual([`lock:agent:${AGENT_ID}`]);
  });

  it('simulate stop (NOT OK) → halts BEFORE propose', async () => {
    const cfg = makeConfig({
      simulate: vi.fn().mockResolvedValue(stop('insufficient liquidity')),
      propose: vi.fn(),
      execute: vi.fn(),
      record: vi.fn(),
    });
    const result = await tick(cfg);
    expect(result.kind).toBe('stopped');
    if (result.kind === 'stopped') {
      expect(result.phase).toBe('simulate');
      expect(result.reason).toBe('insufficient liquidity');
    }
    expect(cfg.propose).not.toHaveBeenCalled();
  });

  it('propose stop (requiresApproval) → halts BEFORE execute', async () => {
    const cfg = makeConfig({
      propose: vi.fn().mockResolvedValue(stop('awaiting:p1')),
      execute: vi.fn(),
      record: vi.fn(),
    });
    const result = await tick(cfg);
    expect(result.kind).toBe('stopped');
    if (result.kind === 'stopped') expect(result.phase).toBe('propose');
    expect(cfg.execute).not.toHaveBeenCalled();
  });
});

describe('tick — error handling', () => {
  it('phase returns error → tick returns { kind: "errored", phase } and skips subsequent phases', async () => {
    const boom = new Error('rpc 502');
    const cfg = makeConfig({
      simulate: vi.fn().mockResolvedValue(err(boom)),
      propose: vi.fn(),
      execute: vi.fn(),
      record: vi.fn(),
    });
    const result = await tick(cfg);
    expect(result.kind).toBe('errored');
    if (result.kind === 'errored') {
      expect(result.phase).toBe('simulate');
      expect(result.error).toBe(boom);
    }
    expect(cfg.propose).not.toHaveBeenCalled();
  });

  it('phase function THROWS → wrapped as { kind: "errored" }; lock still releases', async () => {
    const { lock, cap } = makeLock();
    const boom = new Error('uncaught');
    const cfg = makeConfig({
      lock,
      execute: vi.fn().mockRejectedValue(boom),
      record: vi.fn(),
    });
    const result = await tick(cfg);
    expect(result.kind).toBe('errored');
    if (result.kind === 'errored') {
      expect(result.phase).toBe('execute');
      expect(result.error).toBe(boom);
    }
    expect(cap.released).toEqual([`lock:agent:${AGENT_ID}`]);
    expect(cfg.record).not.toHaveBeenCalled();
  });

  it('loadState throws → wrapped as errored("plan") path? no — surfaces as uncaught BEFORE phases', async () => {
    // loadState happens BEFORE the phase loop. An unexpected throw propagates,
    // but the finally still releases the lock.
    const { lock, cap } = makeLock();
    const cfg = makeConfig({
      lock,
      loadState: vi.fn().mockRejectedValue(new Error('db down')),
    });
    await expect(tick(cfg)).rejects.toThrow(/db down/);
    expect(cap.released).toEqual([`lock:agent:${AGENT_ID}`]);
  });
});

describe('tick — lock release safety', () => {
  it('release error is LOGGED (warn) but not thrown — TTL fallback handles next tick', async () => {
    const logger = makeSilentLogger();
    const { lock } = makeLock({ releaseThrows: new Error('redis disconnect') });
    const result = await tick(makeConfig({ lock, logger }));
    expect(result.kind).toBe('completed');
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ lockKey: `lock:agent:${AGENT_ID}` }),
      'tick.lock_release_failed',
    );
  });
});

describe('tick — structured logging', () => {
  let logger: ReturnType<typeof makeSilentLogger>;

  beforeEach(() => {
    logger = makeSilentLogger();
  });

  it('logs each phase with agentId + tickId + phase + durationMs', async () => {
    await tick(makeConfig({ logger }));
    for (const phase of ['plan', 'simulate', 'propose', 'execute', 'record']) {
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ agentId: AGENT_ID, phase, durationMs: expect.any(Number) }),
        'tick.phase.continue',
      );
    }
  });

  it('logs tick.completed with attestation uid', async () => {
    await tick(makeConfig({ logger }));
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: AGENT_ID, attestation: 'uid-1' }),
      'tick.completed',
    );
  });

  it('logs lock-held skip', async () => {
    const { lock } = makeLock({ acquireReturns: false });
    await tick(makeConfig({ lock, logger }));
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: AGENT_ID }),
      'tick.skipped.lock_held',
    );
  });

  it('logs phase error with the failing error string', async () => {
    await tick(
      makeConfig({
        logger,
        simulate: vi.fn().mockResolvedValue(err(new Error('rpc 502'))),
      }),
    );
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ phase: 'simulate', error: expect.stringContaining('rpc 502') }),
      'tick.phase.error',
    );
  });
});
