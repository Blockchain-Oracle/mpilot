import { sanitizeError } from '@concierge/runtime';
import { ConciergeError } from '@concierge/sdk';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import pino from 'pino';
import { createDlq, DLQ_NAME } from './dlq.ts';
import { TICK_QUEUE_NAME } from './scheduler.ts';
import { registerSignalHandlers } from './shutdown.ts';
import { makeTickJob, type TickJobResult } from './tickJob.ts';

const DRAIN_TIMEOUT_MS = 60_000;
const TICK_SOFT_TIMEOUT_MS = 55_000;
const TICK_HARD_TIMEOUT_MS = 90_000;
const DEFAULT_BACKOFF_MS = 5_000;

function requireEnv(key: string): string {
  const v = process.env[key];
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(`[@concierge/worker] missing required env: ${key}`);
  }
  return v;
}

async function main(): Promise<void> {
  // Pino redact paths target shapes ioredis/BullMQ error objects bury:
  // err.cause.options.password, err.connectionOptions.password, top-level
  // password/authorization/url. sanitizeError remains the primary defense
  // for message strings; redact is the JSON-shape backstop.
  const logger = pino({
    level: process.env['LOG_LEVEL'] ?? 'info',
    redact: {
      paths: [
        'url',
        '*.url',
        '*.*.url',
        'password',
        '*.password',
        '*.*.password',
        'authorization',
        '*.authorization',
        '*.*.authorization',
      ],
      censor: '[REDACTED]',
    },
  });
  const redisUrl = requireEnv('REDIS_URL');
  const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

  const dlqQueue = new Queue(DLQ_NAME, { connection });
  const dlq = createDlq(dlqQueue);

  // runTick is required to be wired by the orchestrator (story-69). Until
  // then, throw a loud ConfigError on every job so a misdeployed worker
  // can never silently no-op every tick forever. Test seam: makeTickJob
  // accepts runTick directly so unit tests bypass this gate.
  const runTick = async (_agentId: string, _signal: AbortSignal): Promise<TickJobResult> => {
    throw new ConciergeError(
      'ConfigError',
      '[@concierge/worker] runtime tick not wired — story-69 must inject runTick.',
    );
  };

  const processor = makeTickJob({
    runTick,
    dlq,
    logger,
    hardTimeoutMs: TICK_HARD_TIMEOUT_MS,
  });

  const worker = new Worker(
    TICK_QUEUE_NAME,
    async (job) => processor(job, AbortSignal.timeout(TICK_SOFT_TIMEOUT_MS)),
    {
      connection,
      concurrency: 5,
      settings: { backoffStrategy: () => DEFAULT_BACKOFF_MS },
    },
  );

  worker.on('ready', () => logger.info('worker ready'));
  worker.on('failed', (job, err) => {
    logger.error(
      {
        jobId: job?.id ?? '<no-job>',
        err: sanitizeError(err).message,
        errorId: 'worker_job_failed',
      },
      'job failed (per-attempt; DLQ on final via tickJob)',
    );
  });

  registerSignalHandlers({
    worker,
    dlqQueue,
    connection,
    logger,
    drainTimeoutMs: DRAIN_TIMEOUT_MS,
    exit: (code) => process.exit(code),
  });
}

main().catch((err) => {
  // Top-level entry: route through pino with redact paths so even an
  // ioredis connection-error stack carrying credentials lands sanitized.
  const fallback = pino({
    level: 'error',
    redact: { paths: ['*.password', '*.url', '*.authorization'], censor: '[REDACTED]' },
  });
  fallback.error({ err: sanitizeError(err).message }, '[@concierge/worker] fatal');
  process.exit(1);
});
