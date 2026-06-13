/**
 * DI'd pin-service interface. Production wires Pinata + web3.storage
 * adapters from this file; tests stub the interface with in-memory fakes.
 *
 * The interface is intentionally narrow — pin(canonical) → (cid, pinId).
 * Production adapters carry the JWT/token; the test seam is the interface,
 * not the network mock. Per CLAUDE.md non-negotiable #1 (no hot-path mocks).
 */
export type PinServiceName = 'pinata' | 'web3.storage';

export interface PinResult {
  readonly service: PinServiceName;
  readonly cid: string;
  readonly pinId: string;
}

export interface PinService {
  readonly name: PinServiceName;
  /** Returns CID + service-specific pin id. Throws on failure (network, auth, 5xx). */
  pin(args: {
    readonly canonical: string;
    readonly displayName: string;
    readonly signal: AbortSignal;
  }): Promise<{ readonly cid: string; readonly pinId: string }>;
}

const PINATA_DEFAULT_HOST = 'https://api.pinata.cloud';
const WEB3_STORAGE_DEFAULT_HOST = 'https://api.web3.storage';

/**
 * Pinata JSON-pinning adapter. Auth via JWT; uses the `pinJSONToIPFS`
 * endpoint which canonicalize-the-content + dedup-by-content-hash, so
 * re-pinning the same envelope returns the same CID (no orphan rows).
 */
export function createPinataPinService(config: {
  readonly jwt: string;
  readonly host?: string;
  readonly fetch?: typeof fetch;
}): PinService {
  const host = config.host ?? PINATA_DEFAULT_HOST;
  const fetchImpl = config.fetch ?? globalThis.fetch;
  return {
    name: 'pinata',
    async pin({ canonical, displayName, signal }) {
      const res = await fetchImpl(`${host}/pinning/pinJSONToIPFS`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${config.jwt}`,
        },
        body: JSON.stringify({
          pinataContent: JSON.parse(canonical),
          pinataMetadata: { name: displayName.slice(0, 128) },
        }),
        signal,
      });
      if (!res.ok) {
        throw new Error(`pinata: ${res.status} ${res.statusText}`);
      }
      const body = (await res.json()) as { IpfsHash?: unknown };
      const cid = typeof body.IpfsHash === 'string' ? body.IpfsHash : '';
      if (!cid.startsWith('bafy') && !cid.startsWith('Qm')) {
        throw new Error(`pinata: returned malformed CID '${cid.slice(0, 64)}'`);
      }
      return { cid, pinId: `pinata:${cid}` };
    },
  };
}

/**
 * web3.storage adapter. Token auth via Bearer header; `upload/blob` returns
 * the CID. Fallback semantics: this service only fires when Pinata is down
 * (handled by the orchestrator in pin.ts) OR when redundancy is requested.
 */
export function createWeb3StoragePinService(config: {
  readonly token: string;
  readonly host?: string;
  readonly fetch?: typeof fetch;
}): PinService {
  const host = config.host ?? WEB3_STORAGE_DEFAULT_HOST;
  const fetchImpl = config.fetch ?? globalThis.fetch;
  return {
    name: 'web3.storage',
    async pin({ canonical, signal }) {
      const res = await fetchImpl(`${host}/upload`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${config.token}`,
        },
        body: canonical,
        signal,
      });
      if (!res.ok) {
        throw new Error(`web3.storage: ${res.status} ${res.statusText}`);
      }
      const body = (await res.json()) as { cid?: unknown };
      const cid = typeof body.cid === 'string' ? body.cid : '';
      if (!cid.startsWith('bafy') && !cid.startsWith('Qm')) {
        throw new Error(`web3.storage: returned malformed CID '${cid.slice(0, 64)}'`);
      }
      return { cid, pinId: `web3.storage:${cid}` };
    },
  };
}
