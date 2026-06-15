/**
 * `createConciergeClient` — the canonical SDK client a consumer constructs
 * once, then uses to read agent state, subscribe to live tick updates, and
 * drive chat steering. Wraps the apps/web HTTP surface so the same client
 * works against local dev, prod, and a self-hosted Concierge backend.
 *
 * Auth is threaded via a `getAccessToken` closure — the SDK never holds
 * credentials; the consumer (typically a Privy session) is responsible for
 * minting fresh JWTs. Every request that hits `/api/agents/*` or
 * `/api/sse/*` carries the token in the `Authorization` header.
 *
 * The client is browser-safe (no Node-only imports). SSE goes through the
 * native `EventSource` constructor — Edge and Node 18+ both ship it.
 */

import { type TickUpdateEnvelope, tickUpdateEnvelopeSchema } from '@concierge-mantle/shared';
import {
  agentShareUrl,
  attestationIpfsUrl,
  attestationMantleScanUrl,
  mantleScanAddressUrl,
  mantleScanTxUrl,
  type SupportedChainId,
} from './urls.ts';

export interface AgentState {
  readonly id: string;
  readonly smartAccountAddress: string | null;
  readonly agentTokenId: string | null;
  readonly ownerEoa: string;
  readonly goal: string | null;
  readonly status: 'onboarding' | 'active' | 'paused' | 'stopped';
  readonly chain: 'mantle-mainnet' | 'mantle-sepolia';
  readonly createdAt: string;
}

export interface Attestation {
  readonly feedbackHash: string;
  readonly cid: string;
  readonly attestedAt: string;
  readonly schema: string;
}

export interface Reputation {
  readonly totalAttestations: number;
  readonly schemaCounts: Readonly<Record<string, number>>;
  readonly latestAttestation: {
    readonly schema: string;
    readonly feedbackIndex: string;
    readonly value: string;
  } | null;
}

export interface SubscribeTicksOpts {
  /** Optional resume cursor — if set, the SSE proxy backfills tick updates
   * with `tickId > since` before streaming new ones. Useful after a tab
   * reconnect / browser sleep. */
  readonly since?: string;
}

export interface ConciergeClientConfig {
  /** Origin of the Concierge backend (typically `https://concierge.xyz`). */
  readonly baseUrl: string;
  /** Pulls a fresh Privy JWT. The SDK never persists or caches it. */
  readonly getAccessToken: () => Promise<string | null>;
  /** Override `fetch` for tests or non-browser environments. */
  readonly fetch?: typeof fetch;
  /** Override `EventSource` for tests. */
  readonly EventSourceCtor?: typeof EventSource;
}

export interface ConciergeClient {
  /** GET /api/agents/me — returns the authenticated user's agent (or null). */
  getCurrentAgent(): Promise<AgentState | null>;
  /** GET /api/agents/[id] — returns a single agent by id. */
  getAgent(agentId: string): Promise<AgentState | null>;
  /** GET /api/agents/[id]/reputation — proxies the MCP `get_reputation` tool. */
  getReputation(agentId: string): Promise<Reputation>;
  /** GET /api/agents/[id]/attestations/[feedbackHash] — single attestation. */
  getAttestation(agentId: string, feedbackHash: string): Promise<Attestation | null>;
  /** Live tick stream. Returns an `EventSource`; caller closes it. */
  subscribeTicks(
    agentId: string,
    onUpdate: (envelope: TickUpdateEnvelope) => void,
    opts?: SubscribeTicksOpts,
  ): Promise<{ close: () => void }>;
  /** POST /api/chat — streams Vercel AI SDK UIMessage stream response. */
  chat(args: {
    agentId: string;
    messages: ReadonlyArray<unknown>;
    abortSignal?: AbortSignal;
  }): Promise<Response>;
  /** Convenience: build a tx URL from a hash + chain. */
  txUrl(hash: `0x${string}`, chainId: SupportedChainId): string;
  /** Convenience: build an address URL. */
  addressUrl(addr: `0x${string}`, chainId: SupportedChainId): string;
  /** Convenience: build the public agent profile URL. */
  agentProfileUrl(agentId: bigint | string): string;
  /** Convenience: build an IPFS URL for an attestation CID. */
  ipfsUrl(cid: string): string;
  /** Convenience: build the MantleScan link for an attestation feedback hash. */
  attestationUrl(feedbackHash: `0x${string}`, chainId: SupportedChainId): string;
}

