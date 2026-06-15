import { sanitizeError } from '@mpilot/agent';

export interface ShutdownTarget {
  close(): Promise<void>;
}
export interface ShutdownConnection {
  quit(): Promise<unknown>;
}
export interface ShutdownLogger {
  info(meta: Record<string, unknown>, msg: string): void;
  error(meta: Record<string, unknown>, msg: string): void;
}

export interface GracefulShutdownArgs {
  readonly signal: NodeJS.Signals;
  readonly worker: ShutdownTarget;
  readonly dlqQueue: ShutdownTarget;
  readonly connection: ShutdownConnection;
  readonly logger: ShutdownLogger;
  readonly drainTimeoutMs: number;
  readonly exit: (code: number) => void;
}

/**
 * Pure-ish graceful drain. Closes worker → DLQ queue → Redis connection
 * in order; on ANY failure exits 1 (was silently exit 0 pre-round-1).
 * The drain-timeout force-exit timer is the caller's responsibility — see
 * registerSignalHandlers below.
 *
 * Returns a promise that resolves AFTER `exit` has been called so tests
 * can `await` the full drain. Production callers `void` the promise.
 */
export async function gracefulShutdown(args: GracefulShutdownArgs): Promise<void> {
  args.logger.info({ signal: args.signal }, 'shutdown received; draining');
  try {
    await args.worker.close();
    await args.dlqQueue.close();
    await args.connection.quit();
    args.exit(0);
  } catch (err) {
    args.logger.error({ err: sanitizeError(err).message }, 'shutdown drain failed');
    args.exit(1);
  }
}

/**
 * Register SIGTERM + SIGINT handlers. Each signal:
 *   - triggers gracefulShutdown
 *   - arms a `drainTimeoutMs` force-exit-1 timer (unref'd so a fast clean
 *     drain still exits via gracefulShutdown's exit(0))
 *   - guards against re-entrance: a second signal during drain logs warn
 *     and is ignored (do NOT double-close BullMQ/ioredis).
 */
export function registerSignalHandlers(
  args: Omit<GracefulShutdownArgs, 'signal'> & {
    readonly setTimeoutFn?: typeof setTimeout;
  },
): { isShuttingDown: () => boolean } {
  let shuttingDown = false;
  const setTimeoutFn = args.setTimeoutFn ?? setTimeout;
  const onSignal = (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      args.logger.info({ signal }, 'shutdown already in progress; ignoring duplicate signal');
      return;
    }
    shuttingDown = true;
    void gracefulShutdown({ ...args, signal });
    const timer = setTimeoutFn(() => args.exit(1), args.drainTimeoutMs);
    if (typeof (timer as { unref?: () => void }).unref === 'function') {
      (timer as { unref: () => void }).unref();
    }
  };
  process.on('SIGTERM', () => onSignal('SIGTERM'));
  process.on('SIGINT', () => onSignal('SIGINT'));
  return { isShuttingDown: () => shuttingDown };
}
