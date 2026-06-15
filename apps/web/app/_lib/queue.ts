/**
 * Server-only BullMQ producer for the mPilot tick queue. The web app
 * enqueues the FIRST tick when `/api/agents` activates an agent; the worker
 * (apps/worker) is the consumer.
 *
 * Connection: REDIS_URL must point at the same Redis instance the worker
 * subscribes to. Production: Upstash; dev: `brew services start redis`.
 */
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const QUEUE_NAME = 'concierge-ticks';

let cached: { queue: Queue; connection: IORedis } | null = null;

export function getTicksQueue(): Queue {
  if (cached) return cached.queue;
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error('[apps/web/queue] REDIS_URL is required.');
  }
  const connection = new IORedis(url, { maxRetriesPerRequest: null });
  const queue = new Queue(QUEUE_NAME, { connection });
  cached = { queue, connection };
  return queue;
}

/** Enqueue a one-off "run-now" tick for an agent. */
export async function enqueueFirstTick(agentId: string): Promise<void> {
  const q = getTicksQueue();
  await q.add(
    'tick',
    { agentId },
    {
      // Match the worker's existing job-id strategy so duplicate enqueues
      // dedupe naturally.
      jobId: `agent:${agentId}:first-tick`,
      removeOnComplete: 100,
      removeOnFail: 200,
    },
  );
}
