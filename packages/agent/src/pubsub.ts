import type { TickActionData, TickUpdateEnvelope } from '@concierge-mantle/shared';

/**
 * Minimal pub/sub interface the agent runtime depends on. Implemented by
 * `ioredis` in production (publisher + subscriber clients are distinct;
 * subscriber-mode connections cannot publish). Both Redis clients implement
 * this shape; we depend only on what we use.
 */
export interface Publisher {
  publish(channel: string, message: string): Promise<number | unknown>;
}

export interface Subscriber {
  subscribe(channel: string): Promise<unknown>;
  unsubscribe(channel: string): Promise<unknown>;
  on(event: 'message', listener: (channel: string, message: string) => void): unknown;
}

/**
 * Build the channel name. Both `userId` and `agentId` go into the name so a
 * leaked channel name still can't be used to read another user's stream — the
 * SSE proxy validates ownership server-side and only subscribes to the
 * channel for the verified `{userId, agentId}` pair.
 */
export function tickChannel(userId: string, agentId: string): string {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(userId)) {
    throw new Error('[pubsub] userId failed validation');
  }
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(agentId)) {
    throw new Error('[pubsub] agentId failed validation');
  }
  return `user:${userId}:ticks:${agentId}`;
}

/**
 * Publish a `TickActionData` envelope. Called by every phase function in the
 * worker as it progresses. The UI's SSE proxy forwards the envelope verbatim
 * to the dashboard; the dashboard narrows on `.data.phase` to pick the right
 * TickCard render variant.
 */
export async function publishTickUpdate(
  publisher: Publisher,
  args: {
    readonly userId: string;
    readonly agentId: string;
    readonly tickId: string;
    readonly data: TickActionData;
    readonly clock?: () => string; // injectable for tests
  },
): Promise<void> {
  const envelope: TickUpdateEnvelope = {
    userId: args.userId,
    agentId: args.agentId,
    tickId: args.tickId,
    data: args.data,
    at: (args.clock ?? (() => new Date().toISOString()))(),
  };
  await publisher.publish(tickChannel(args.userId, args.agentId), JSON.stringify(envelope));
}

/**
 * Subscribe to a tick channel and invoke `onUpdate` for each envelope. Returns
 * an `unsubscribe` function the caller (typically the SSE proxy) must call
 * when the client disconnects, otherwise the subscriber-mode Redis client
 * leaks the subscription.
 */
export async function subscribeToTickUpdates(
  subscriber: Subscriber,
  args: {
    readonly userId: string;
    readonly agentId: string;
    readonly onUpdate: (envelope: TickUpdateEnvelope) => void;
    readonly onParseError?: (raw: string, err: unknown) => void;
  },
): Promise<() => Promise<void>> {
  const channel = tickChannel(args.userId, args.agentId);
  const handler = (incoming: string, message: string): void => {
    if (incoming !== channel) return;
    try {
      const parsed = JSON.parse(message) as TickUpdateEnvelope;
      args.onUpdate(parsed);
    } catch (err) {
      args.onParseError?.(message, err);
    }
  };
  subscriber.on('message', handler);
  await subscriber.subscribe(channel);
  return async () => {
    await subscriber.unsubscribe(channel);
  };
}
