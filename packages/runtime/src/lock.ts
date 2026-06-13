import type Redis from 'ioredis';
import type { TickLock } from './types.ts';

/**
 * Redis NX lock. The `SET key value NX EX ttl` primitive is atomic — only
 * one caller wins, the rest see `OK` of null. The value carries a per-process
 * nonce so a stale release from a different process can be ignored (avoids
 * the classic "release someone else's lock" race when the original holder's
 * TTL expired mid-tick).
 *
 * NOTE: this implementation uses Lua-evaluated release so check+delete is
 * atomic. A bare DEL would clear a lock another worker just re-acquired.
 */
const RELEASE_SCRIPT = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
else
  return 0
end
`.trim();

export function createLock(redis: Redis): TickLock {
  return {
    async acquire(key: string, ttlMs: number): Promise<boolean> {
      const nonce = generateNonce();
      const ok = await redis.set(key, nonce, 'PX', ttlMs, 'NX');
      if (ok === 'OK') {
        nonceFor.set(key, nonce);
        return true;
      }
      return false;
    },
    async release(key: string): Promise<void> {
      const nonce = nonceFor.get(key);
      if (nonce === undefined) return; // we never held it; nothing to do
      nonceFor.delete(key);
      // biome-ignore lint/suspicious/noExplicitAny: ioredis eval typing
      await (redis as any).eval(RELEASE_SCRIPT, 1, key, nonce);
    },
  };
}

const nonceFor = new Map<string, string>();

function generateNonce(): string {
  // 16 bytes hex — enough collision resistance for a lock-id space.
  // crypto.randomUUID() is fine here; we don't need cryptographic strength
  // beyond distinctness per process / per call.
  return `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
