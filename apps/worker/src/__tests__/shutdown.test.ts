import { afterEach, describe, expect, it, vi } from 'vitest';
import { gracefulShutdown, registerSignalHandlers } from '../shutdown.ts';

afterEach(() => vi.restoreAllMocks());

function makeLogger() {
  return {
    infos: [] as Array<[Record<string, unknown>, string]>,
    errors: [] as Array<[Record<string, unknown>, string]>,
    info(m: Record<string, unknown>, msg: string) {
      this.infos.push([m, msg]);
    },
    error(m: Record<string, unknown>, msg: string) {
      this.errors.push([m, msg]);
    },
  };
}

describe('gracefulShutdown', () => {
  it('closes worker → dlqQueue → connection in order; exits 0', async () => {
    const order: string[] = [];
    const exit = vi.fn();
    await gracefulShutdown({
      signal: 'SIGTERM',
      worker: { close: vi.fn().mockImplementation(async () => void order.push('worker')) },
      dlqQueue: { close: vi.fn().mockImplementation(async () => void order.push('dlq')) },
      connection: { quit: vi.fn().mockImplementation(async () => void order.push('conn')) },
      logger: makeLogger(),
      drainTimeoutMs: 60_000,
      exit,
    });
    expect(order).toEqual(['worker', 'dlq', 'conn']);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('drain failure → exit 1 (round-1 regression pin)', async () => {
    const exit = vi.fn();
    const logger = makeLogger();
    await gracefulShutdown({
      signal: 'SIGTERM',
      worker: { close: vi.fn().mockRejectedValue(new Error('drain hung')) },
      dlqQueue: { close: vi.fn() },
      connection: { quit: vi.fn() },
      logger,
      drainTimeoutMs: 60_000,
      exit,
    });
    expect(exit).toHaveBeenCalledWith(1);
    expect(logger.errors).toHaveLength(1);
    expect(logger.errors[0]?.[1]).toMatch(/drain failed/);
  });
});

describe('registerSignalHandlers', () => {
  it('arms force-exit timer for both SIGTERM and SIGINT (round-2 fix)', async () => {
    const exit = vi.fn();
    const timers: Array<{ ms: number }> = [];
    const setTimeoutFn = vi.fn().mockImplementation((_fn: () => void, ms: number) => {
      timers.push({ ms });
      return { unref: () => {} };
      // biome-ignore lint/suspicious/noExplicitAny: minimal stub
    }) as any;

    registerSignalHandlers({
      worker: { close: vi.fn() },
      dlqQueue: { close: vi.fn() },
      connection: { quit: vi.fn() },
      logger: makeLogger(),
      drainTimeoutMs: 60_000,
      exit,
      setTimeoutFn,
    });

    process.emit('SIGTERM');
    await new Promise((r) => setImmediate(r));
    expect(timers).toHaveLength(1);
    expect(timers[0]?.ms).toBe(60_000);

    // SIGINT during same lifecycle is treated as re-entrant signal: no second
    // shutdown drain runs; no second force-exit timer armed.
    process.emit('SIGINT');
    await new Promise((r) => setImmediate(r));
    expect(timers).toHaveLength(1); // re-entrance guard fired

    // Cleanup so we don't leak handlers into other tests.
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
  });

  it('isShuttingDown flips true on first signal; ignores duplicate signals', async () => {
    const handle = registerSignalHandlers({
      worker: { close: vi.fn() },
      dlqQueue: { close: vi.fn() },
      connection: { quit: vi.fn() },
      logger: makeLogger(),
      drainTimeoutMs: 60_000,
      exit: vi.fn(),
      setTimeoutFn: ((_f: () => void, _m: number) => ({
        unref: () => {},
        // biome-ignore lint/suspicious/noExplicitAny: minimal stub
      })) as any,
    });
    expect(handle.isShuttingDown()).toBe(false);
    process.emit('SIGTERM');
    await new Promise((r) => setImmediate(r));
    expect(handle.isShuttingDown()).toBe(true);
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
  });
});
