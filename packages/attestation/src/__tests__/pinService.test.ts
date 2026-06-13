import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPinataPinService, createWeb3StoragePinService } from '../pinService.ts';

afterEach(() => vi.restoreAllMocks());

const FAKE_CID = 'bafybeiabc';
const CANONICAL = '{"v":1,"schema":"s","payload":{}}';

function ok(json: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => json,
    // biome-ignore lint/suspicious/noExplicitAny: minimal Response stub
  } as any;
}

function fail(status: number, statusText: string): Response {
  return {
    ok: false,
    status,
    statusText,
    json: async () => ({}),
    // biome-ignore lint/suspicious/noExplicitAny: minimal Response stub
  } as any;
}

describe('createPinataPinService', () => {
  it('200 + IpfsHash → returns CID + pinId; passes JWT', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(ok({ IpfsHash: FAKE_CID }));
    const svc = createPinataPinService({ jwt: 'jwt-1', fetch: fetchSpy });
    const out = await svc.pin({
      canonical: CANONICAL,
      displayName: 'x',
      signal: new AbortController().signal,
    });
    expect(out.cid).toBe(FAKE_CID);
    expect(out.pinId).toBe(`pinata:${FAKE_CID}`);
    const call = fetchSpy.mock.calls[0];
    if (call === undefined) throw new Error('expected fetch invoked');
    expect((call[1].headers as Record<string, string>)['authorization']).toBe('Bearer jwt-1');
    expect(call[0]).toContain('/pinning/pinJSONToIPFS');
  });

  it('non-2xx → throws with status + statusText', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(fail(503, 'Service Unavailable'));
    const svc = createPinataPinService({ jwt: 'jwt-1', fetch: fetchSpy });
    await expect(
      svc.pin({ canonical: CANONICAL, displayName: 'x', signal: new AbortController().signal }),
    ).rejects.toThrow(/503.*Service Unavailable/);
  });

  it('200 + malformed CID → throws (defense-in-depth at the boundary)', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(ok({ IpfsHash: 'not-a-cid' }));
    const svc = createPinataPinService({ jwt: 'jwt-1', fetch: fetchSpy });
    await expect(
      svc.pin({ canonical: CANONICAL, displayName: 'x', signal: new AbortController().signal }),
    ).rejects.toThrow(/malformed CID/);
  });

  it('truncates displayName to 128 chars (Pinata metadata cap)', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(ok({ IpfsHash: FAKE_CID }));
    const svc = createPinataPinService({ jwt: 'jwt-1', fetch: fetchSpy });
    await svc.pin({
      canonical: CANONICAL,
      displayName: 'x'.repeat(500),
      signal: new AbortController().signal,
    });
    const init = fetchSpy.mock.calls[0]?.[1];
    if (init === undefined) throw new Error('expected fetch invoked with init');
    const body = JSON.parse(init.body as string);
    expect(body.pinataMetadata.name.length).toBe(128);
  });
});

describe('createWeb3StoragePinService', () => {
  it('200 + cid → returns CID; passes Bearer token', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(ok({ cid: FAKE_CID }));
    const svc = createWeb3StoragePinService({ token: 'tok-1', fetch: fetchSpy });
    const out = await svc.pin({
      canonical: CANONICAL,
      displayName: 'x',
      signal: new AbortController().signal,
    });
    expect(out.cid).toBe(FAKE_CID);
    expect(out.pinId).toBe(`web3.storage:${FAKE_CID}`);
    const init = fetchSpy.mock.calls[0]?.[1];
    if (init === undefined) throw new Error('expected fetch invoked with init');
    expect((init.headers as Record<string, string>)['authorization']).toBe('Bearer tok-1');
  });

  it('500 → throws', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(fail(500, 'Internal'));
    const svc = createWeb3StoragePinService({ token: 'tok-1', fetch: fetchSpy });
    await expect(
      svc.pin({ canonical: CANONICAL, displayName: 'x', signal: new AbortController().signal }),
    ).rejects.toThrow(/500/);
  });

  it('malformed CID response → throws', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(ok({ cid: 'nope' }));
    const svc = createWeb3StoragePinService({ token: 'tok-1', fetch: fetchSpy });
    await expect(
      svc.pin({ canonical: CANONICAL, displayName: 'x', signal: new AbortController().signal }),
    ).rejects.toThrow(/malformed CID/);
  });
});
