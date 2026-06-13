import { ConciergeError } from '@concierge/sdk';
import type { Address, Hex, LocalAccount } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emergencyStop } from '../emergencyStop.ts';
import { revokeSessionKey } from '../revokeSessionKey.ts';
import type { ConciergeAccount } from '../types.ts';

const KERNEL_ADDR = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as Address;
const AGENT_ID = '00000000-0000-0000-0000-000000000001';
const SK_ADDR_A = '0x1111111111111111111111111111111111111111' as Address;
const SK_ADDR_B = '0x2222222222222222222222222222222222222222' as Address;
const TX_HASH = '0xabc' as Hex;

const OWNER_ACCOUNT = { address: KERNEL_ADDR } as LocalAccount;
const ACCT: ConciergeAccount = {
  smartAccountAddress: KERNEL_ADDR,
  kernelAccount: { address: KERNEL_ADDR } as ConciergeAccount['kernelAccount'],
  kernelClient: { chain: { id: 5003 } } as ConciergeAccount['kernelClient'],
};

interface Row {
  id: string;
  agentId: string;
  publicAddress: Address;
  revokedAt: Date | null;
}

function extractEqValue(where: unknown): string | undefined {
  // Recursively walk drizzle's SQL tree to find a literal string param.
  function walk(node: unknown): string | undefined {
    if (node === null || typeof node !== 'object') return undefined;
    // biome-ignore lint/suspicious/noExplicitAny: drizzle internals
    const n = node as any;
    if (typeof n.value === 'string') return n.value;
    if (Array.isArray(n.queryChunks)) {
      for (const c of n.queryChunks) {
        const found = walk(c);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  }
  return walk(where);
}

function makeDb(initial: Row[]) {
  const rows: Row[] = [...initial];
  // biome-ignore lint/suspicious/noExplicitAny: stub
  const db: any = {
    update: () => ({
      // biome-ignore lint/suspicious/noExplicitAny: drizzle
      set: (patch: any) => ({
        where: (w: unknown) => ({
          returning: async () => {
            const id = extractEqValue(w);
            const updated: Row[] = [];
            for (const r of rows) {
              if (r.id === id && r.revokedAt === null) {
                r.revokedAt = patch.revokedAt;
                updated.push(r);
              }
            }
            return updated.map((r) => ({
              id: r.id,
              revokedAt: r.revokedAt,
              publicAddress: r.publicAddress,
              agentId: r.agentId,
            }));
          },
        }),
      }),
    }),
    select: () => ({
      from: () => ({
        where: (w: unknown) => {
          // Could be by id (one literal) or by agentId+isNull (one literal).
          const value = extractEqValue(w);
          const matched =
            value === undefined
              ? rows.filter((r) => r.revokedAt === null)
              : rows.filter((r) => r.id === value || (r.agentId === value && r.revokedAt === null));
          const result = {
            limit: async (_n: number) =>
              matched.map((r) => ({
                id: r.id,
                revokedAt: r.revokedAt,
                publicAddress: r.publicAddress,
                agentId: r.agentId,
              })),
            // biome-ignore lint/suspicious/noThenProperty: stub mimics drizzle's awaitable query builder
            then: (resolve: (v: unknown) => unknown) => resolve(matched.map((r) => ({ id: r.id }))),
          };
          return result;
        },
      }),
    }),
  };
  return { db, rows };
}

describe('revokeSessionKey (story-54)', () => {
  let onChainRevoker: ReturnType<typeof vi.fn>;
  let events: { emit: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    onChainRevoker = vi.fn().mockResolvedValue({ txHash: TX_HASH });
    events = { emit: vi.fn().mockResolvedValue(undefined) };
  });

  it('happy path: UPDATE → on-chain → event emit', async () => {
    const { db, rows } = makeDb([
      { id: 'sk-1', agentId: AGENT_ID, publicAddress: SK_ADDR_A, revokedAt: null },
    ]);
    const result = await revokeSessionKey({
      db,
      sessionKeyId: 'sk-1',
      ownerAccount: OWNER_ACCOUNT,
      conciergeAccount: ACCT,
      onChainRevoker,
      events,
    });
    expect(result.onChainTxHash).toBe(TX_HASH);
    expect(rows[0]?.revokedAt).toBeInstanceOf(Date);
    expect(onChainRevoker).toHaveBeenCalledOnce();
    expect(events.emit).toHaveBeenCalledWith(
      'agent.revoked',
      expect.objectContaining({ sessionKeyId: 'sk-1', agentId: AGENT_ID }),
    );
  });

  it('idempotent: re-revoking an already-revoked key returns existing revokedAt without erroring', async () => {
    const past = new Date(Date.now() - 60_000);
    const { db } = makeDb([
      { id: 'sk-1', agentId: AGENT_ID, publicAddress: SK_ADDR_A, revokedAt: past },
    ]);
    const result = await revokeSessionKey({
      db,
      sessionKeyId: 'sk-1',
      ownerAccount: OWNER_ACCOUNT,
      conciergeAccount: ACCT,
      onChainRevoker,
    });
    expect(result.revokedAt.getTime()).toBe(past.getTime());
    // On-chain still attempted (caller may want to retry uninstall).
    expect(onChainRevoker).toHaveBeenCalledOnce();
  });

  it('throws ConfigError when session key not found', async () => {
    const { db } = makeDb([]);
    await expect(
      revokeSessionKey({
        db,
        sessionKeyId: 'sk-missing',
        ownerAccount: OWNER_ACCOUNT,
        conciergeAccount: ACCT,
        onChainRevoker,
      }),
    ).rejects.toSatisfy((e: unknown) => e instanceof ConciergeError && e.type === 'ConfigError');
  });

  it('retries on-chain step once before failing', async () => {
    onChainRevoker.mockRejectedValueOnce(new Error('rpc blip')).mockResolvedValueOnce({
      txHash: TX_HASH,
    });
    const { db } = makeDb([
      { id: 'sk-1', agentId: AGENT_ID, publicAddress: SK_ADDR_A, revokedAt: null },
    ]);
    const result = await revokeSessionKey({
      db,
      sessionKeyId: 'sk-1',
      ownerAccount: OWNER_ACCOUNT,
      conciergeAccount: ACCT,
      onChainRevoker,
      onChainRetryBackoffMs: 0,
    });
    expect(result.onChainTxHash).toBe(TX_HASH);
    expect(onChainRevoker).toHaveBeenCalledTimes(2);
  });

  it('throws RevocationPartialFailure when on-chain step exhausts retries (DB already revoked)', async () => {
    onChainRevoker.mockRejectedValue(new Error('persistent rpc failure'));
    const { db, rows } = makeDb([
      { id: 'sk-1', agentId: AGENT_ID, publicAddress: SK_ADDR_A, revokedAt: null },
    ]);
    await expect(
      revokeSessionKey({
        db,
        sessionKeyId: 'sk-1',
        ownerAccount: OWNER_ACCOUNT,
        conciergeAccount: ACCT,
        onChainRevoker,
        onChainRetryBackoffMs: 0,
      }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof ConciergeError &&
        e.type === 'RevocationPartialFailure' &&
        e.metadata?.['dbRevoked'] === true &&
        e.metadata?.['onChainRevoked'] === false,
    );
    expect(rows[0]?.revokedAt).toBeInstanceOf(Date);
  });

  it('event emit failure is non-fatal — revocation still succeeds', async () => {
    events.emit.mockRejectedValue(new Error('redis down'));
    const { db } = makeDb([
      { id: 'sk-1', agentId: AGENT_ID, publicAddress: SK_ADDR_A, revokedAt: null },
    ]);
    const result = await revokeSessionKey({
      db,
      sessionKeyId: 'sk-1',
      ownerAccount: OWNER_ACCOUNT,
      conciergeAccount: ACCT,
      onChainRevoker,
      events,
    });
    expect(result.onChainTxHash).toBe(TX_HASH);
  });
});

describe('emergencyStop (story-54)', () => {
  let onChainRevoker: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChainRevoker = vi.fn().mockResolvedValue({ txHash: TX_HASH });
  });

  it('returns { revokedCount: 0 } when no active keys (idempotent — does NOT throw)', async () => {
    const { db } = makeDb([
      { id: 'sk-1', agentId: AGENT_ID, publicAddress: SK_ADDR_A, revokedAt: new Date() },
    ]);
    const result = await emergencyStop({
      db,
      agentId: AGENT_ID,
      ownerAccount: OWNER_ACCOUNT,
      conciergeAccount: ACCT,
      onChainRevoker,
    });
    expect(result.revokedCount).toBe(0);
    expect(result.revoked).toHaveLength(0);
    expect(result.partialFailures).toHaveLength(0);
    expect(onChainRevoker).not.toHaveBeenCalled();
  });

  it('revokes all active keys for the agent', async () => {
    const { db } = makeDb([
      { id: 'sk-1', agentId: AGENT_ID, publicAddress: SK_ADDR_A, revokedAt: null },
      { id: 'sk-2', agentId: AGENT_ID, publicAddress: SK_ADDR_B, revokedAt: null },
    ]);
    const result = await emergencyStop({
      db,
      agentId: AGENT_ID,
      ownerAccount: OWNER_ACCOUNT,
      conciergeAccount: ACCT,
      onChainRevoker,
    });
    expect(result.revokedCount).toBe(2);
    expect(result.partialFailures).toHaveLength(0);
    expect(onChainRevoker).toHaveBeenCalledTimes(2);
  });

  it('isolates partial failures — surviving keys still revoke when one fails on-chain', async () => {
    onChainRevoker
      .mockResolvedValueOnce({ txHash: TX_HASH })
      .mockRejectedValueOnce(new Error('rpc'))
      .mockRejectedValueOnce(new Error('rpc'));
    const { db } = makeDb([
      { id: 'sk-1', agentId: AGENT_ID, publicAddress: SK_ADDR_A, revokedAt: null },
      { id: 'sk-2', agentId: AGENT_ID, publicAddress: SK_ADDR_B, revokedAt: null },
    ]);
    const result = await emergencyStop({
      db,
      agentId: AGENT_ID,
      ownerAccount: OWNER_ACCOUNT,
      conciergeAccount: ACCT,
      onChainRevoker,
    });
    expect(result.revokedCount).toBe(1);
    expect(result.partialFailures).toHaveLength(1);
    expect(result.partialFailures[0]?.sessionKeyId).toBe('sk-2');
  });
});
