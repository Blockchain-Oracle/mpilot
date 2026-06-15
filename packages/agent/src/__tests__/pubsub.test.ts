import { describe, expect, it, vi } from 'vitest';
import {
  type Publisher,
  publishTickUpdate,
  type Subscriber,
  subscribeToTickUpdates,
  tickChannel,
} from '../pubsub.ts';

describe('tickChannel', () => {
  it('builds the per-user-per-agent channel', () => {
    expect(tickChannel('user-1', 'agent-42')).toBe('user:user-1:ticks:agent-42');
  });
  it('rejects userId that fails regex (prevents channel-name injection)', () => {
    expect(() => tickChannel('evil:user', 'agent-1')).toThrow(/userId/);
  });
  it('rejects agentId that fails regex', () => {
    expect(() => tickChannel('user-1', 'agent\nwith\nnewlines')).toThrow(/agentId/);
  });
});

describe('publishTickUpdate', () => {
  it('serializes the envelope with stable clock', async () => {
    const captured: { channel: string; message: string }[] = [];
    const pub: Publisher = {
      publish: vi.fn(async (channel, message) => {
        captured.push({ channel, message: String(message) });
      }),
    };
    await publishTickUpdate(pub, {
      userId: 'u',
      agentId: 'a',
      tickId: 't',
      data: { phase: 'plan', reasoning: 'hello' },
      clock: () => '2026-06-15T00:00:00.000Z',
    });
    expect(captured).toHaveLength(1);
    expect(captured[0]!.channel).toBe('user:u:ticks:a');
    expect(JSON.parse(captured[0]!.message)).toEqual({
      userId: 'u',
      agentId: 'a',
      tickId: 't',
      data: { phase: 'plan', reasoning: 'hello' },
      at: '2026-06-15T00:00:00.000Z',
    });
  });
});

describe('subscribeToTickUpdates', () => {
  it('parses incoming envelopes and routes to onUpdate', async () => {
    let handler: ((channel: string, message: string) => void) | null = null;
    const sub: Subscriber = {
      subscribe: vi.fn(async () => undefined),
      unsubscribe: vi.fn(async () => undefined),
      on: vi.fn((event, listener) => {
        if (event === 'message') handler = listener;
      }),
    };
    const updates: unknown[] = [];
    const unsub = await subscribeToTickUpdates(sub, {
      userId: 'u',
      agentId: 'a',
      onUpdate: (env) => updates.push(env),
    });
    handler!(
      'user:u:ticks:a',
      JSON.stringify({
        userId: 'u',
        agentId: 'a',
        tickId: 't1',
        data: { phase: 'execute', userOpHash: '0x' + 'aa'.repeat(32) },
        at: '2026-06-15T00:00:00.000Z',
      }),
    );
    expect(updates).toHaveLength(1);
    await unsub();
    expect(sub.unsubscribe).toHaveBeenCalledWith('user:u:ticks:a');
  });

  it('ignores messages on a different channel (defense in depth)', async () => {
    let handler: ((channel: string, message: string) => void) | null = null;
    const sub: Subscriber = {
      subscribe: vi.fn(async () => undefined),
      unsubscribe: vi.fn(async () => undefined),
      on: vi.fn((event, listener) => {
        if (event === 'message') handler = listener;
      }),
    };
    const updates: unknown[] = [];
    await subscribeToTickUpdates(sub, {
      userId: 'u',
      agentId: 'a',
      onUpdate: (env) => updates.push(env),
    });
    handler!('user:OTHER:ticks:a', JSON.stringify({ phase: 'plan' }));
    expect(updates).toHaveLength(0);
  });

  it('calls onParseError on structurally-valid JSON that fails the envelope schema', async () => {
    let handler: ((channel: string, message: string) => void) | null = null;
    const sub: Subscriber = {
      subscribe: vi.fn(async () => undefined),
      unsubscribe: vi.fn(async () => undefined),
      on: vi.fn((event, listener) => {
        if (event === 'message') handler = listener;
      }),
    };
    const errors: { raw: string; err: unknown }[] = [];
    const updates: unknown[] = [];
    await subscribeToTickUpdates(sub, {
      userId: 'u',
      agentId: 'a',
      onUpdate: (env) => updates.push(env),
      onParseError: (raw, err) => errors.push({ raw, err }),
    });
    // Parses as JSON but missing required fields — must NOT reach onUpdate.
    handler!('user:u:ticks:a', JSON.stringify({ unrelated: true }));
    expect(updates).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });

  it('rejects envelopes carrying malformed hex (defense vs. publisher compromise)', async () => {
    let handler: ((channel: string, message: string) => void) | null = null;
    const sub: Subscriber = {
      subscribe: vi.fn(async () => undefined),
      unsubscribe: vi.fn(async () => undefined),
      on: vi.fn((event, listener) => {
        if (event === 'message') handler = listener;
      }),
    };
    const updates: unknown[] = [];
    await subscribeToTickUpdates(sub, {
      userId: 'u',
      agentId: 'a',
      onUpdate: (env) => updates.push(env),
    });
    handler!(
      'user:u:ticks:a',
      JSON.stringify({
        userId: 'u',
        agentId: 'a',
        tickId: 't1',
        data: { phase: 'execute', userOpHash: 'javascript:alert(1)' },
        at: '2026-06-15T00:00:00.000Z',
      }),
    );
    expect(updates).toHaveLength(0);
  });

  it('calls onParseError instead of throwing on malformed JSON', async () => {
    let handler: ((channel: string, message: string) => void) | null = null;
    const sub: Subscriber = {
      subscribe: vi.fn(async () => undefined),
      unsubscribe: vi.fn(async () => undefined),
      on: vi.fn((event, listener) => {
        if (event === 'message') handler = listener;
      }),
    };
    const errors: { raw: string; err: unknown }[] = [];
    await subscribeToTickUpdates(sub, {
      userId: 'u',
      agentId: 'a',
      onUpdate: () => {},
      onParseError: (raw, err) => errors.push({ raw, err }),
    });
    handler!('user:u:ticks:a', '{ not valid json');
    expect(errors).toHaveLength(1);
  });
});
