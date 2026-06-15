import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocked at the module boundary so the test exercises the route's insert
// shape without a real Postgres / Privy / Redis / Resend.
const verifyPrivyAuth = vi.fn();
const getDb = vi.fn();
const encryptLlmKey = vi.fn((_pt: string, _parts: unknown) => Buffer.from('ciphertext'));
const enqueueFirstTick = vi.fn(async (_id: string) => undefined);
const sendWelcomeEmail = vi.fn(async (_args: unknown) => undefined);

vi.mock('../../_lib/privyServer', () => ({ verifyPrivyAuth: (r: Request) => verifyPrivyAuth(r) }));
vi.mock('../../_lib/db', () => ({ getDb: () => getDb() }));
vi.mock('../../_lib/kms', () => ({
  encryptLlmKey: (pt: string, parts: unknown) => encryptLlmKey(pt, parts),
}));
vi.mock('../../_lib/queue', () => ({ enqueueFirstTick: (id: string) => enqueueFirstTick(id) }));
vi.mock('../../_lib/resend', () => ({ sendWelcomeEmail: (a: unknown) => sendWelcomeEmail(a) }));

import { POST } from './route';

/** Captures the values passed to the FIRST `insert(...).values(...)` call (the agents row). */
function makeFakeDb(capture: { agentsValues?: Record<string, unknown> }) {
  let insertCount = 0;
  const tx = {
    insert: () => {
      const isAgents = insertCount === 0;
      insertCount += 1;
      return {
        values: (v: Record<string, unknown>) => {
          if (isAgents) capture.agentsValues = v;
          return {
            returning: async () => [{ id: 'agent-uuid-1' }],
            onConflictDoUpdate: async () => undefined,
            onConflictDoNothing: async () => undefined,
          };
        },
      };
    },
  };
  return {
    db: {
      transaction: async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx),
    },
  };
}

const VALID_BODY = {
  walletAddress: '0x1111111111111111111111111111111111111111',
  smartAccountAddress: '0x2222222222222222222222222222222222222222',
  agentTokenId: '42',
  chain: 'mantle-sepolia',
  goal: 'Earn safe yield on stablecoins',
  llmKeys: { openai: 'sk-test-not-a-real-key-0123456789' },
};

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/agents', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/agents — insert shape', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyPrivyAuth.mockResolvedValue({ ok: true, user: { userId: 'did:privy:user-1' } });
  });

  it('persists the agent row with the verified userId + required columns', async () => {
    const capture: { agentsValues?: Record<string, unknown> } = {};
    getDb.mockResolvedValue(makeFakeDb(capture));

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({ agentId: 'agent-uuid-1' });

    const v = capture.agentsValues ?? {};
    // Ownership is bound to the verified Privy userId, never a client value.
    expect(v.userId).toBe('did:privy:user-1');
    expect(v.smartAccountAddr).toBe(VALID_BODY.smartAccountAddress);
    // erc8004AgentId is the decimal STRING token id — no bigint crosses the boundary.
    expect(v.erc8004AgentId).toBe('42');
    expect(typeof v.erc8004AgentId).toBe('string');
    expect(v.activatedAt).toBeInstanceOf(Date);
  });

  it('rejects a non-numeric agentTokenId with 400 (not a thrown 500)', async () => {
    getDb.mockResolvedValue(makeFakeDb({}));
    const res = await POST(makeRequest({ ...VALID_BODY, agentTokenId: 'not-a-number' }));
    expect(res.status).toBe(400);
  });

  it('returns 401 when auth is not ok', async () => {
    verifyPrivyAuth.mockResolvedValue({ ok: false, reason: 'invalid' });
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(401);
  });
});