export function createConciergeClient(config: ConciergeClientConfig): ConciergeClient {
  const origin = config.baseUrl.replace(/\/+$/, '');
  const fetchImpl = config.fetch ?? fetch;
  const EventSourceImpl = config.EventSourceCtor ?? globalThis.EventSource;

  async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const token = await config.getAccessToken();
    const headers = new Headers(init.headers);
    if (token) headers.set('authorization', `Bearer ${token}`);
    return fetchImpl(`${origin}${path}`, { ...init, headers });
  }

  async function getJson<T>(path: string): Promise<T | null> {
    const res = await authedFetch(path);
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`[ConciergeClient] ${path} → HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  }

  return {
    async getCurrentAgent() {
      const body = await getJson<{ agent: AgentState | null }>('/api/agents/me');
      return body?.agent ?? null;
    },
    async getAgent(agentId) {
      return await getJson<AgentState>(`/api/agents/${encodeURIComponent(agentId)}`);
    },
    async getReputation(agentId) {
      const body = await getJson<Reputation>(
        `/api/agents/${encodeURIComponent(agentId)}/reputation`,
      );
      if (!body) throw new Error(`[ConciergeClient] reputation not found for ${agentId}`);
      return body;
    },
    async getAttestation(agentId, feedbackHash) {
      return await getJson<Attestation>(
        `/api/agents/${encodeURIComponent(agentId)}/attestations/${encodeURIComponent(feedbackHash)}`,
      );
    },
    async subscribeTicks(agentId, onUpdate, opts) {
      if (typeof EventSourceImpl !== 'function') {
        throw new Error(
          '[ConciergeClient] EventSource is not available. Pass `EventSourceCtor` in config for SSR / non-browser environments.',
        );
      }
      // EventSource can't carry an Authorization header by spec. We mint a
      // short-lived access token query param the server validates the same
      // way it validates Bearer tokens. Future: switch to fetch-streams
      // when widely supported.
      const token = await config.getAccessToken();
      if (!token) throw new Error('[ConciergeClient] no access token for SSE subscribe');
      const url = new URL(
        `${origin}/api/sse/agents/${encodeURIComponent(agentId)}`,
      );
      url.searchParams.set('token', token);
      if (opts?.since) url.searchParams.set('since', opts.since);
      const es = new EventSourceImpl(url.toString());
      es.onmessage = (ev: MessageEvent) => {
        // Validate every envelope at the client boundary. The SSE proxy
        // already validates server-side, but defense-in-depth: a malformed
        // payload (proxy bug, Redis tampering) is dropped rather than handed
        // to the UI as if well-formed.
        let raw: unknown;
        try {
          raw = JSON.parse(ev.data);
        } catch {
          return;
        }
        const result = tickUpdateEnvelopeSchema.safeParse(raw);
        if (result.success) onUpdate(result.data as TickUpdateEnvelope);
      };
      return { close: () => es.close() };
    },
    async chat({ agentId, messages, abortSignal }) {
      const token = await config.getAccessToken();
      const headers = new Headers({ 'content-type': 'application/json' });
      if (token) headers.set('authorization', `Bearer ${token}`);
      const init: RequestInit = {
        method: 'POST',
        headers,
        body: JSON.stringify({ agentId, messages }),
      };
      if (abortSignal) init.signal = abortSignal;
      return fetchImpl(`${origin}/api/chat`, init);
    },
    txUrl(hash, chainId) {
      return mantleScanTxUrl(hash, chainId);
    },
    addressUrl(addr, chainId) {
      return mantleScanAddressUrl(addr, chainId);
    },
    agentProfileUrl(agentId) {
      return agentShareUrl(agentId, origin);
    },
    ipfsUrl(cid) {
      return attestationIpfsUrl(cid);
    },
    attestationUrl(feedbackHash, chainId) {
      return attestationMantleScanUrl(feedbackHash, chainId);
    },
  };
}
