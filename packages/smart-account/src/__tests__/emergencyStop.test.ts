import { ConciergeError } from '@concierge/sdk';
import type { Address, Hex } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emergencyStop } from '../emergencyStop.ts';
import { makeDb } from './_revokeStub.ts';

const AGENT_ID = '11111111-1111-4111-8111-111111111111';
const SK_1 = '33333333-3333-4333-8333-333333333333';
const SK_2 = '44444444-4444-4444-8444-444444444444';
const SK_ADDR_A = '0x1111111111111111111111111111111111111111' as Address;
const SK_ADDR_B = '0x2222222222222222222222222222222222222222' as Address;
const TX_HASH = '0xabc' as Hex;

describe('emergencyStop (story-54)', () => {
  let onChainRevoker: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChainRevoker = vi.fn().mockResolvedValue({ txHash: TX_HASH });
  });

  it('no active keys: returns empty result, does NOT throw', async () => {
    const { db } = makeDb([
      { id: SK_1, agentId: AGENT_ID, publicAddress: SK_ADDR_A, revokedAt: new Date() },
    ]);
    const result = await emergencyStop({
      db,
      agentId: AGENT_ID,
      onChainRevoker,
    });
    expect(result.revoked).toHaveLength(0);
    expect(result.partialFailures).toHaveLength(0);
    expect(result.unexpectedFailures).toHaveLength(0);
    expect(onChainRevoker).not.toHaveBeenCalled();
  });

  it('revokes all active keys for the agent', async () => {
    const { db } = makeDb([
      { id: SK_1, agentId: AGENT_ID, publicAddress: SK_ADDR_A, revokedAt: null },
      { id: SK_2, agentId: AGENT_ID, publicAddress: SK_ADDR_B, revokedAt: null },
    ]);
    const result = await emergencyStop({
      db,
      agentId: AGENT_ID,
      onChainRevoker,
    });
    expect(result.revoked).toHaveLength(2);
    expect(result.partialFailures).toHaveLength(0);
    expect(result.unexpectedFailures).toHaveLength(0);
    expect(onChainRevoker).toHaveBeenCalledTimes(2);
  });

  it('isolates partial failures into partialFailures bucket — surviving keys still revoke', async () => {
    onChainRevoker.mockImplementation(
      async ({ sessionKeyAddress }: { sessionKeyAddress: Address }) => {
        if (sessionKeyAddress === SK_ADDR_B) throw new Error('rpc');
        return { txHash: TX_HASH };
      },
    );
    const { db } = makeDb([
      { id: SK_1, agentId: AGENT_ID, publicAddress: SK_ADDR_A, revokedAt: null },
      { id: SK_2, agentId: AGENT_ID, publicAddress: SK_ADDR_B, revokedAt: null },
    ]);
    const result = await emergencyStop({
      db,
      agentId: AGENT_ID,
      onChainRevoker,
    });
    expect(result.revoked).toHaveLength(1);
    expect(result.partialFailures).toHaveLength(1);
    expect(result.partialFailures[0]?.sessionKeyId).toBe(SK_2);
    expect(result.partialFailures[0]?.cause.type).toBe('RevocationPartialFailure');
    expect(result.unexpectedFailures).toHaveLength(0);
  });

  it('isolates UNEXPECTED failures (e.g. transient DB error) without aborting the fleet', async () => {
    const handle = makeDb([
      { id: SK_1, agentId: AGENT_ID, publicAddress: SK_ADDR_A, revokedAt: null },
      { id: SK_2, agentId: AGENT_ID, publicAddress: SK_ADDR_B, revokedAt: null },
    ]);
    let calls = 0;
    const realUpdate = handle.db.update;
    handle.db.update = (...args: unknown[]) => {
      calls++;
      if (calls === 2) {
        return {
          // biome-ignore lint/suspicious/noExplicitAny: stub
          set: (_p: any) => ({
            where: (_w: unknown) => ({
              returning: async () => {
                throw new Error('connection terminated');
              },
            }),
          }),
        };
      }
      // biome-ignore lint/suspicious/noExplicitAny: stub
      return (realUpdate as any)(...args);
    };
    const result = await emergencyStop({
      db: handle.db,
      agentId: AGENT_ID,
      onChainRevoker,
    });
    expect(result.revoked).toHaveLength(1);
    expect(result.unexpectedFailures).toHaveLength(1);
    expect(result.partialFailures).toHaveLength(0);
    expect((result.unexpectedFailures[0]?.cause as Error)?.message).toMatch(
      /connection terminated/,
    );
  });

  it('throws ConfigError on invalid agentId UUID (boundary input validation)', async () => {
    const { db } = makeDb([]);
    await expect(
      emergencyStop({
        db,
        agentId: 'not-a-uuid',
        onChainRevoker,
      }),
    ).rejects.toSatisfy((e: unknown) => e instanceof ConciergeError && e.type === 'ConfigError');
  });
});
