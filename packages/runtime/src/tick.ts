import type { TickConfig, TickLogger, TickResult } from './types.ts';

const DEFAULT_LOCK_TTL_MS = 60_000;

/**
 * Tick orchestrator. Sequences the 6-phase agent run under a Redis NX lock so
 * two workers can't double-execute the same agent. Phases are injected via
 * `config` so this module is unit-testable without provider/LLM imports —
 * stories 63-67 supply the concrete phase functions.
 *
 * Flow:
 *   1. acquire Redis NX lock; if held → return `{ kind: 'skipped' }`
 *   2. load agent state
 *   3. plan → if stop/error, halt cleanly
 *   4. simulate(plan) → if stop/error, halt cleanly
 *   5. propose(sim) → if stop (requiresApproval) / error, halt cleanly
 *   6. execute(proposal) → if stop/error, halt cleanly
 *   7. record(exec) → returns the attestation
 *   8. release lock (finally — even on throw)
 *
 * Errors at any phase NEVER silently continue — the chain breaks, the lock
 * releases, and the error surfaces with the failing phase tagged.
 */
export async function tick(config: TickConfig): Promise<TickResult> {
  const ttlMs = config.lockTtlMs ?? DEFAULT_LOCK_TTL_MS;
  const lockKey = `lock:agent:${config.agentId}`;
  const log = config.logger ?? NOOP_LOGGER;
  const tickId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const acquired = await config.lock.acquire(lockKey, ttlMs);
  if (!acquired) {
    log.info({ agentId: config.agentId, tickId, lockKey }, 'tick.skipped.lock_held');
    return { kind: 'skipped', reason: 'already_running' };
  }

  try {
    const state = await config.loadState(config.agentId);

    const planOut = await runPhase('plan', () => config.plan(state), log, config.agentId, tickId);
    if (planOut.kind !== 'continue') return phaseToResult('plan', planOut);

    const simOut = await runPhase(
      'simulate',
      () => config.simulate(state, planOut.data),
      log,
      config.agentId,
      tickId,
    );
    if (simOut.kind !== 'continue') return phaseToResult('simulate', simOut);

    const propOut = await runPhase(
      'propose',
      () => config.propose(state, simOut.data),
      log,
      config.agentId,
      tickId,
    );
    if (propOut.kind !== 'continue') return phaseToResult('propose', propOut);

    const execOut = await runPhase(
      'execute',
      () => config.execute(state, propOut.data),
      log,
      config.agentId,
      tickId,
    );
    if (execOut.kind !== 'continue') return phaseToResult('execute', execOut);

    const recOut = await runPhase(
      'record',
      () => config.record(state, execOut.data),
      log,
      config.agentId,
      tickId,
    );
    if (recOut.kind !== 'continue') return phaseToResult('record', recOut);

    log.info(
      { agentId: config.agentId, tickId, attestation: recOut.data.attestationUid },
      'tick.completed',
    );
    return { kind: 'completed', attestation: recOut.data };
  } finally {
    // Release the lock even on throw. We swallow release errors because the
    // lock has a TTL fallback — a stuck release is non-fatal for the next
    // tick (it'll expire). We DO log so operators see lock-release failures.
    try {
      await config.lock.release(lockKey);
    } catch (releaseErr) {
      log.warn(
        { agentId: config.agentId, tickId, lockKey, error: String(releaseErr) },
        'tick.lock_release_failed',
      );
    }
  }
}

async function runPhase<T>(
  phase: 'plan' | 'simulate' | 'propose' | 'execute' | 'record',
  fn: () => Promise<
    | { kind: 'continue'; data: T }
    | { kind: 'stop'; reason: string }
    | { kind: 'error'; error: unknown }
  >,
  log: TickLogger,
  agentId: string,
  tickId: string,
): Promise<
  | { kind: 'continue'; data: T }
  | { kind: 'stop'; reason: string }
  | { kind: 'error'; error: unknown }
> {
  const startedAt = Date.now();
  try {
    const out = await fn();
    const durationMs = Date.now() - startedAt;
    if (out.kind === 'continue') {
      log.info({ agentId, tickId, phase, durationMs }, 'tick.phase.continue');
    } else if (out.kind === 'stop') {
      log.info({ agentId, tickId, phase, durationMs, reason: out.reason }, 'tick.phase.stop');
    } else {
      log.error(
        { agentId, tickId, phase, durationMs, error: String(out.error) },
        'tick.phase.error',
      );
    }
    return out;
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    // Unexpected throw — wrap as a typed error outcome rather than propagate
    // (so the lock-release `finally` still runs and the caller gets a clean
    // result rather than an uncaught reject they have to translate).
    log.error({ agentId, tickId, phase, durationMs, error: String(err) }, 'tick.phase.thrown');
    return { kind: 'error', error: err };
  }
}

function phaseToResult(
  phase: 'plan' | 'simulate' | 'propose' | 'execute' | 'record',
  outcome:
    | { kind: 'stop'; reason: string }
    | { kind: 'error'; error: unknown }
    | { kind: 'continue'; data: unknown },
): TickResult {
  if (outcome.kind === 'stop') return { kind: 'stopped', phase, reason: outcome.reason };
  if (outcome.kind === 'error') return { kind: 'errored', phase, error: outcome.error };
  // Unreachable — `continue` is handled by the caller's flow.
  throw new Error(`[@concierge/runtime] phaseToResult: unexpected 'continue' for phase '${phase}'`);
}

const NOOP_LOGGER: TickLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};
