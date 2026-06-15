import { agents, llmKeys, notificationPrefs } from '@concierge-mantle/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocked at the module boundary so the test exercises the route's insert
// shape without a real Postgres / Privy / Redis / Resend.
const verifyPrivyAuth = vi.fn();
const getDb = vi.fn();
const encryptLlmKey = vi.fn((_pt: string, _parts: unknown) => Buffer.from('CIPHERTEXT-BYTES'));
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

interface Capture {
  agents: Record<string, unknown>[];
  llmKeys: Record<string, unknown>[];
  notificationPrefs: Record<string, unknown>[];
}

/**
 * Fake drizzle tx that tags each `insert(table).values(v)` by the TABLE OBJECT
 * identity (not call order) so the capture can't silently grab the wrong row if
 * inserts are reordered.
 */
function makeFakeDb(capture: Capture) {
  const tableKey = new Map<unknown, keyof Capture>([
    [agents, 'agents'],
    [llmKeys, 'llmKeys'],
    [notificationPrefs, 'notificationPrefs'],
  ]);
  const tx = {
    insert: (table: unknown) => {
      const key = tableKey.get(table);
      return {
        values: (v: Record<string, unknown>) => {
          if (key) capture[key].push(v);
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

function emptyCapture(): Capture {
  return { agents: [], llmKeys: [], notificationPrefs: [] };
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
    const capture = emptyCapture();
    getDb.mockResolvedValue(makeFakeDb(capture));

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({
      agentId: 'agent-uuid-1',
      firstTickQueued: true,
      welcomeEmailSent: false,
    });

    expect(capture.agents).toHaveLength(1);
    const v = capture.agents[0] ?? {};
    // Ownership is bound to the verified Privy userId, never a client value.
    expect(v.userId).toBe('did:privy:user-1');
    expect(v.smartAccountAddr).toBe(VALID_BODY.smartAccountAddress);
    expect(v.ownerEoa).toBe(VALID_BODY.walletAddress);
    expect(v.chain).toBe(VALID_BODY.chain);
    expect(v.goalJson).toEqual({ goal: VALID_BODY.goal, caps: null });
    // erc8004AgentId is the decimal STRING token id — no bigint crosses the boundary.
    expect(v.erc8004AgentId).toBe('42');
    expect(typeof v.erc8004AgentId).toBe('string');
    expect(v.activatedAt).toBeInstanceOf(Date);
  });

  it('encrypts each LLM key and stores ONLY ciphertext (never plaintext)', async () => {
    const capture = emptyCapture();
    getDb.mockResolvedValue(makeFakeDb(capture));

    await POST(makeRequest(VALID_BODY));

    // encryptLlmKey is called with the plaintext + the per-row AAD parts.
    expect(encryptLlmKey).toHaveBeenCalledWith('sk-test-not-a-real-key-0123456789', {
      userId: 'did:privy:user-1',
      agentId: 'agent-uuid-1',
      provider: 'openai',
    });
    // The llm_keys row carries the ciphertext buffer, NOT the plaintext.
    expect(capture.llmKeys).toHaveLength(1);
    const row = capture.llmKeys[0] ?? {};
    expect(row.provider).toBe('openai');
    expect(Buffer.isBuffer(row.ciphertext)).toBe(true);
    expect(String(row.ciphertext)).not.toContain('sk-test-not-a-real-key');
  });

  it('enqueues the first tick for the created agent', async () => {
    getDb.mockResolvedValue(makeFakeDb(emptyCapture()));
    await POST(makeRequest(VALID_BODY));
    expect(enqueueFirstTick).toHaveBeenCalledWith('agent-uuid-1');
  });

  it('reports firstTickQueued:false (still 201) when the enqueue fails — dormant agent', async () => {
    getDb.mockResolvedValue(makeFakeDb(emptyCapture()));
    enqueueFirstTick.mockRejectedValueOnce(new Error('redis down'));
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({ firstTickQueued: false });
  });

  it('accepts a single-provider llmKeys map (partialRecord, not exhaustive)', async () => {
    getDb.mockResolvedValue(makeFakeDb(emptyCapture()));
    const res = await POST(
      makeRequest({ ...VALID_BODY, llmKeys: { anthropic: 'sk-ant-0123456789abcdef' } }),
    );
    expect(res.status).toBe(201);
  });

  it('rejects an empty llmKeys map with 400 (refine ≥1)', async () => {
    getDb.mockResolvedValue(makeFakeDb(emptyCapture()));
    const res = await POST(makeRequest({ ...VALID_BODY, llmKeys: {} }));
    expect(res.status).toBe(400);
  });

  it('rejects a non-numeric agentTokenId with 400 (not a thrown 500)', async () => {
    getDb.mockResolvedValue(makeFakeDb(emptyCapture()));
    const res = await POST(makeRequest({ ...VALID_BODY, agentTokenId: 'not-a-number' }));
    expect(res.status).toBe(400);
  });

  it('returns 401 when auth is not ok', async () => {
    verifyPrivyAuth.mockResolvedValue({ ok: false, reason: 'invalid' });
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it('returns 500 (with no DB leak) when the database connection fails', async () => {
    getDb.mockRejectedValueOnce(new Error('ECONNREFUSED 127.0.0.1:5432'));
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: 'create failed', code: 'internal_error' });
  });
});
