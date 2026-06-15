import { describe, expect, it, vi } from 'vitest';
import { createConciergeClient } from '../createConciergeClient.ts';

const BASE = 'https://concierge.example';
const TOKEN = 'test-jwt';
// Real CIDv0 (Qm + 44 base58 chars) so attestationIpfsUrl's shape check passes.
const CIDV0 = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function makeClient(fetchImpl: typeof fetch) {
  return createConciergeClient({
    baseUrl: `${BASE}/`, // trailing slash exercised on purpose
    getAccessToken: async () => TOKEN,
    fetch: fetchImpl,
  });
}

/**
 * Fake EventSource that records the latest instance so the test can drive
 * `onmessage` directly — the client assigns `es.onmessage = fn`.
 */
class FakeEventSource {
  static last: FakeEventSource | null = null;
  url: string;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  closed = false;
  constructor(url: string) {
    this.url = url;
    FakeEventSource.last = this;
  }
  emit(data: string): void {
    this.onmessage?.({ data } as MessageEvent);
  }
  close(): void {
    this.closed = true;
  }
}

describe('createConciergeClient', () => {
  it('attaches the bearer token and strips trailing slash from baseUrl', async () => {
    const seen: { url: string; auth: string | null }[] = [];
    const fetchImpl = vi.fn(async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      seen.push({ url: String(input), auth: headers.get('authorization') });
      return jsonResponse({ agent: null });
    }) as unknown as typeof fetch;

    const client = makeClient(fetchImpl);
    expect(await client.getCurrentAgent()).toBeNull();
    expect(seen[0]?.url).toBe(`${BASE}/api/agents/me`);
    expect(seen[0]?.auth).toBe(`Bearer ${TOKEN}`);
  });

  it('getCurrentAgent returns the agent when present', async () => {
    const agentRow = {
      id: 'agent-1',
      smartAccountAddress: null,
      agentTokenId: '42',
      ownerEoa: '0xabc',
      goal: 'earn yield',
      status: 'active',
      chain: 'mantle-sepolia',
      createdAt: '2026-06-15T00:00:00Z',
    };
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ agent: agentRow }),
    ) as unknown as typeof fetch;
    expect(await makeClient(fetchImpl).getCurrentAgent()).toEqual(agentRow);
  });

  it('getAgent maps a 404 to null', async () => {
    const fetchImpl = vi.fn(
      async () => new Response(null, { status: 404 }),
    ) as unknown as typeof fetch;
    expect(await makeClient(fetchImpl).getAgent('missing')).toBeNull();
  });

  it('throws on non-404 error responses', async () => {
    const fetchImpl = vi.fn(
      async () => new Response('boom', { status: 500 }),
    ) as unknown as typeof fetch;
    await expect(makeClient(fetchImpl).getReputation('agent-1')).rejects.toThrow(/HTTP 500/);
  });

  it('subscribeTicks validates envelopes: accepts valid, drops malformed', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({})) as unknown as typeof fetch;
    const client = createConciergeClient({
      baseUrl: BASE,
      getAccessToken: async () => TOKEN,
      fetch: fetchImpl,
      EventSourceCtor: FakeEventSource as unknown as typeof EventSource,
    });

    const received: unknown[] = [];
    const sub = await client.subscribeTicks('agent-1', (env) => received.push(env));
    const es = FakeEventSource.last;
    expect(es).not.toBeNull();
    expect(es?.url).toContain(`token=${TOKEN}`);

    // Valid envelope per tickUpdateEnvelopeSchema → delivered.
    const valid = {
      userId: 'user-1',
      agentId: 'agent-1',
      tickId: 'tick-1',
      data: { phase: 'plan', reasoning: 'thinking' },
      at: '2026-06-15T00:00:00Z',
    };
    es?.emit(JSON.stringify(valid));
    // Malformed (missing required fields) → dropped silently.
    es?.emit(JSON.stringify({ garbage: true }));
    // Unparseable JSON → dropped silently.
    es?.emit('{not-json');

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ userId: 'user-1', tickId: 'tick-1' });

    sub.close();
    expect(es?.closed).toBe(true);
  });

  it('builds chain-aware URLs', () => {
    const fetchImpl = vi.fn(async () => jsonResponse({})) as unknown as typeof fetch;
    const client = makeClient(fetchImpl);
    const tx = `0x${'a'.repeat(64)}` as `0x${string}`;
    expect(client.txUrl(tx, 5000)).toBe(`https://mantlescan.xyz/tx/${tx}`);
    expect(client.txUrl(tx, 5003)).toBe(`https://sepolia.mantlescan.xyz/tx/${tx}`);
    expect(client.agentProfileUrl('42')).toBe(`${BASE}/agent/42`);
    expect(client.ipfsUrl(CIDV0)).toBe(`https://ipfs.io/ipfs/${CIDV0}`);
  });
});
