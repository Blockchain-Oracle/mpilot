import type { TickActionData, TickUpdateEnvelope } from '@concierge-mantle/shared';
import { z } from 'zod';

// Inlined runtime validator for `TickUpdateEnvelope`. The same Zod schema
// exists in `@concierge-mantle/shared/uiTypes` but tsup's DTS pipeline can't
// reliably re-export Zod schemas across package boundaries (emits `undefined`
// in the .d.ts). Keep this local copy in sync with the shared definition —
// adding a phase / proposal kind there requires updating here too.
const hex32 = z.string().regex(/^0x[0-9a-fA-F]{64}$/);
const addr = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const id = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
const proposalFieldsLocal = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('aave-supply'),
    asset: addr,
    amount: z.string(),
    expectedApr: z.string(),
  }),
  z.object({
    kind: z.literal('aave-borrow'),
    asset: addr,
    amount: z.string(),
    resultingHealthFactor: z.string(),
  }),
  z.object({
    kind: z.literal('dex-swap'),
    inputToken: addr,
    outputToken: addr,
    inputAmount: z.string(),
    minOutputAmount: z.string(),
    slippageBps: z.number().int().min(0).max(10_000),
  }),
  z.object({ kind: z.literal('ethena-stake'), amount: z.string() }),
  z.object({ kind: z.literal('ondo-mint'), amount: z.string() }),
  z.object({ kind: z.literal('meth-stake'), amount: z.string() }),
  z.object({
    kind: z.literal('lifi-bridge'),
    fromChainId: z.number().int().positive(),
    toChainId: z.number().int().positive(),
    token: addr,
    amount: z.string(),
  }),
  z.object({ kind: z.literal('erc8004-attest'), subject: z.string(), payload: z.unknown() }),
]);
const tickActionDataLocal = z.discriminatedUnion('phase', [
  z.object({ phase: z.literal('plan'), reasoning: z.string().max(16_384) }),
  z.object({
    phase: z.literal('simulate'),
    simulation: z.object({
      expectedUsdDelta: z.string().max(64),
      healthFactorAfter: z.string().max(64).optional(),
      riskFlags: z
        .array(
          z.object({ severity: z.enum(['info', 'warn', 'danger']), message: z.string().max(2048) }),
        )
        .max(32),
      rawJson: z.unknown(),
    }),
  }),
  z.object({
    phase: z.literal('propose'),
    proposalId: z.string().max(128),
    fields: proposalFieldsLocal,
  }),
  z.object({
    phase: z.literal('execute'),
    userOpHash: hex32,
    txHash: hex32.optional(),
    revertReason: z.string().max(2048).optional(),
  }),
  z.object({
    phase: z.literal('record'),
    feedbackHash: hex32,
    cid: z
      .string()
      .regex(/^[A-Za-z0-9]+$/)
      .max(128),
    attestedAt: z.string().max(64),
  }),
  z.object({
    phase: z.literal('decide'),
    outcome: z.enum(['auto-approved', 'awaiting-user', 'rejected']),
    approvedBy: addr.optional(),
    approvalDeadline: z.string().max(64).optional(),
  }),
]);
const envelopeLocal = z.object({
  userId: id,
  agentId: id,
  tickId: z.string().max(128),
  data: tickActionDataLocal,
  at: z.string().max(64),
});

/**
 * Minimal pub/sub interface the agent runtime depends on. Implemented by
 * `ioredis` in production (publisher + subscriber clients are distinct;
 * subscriber-mode connections cannot publish). Both Redis clients implement
 * this shape; we depend only on what we use.
 */
export interface Publisher {
  publish(channel: string, message: string): Promise<unknown>;
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
    // Redis is shared infra; a compromised publisher could emit anything. Run
    // every payload through the Zod schema before routing to the UI. The
    // earlier `JSON.parse(...) as TickUpdateEnvelope` cast was a silent-failure
    // trap — malformed payloads would surface as undefined-narrowed switches
    // in the dashboard rather than throw.
    let raw: unknown;
    try {
      raw = JSON.parse(message);
    } catch (err) {
      args.onParseError?.(message, err);
      return;
    }
    const parsed = envelopeLocal.safeParse(raw);
    if (!parsed.success) {
      args.onParseError?.(message, parsed.error);
      return;
    }
    args.onUpdate(parsed.data as TickUpdateEnvelope);
  };
  subscriber.on('message', handler);
  await subscriber.subscribe(channel);
  return async () => {
    await subscriber.unsubscribe(channel);
  };
}
