import { describe, expect, it, vi } from 'vitest';
import { createLock } from '../lock.ts';

interface FakeRedis {
  set: ReturnType<typeof vi.fn>;
  eval: ReturnType<typeof vi.fn>;
}

function makeRedis(opts: { setReturns?: string | null } = {}): FakeRedis {
  // Use `in opts` so an explicit `null` is preserved (?? on null returns default).
  const setReturn = 'setReturns' in opts ? opts.setReturns : 'OK';
  return {
    set: vi.fn().mockResolvedValue(setReturn),
    eval: vi.fn().mockResolvedValue(1),
  };
}

describe('createLock — Redis NX semantics', () => {
  it('acquire calls SET ... PX ttl NX and returns true on OK', async () => {
    const redis = makeRedis({ setReturns: 'OK' });
    // biome-ignore lint/suspicious/noExplicitAny: fake redis
    const lock = createLock(redis as any);
    const got = await lock.acquire('lock:agent:a', 30_000);
    expect(got).toBe(true);
    expect(redis.set).toHaveBeenCalledWith('lock:agent:a', expect.any(String), 'PX', 30_000, 'NX');
  });

  it('acquire returns false when SET returns null (lock held by another holder)', async () => {
    const redis = makeRedis({ setReturns: null });
    // biome-ignore lint/suspicious/noExplicitAny: fake redis
    const lock = createLock(redis as any);
    const got = await lock.acquire('lock:agent:a', 30_000);
    expect(got).toBe(false);
  });

  it('release runs the atomic check+DEL Lua script with the per-call nonce', async () => {
    const redis = makeRedis();
    // biome-ignore lint/suspicious/noExplicitAny: fake redis
    const lock = createLock(redis as any);
    await lock.acquire('lock:agent:a', 30_000);
    await lock.release('lock:agent:a');
    expect(redis.eval).toHaveBeenCalledTimes(1);
    const [, keyCount, key] = redis.eval.mock.calls[0] ?? [];
    expect(keyCount).toBe(1);
    expect(key).toBe('lock:agent:a');
  });

  it('release is a no-op when this process never acquired the lock', async () => {
    const redis = makeRedis();
    // biome-ignore lint/suspicious/noExplicitAny: fake redis
    const lock = createLock(redis as any);
    await lock.release('lock:agent:never-acquired');
    expect(redis.eval).not.toHaveBeenCalled();
  });

  it('acquire generates a distinct nonce per call (no static leak)', async () => {
    const redis = makeRedis({ setReturns: 'OK' });
    // biome-ignore lint/suspicious/noExplicitAny: fake redis
    const lock = createLock(redis as any);
    await lock.acquire('lock:a', 1000);
    await lock.acquire('lock:b', 1000);
    const nonceA = redis.set.mock.calls[0]?.[1];
    const nonceB = redis.set.mock.calls[1]?.[1];
    expect(nonceA).not.toBe(nonceB);
  });
});
