import type {
  GetOrFetchDeps,
  GetOrFetchResult,
  LoadAgentHistoryDeps,
  PayloadError,
  RawFeedbackEntry,
} from '@concierge-mantle/attestation';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it, vi } from 'vitest';
import { createConciergeMcpServer } from '../server.ts';
import { type CreateReadToolsDeps, createReadTools } from '../tools/read/index.ts';

/** Hex-only fixture builders — designer schemas reject non-hex chars in
 *  address / hash fields, so suffixes must be in [0-9a-f]. */
const HASH = (suffix: string): `0x${string}` =>
  `0x${'0'.repeat(64 - suffix.length)}${suffix}` as `0x${string}`;
const ADDR = (suffix: string): `0x${string}` =>
  `0x${'0'.repeat(40 - suffix.length)}${suffix}` as `0x${string}`;

function entry(i: number): RawFeedbackEntry {
  const hex = i.toString(16);
  return {
    schema: 'concierge.aave.v3.supply.v1',
    feedbackHash: HASH(`fb${hex}`),
    feedbackURI: `ipfs://bafy-${i}`,
    feedbackIndex: BigInt(i),
    clientAddress: ADDR(`a${hex}`),
    blockNumber: BigInt(10_000_000 + i),
    txHash: HASH(`bb${hex}`),
    revoked: false,
  };
}

function envelopeFixture(uri: string): GetOrFetchResult {
  return {
    status: 'ok',
    payload: { schema: 'concierge.aave.v3.supply.v1', data: { from: uri } },
    fromCache: false,
  } as GetOrFetchResult;
}

function makeDeps(entries: ReadonlyArray<RawFeedbackEntry>): CreateReadToolsDeps {
  const ipfsErrors = new Map<string, PayloadError>();
  return {
    identityRegistry: {
      // Deterministic hex owner per agentId for test assertions.
      getOwner: async (id) => ADDR(`abcd${id.toString(16)}`),
    },
    readFeedback: async () =>
      ({ entries }) satisfies Awaited<ReturnType<LoadAgentHistoryDeps['readFeedback']>>,
    ipfs: {
      // biome-ignore lint/suspicious/noExplicitAny: test fixture matches the prod shape loosely
      getOrFetch: async (input: { uri: string }) => {
        const err = ipfsErrors.get(input.uri);
        if (err)
          return { status: 'error', payloadError: err, fromCache: false } as GetOrFetchResult;
        return envelopeFixture(input.uri);
      },
    } as unknown as GetOrFetchDeps,
  };
}

async function connect(deps: CreateReadToolsDeps) {
  const tools = createReadTools(deps);
  const server = createConciergeMcpServer({
    tools,
    onEmptyToolset: () => {
      /* unused; we always have tools */
    },
  });
  const client = new Client({ name: 'test-client', version: '0.0.0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  return { client };
}

describe('createReadTools', () => {
  it('exposes exactly the three read tools in deterministic order', async () => {
    const { client } = await connect(makeDeps([]));
    const list = await client.listTools();
    expect(list.tools.map((t) => t.name)).toEqual([
      'get_agent_state',
      'get_reputation',
      'get_attestation',
    ]);
    for (const t of list.tools) {
      expect(t.inputSchema).toBeDefined();
      expect(t.outputSchema).toBeDefined();
    }
  });

  it('get_agent_state returns owner + attestationCount + last 5 (most recent first)', async () => {
    const fixtures = Array.from({ length: 7 }, (_, i) => entry(i + 1));
    const deps = makeDeps(fixtures);
    const { client } = await connect(deps);
    const res = await client.callTool({
      name: 'get_agent_state',
      arguments: { agentId: '42' },
    });
    expect(res.isError).toBeFalsy();
    const structured = res.structuredContent as {
      owner: string;
      attestationCount: number;
      recentAttestations: Array<{ feedbackHash: string }>;
    };
    expect(structured.owner).toBe(ADDR(`abcd${(42).toString(16)}`));
    expect(structured.attestationCount).toBe(7);
    // The SDK orders most-recent first; tool returns the limit-trimmed view.
    expect(structured.recentAttestations).toHaveLength(5);
  });

  it('get_reputation paginates: limit=2 + offset=2 returns the THIRD page entry', async () => {
    const fixtures = Array.from({ length: 5 }, (_, i) => entry(i + 1));
    const { client } = await connect(makeDeps(fixtures));
    const res = await client.callTool({
      name: 'get_reputation',
      arguments: { agentId: '1', limit: 2, offset: 2 },
    });
    const structured = res.structuredContent as {
      entries: Array<{ feedbackHash: string }>;
      limit: number;
      offset: number;
      totalCount: number;
    };
    expect(structured.entries).toHaveLength(2);
    expect(structured.limit).toBe(2);
    expect(structured.offset).toBe(2);
    expect(structured.totalCount).toBe(5);
  });

  it('get_reputation uses default limit=50 + offset=0 when omitted', async () => {
    const fixtures = Array.from({ length: 3 }, (_, i) => entry(i + 1));
    const { client } = await connect(makeDeps(fixtures));
    const res = await client.callTool({
      name: 'get_reputation',
      arguments: { agentId: '1' },
    });
    const structured = res.structuredContent as { limit: number; offset: number };
    expect(structured.limit).toBe(50);
    expect(structured.offset).toBe(0);
  });

  it('get_reputation rejects limit > 200 via strict Zod', async () => {
    const { client } = await connect(makeDeps([]));
    const res = await client.callTool({
      name: 'get_reputation',
      arguments: { agentId: '1', limit: 9999 },
    });
    expect(res.isError).toBe(true);
    const content = res.content as Array<{ text: string }>;
    expect(content[0]?.text).toMatch(/Invalid arguments|Too big|too big|less than/i);
  });

  it('get_attestation returns the matching entry by feedbackHash', async () => {
    const target = entry(3);
    const { client } = await connect(makeDeps([entry(1), entry(2), target, entry(4)]));
    const res = await client.callTool({
      name: 'get_attestation',
      arguments: { agentId: '1', feedbackHash: target.feedbackHash },
    });
    expect(res.isError).toBeFalsy();
    const structured = res.structuredContent as { entry: { feedbackHash: string } };
    expect(structured.entry.feedbackHash).toBe(target.feedbackHash);
  });

  it('get_attestation surfaces a typed isError when feedbackHash unknown (NOT 500)', async () => {
    const onToolError = vi.fn();
    const tools = createReadTools(makeDeps([entry(1)]));
    const server = createConciergeMcpServer({ tools, onToolError });
    const client = new Client({ name: 'test-client', version: '0.0.0' });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(a), client.connect(b)]);

    const res = await client.callTool({
      name: 'get_attestation',
      arguments: { agentId: '1', feedbackHash: HASH('deadbeef') },
    });
    expect(res.isError).toBe(true);
    const content = res.content as Array<{ text: string }>;
    expect(content[0]?.text).toContain('get_attestation');
    expect(content[0]?.text).toContain('not found');
    // Round-1: structured fail wired through observability
    expect(onToolError).toHaveBeenCalledTimes(1);
  });

  it('extra input fields are tolerated and stripped (MCP SDK shape-only validation)', async () => {
    // NOTE: the original BDD required `.strict()` rejection. MCP SDK's
    // `registerTool({ inputSchema: ZodObject.shape })` only propagates the
    // shape — strictness is NOT serialized into the on-wire JSON Schema,
    // so unknown keys silently pass through. Documented as accepted MCP-SDK
    // behavior; not a Concierge tool bug. If strict rejection becomes a
    // hard requirement we'd need a wrapper that re-applies the full
    // ZodObject before invoke.
    const { client } = await connect(makeDeps([]));
    const res = await client.callTool({
      name: 'get_agent_state',
      // @ts-expect-error — extra is dropped by MCP SDK
      arguments: { agentId: '1', extra: 'nope' },
    });
    expect(res.isError).toBeFalsy();
  });

  it('rejects missing required field (clear MCP error, not internal 500)', async () => {
    const { client } = await connect(makeDeps([]));
    const res = await client.callTool({
      name: 'get_agent_state',
      // @ts-expect-error — intentional bad input
      arguments: {},
    });
    expect(res.isError).toBe(true);
    const content = res.content as Array<{ text: string }>;
    expect(content[0]?.text).toMatch(/Invalid arguments|Required|required|expected/i);
  });

  // ── Round-1 hardening per PR #143 review fleet ─────────────────────────

  it('forwards IPFS payload-error entries with status=error + payloadError (no silent drop)', async () => {
    // The test fixtures use non-real CIDs (bafy-N), which fail `isValidCid`
    // inside `getOrFetchPayload` BEFORE the gateway is hit — every entry
    // lands as `status: 'error'` with `payloadError: 'NOT_FOUND'`. That's
    // exactly the error-arm of the discriminated union we need to exercise:
    // ensure the entry survives toEntry → outputSchema validation without
    // the payloadError silently being dropped.
    const { client } = await connect(makeDeps([entry(1), entry(2)]));
    const res = await client.callTool({
      name: 'get_reputation',
      arguments: { agentId: '1', limit: 50, offset: 0 },
    });
    expect(res.isError).toBeFalsy();
    const structured = res.structuredContent as {
      entries: Array<{ status: string; payload?: unknown; payloadError?: string }>;
    };
    expect(structured.entries.length).toBeGreaterThan(0);
    for (const e of structured.entries) {
      expect(e.status).toBe('error');
      // Discriminated union 'error' arm: payloadError is REQUIRED; payload
      // MUST NOT leak. Round-1 regression bar.
      expect(e.payloadError).toBeDefined();
      expect(e.payload).toBeUndefined();
    }
  });

  it('surfaces identityRegistry.getOwner rejection as isError (not unhandled 500)', async () => {
    const onToolError = vi.fn();
    const baseDeps = makeDeps([entry(1)]);
    const deps: CreateReadToolsDeps = {
      ...baseDeps,
      identityRegistry: {
        getOwner: async () => {
          throw new Error('rpc upstream failed');
        },
      },
    };
    const server = createConciergeMcpServer({
      tools: createReadTools(deps),
      onToolError,
      onEmptyToolset: () => {
        /* unused */
      },
    });
    const client = new Client({ name: 'test-client', version: '0.0.0' });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(a), client.connect(b)]);
    const res = await client.callTool({
      name: 'get_agent_state',
      arguments: { agentId: '1' },
    });
    expect(res.isError).toBe(true);
    expect(onToolError).toHaveBeenCalledTimes(1);
    expect(onToolError.mock.calls[0]?.[0]?.toolName).toBe('get_agent_state');
  });

  it('round-trips revoked: true through toEntry (no flag loss)', async () => {
    const revoked = { ...entry(1), revoked: true };
    const { client } = await connect(makeDeps([revoked]));
    const res = await client.callTool({
      name: 'get_reputation',
      arguments: { agentId: '1' },
    });
    const structured = res.structuredContent as { entries: Array<{ revoked: boolean }> };
    expect(structured.entries[0]?.revoked).toBe(true);
  });

  it('get_attestation with empty entries list returns the standard not-found error', async () => {
    const { client } = await connect(makeDeps([])); // empty fixture list
    const res = await client.callTool({
      name: 'get_attestation',
      arguments: { agentId: '1', feedbackHash: HASH('deadbeef') },
    });
    expect(res.isError).toBe(true);
    const content = res.content as Array<{ text: string }>;
    // totalCount=0; should report "not found within 0-entry list", NOT the
    // scan-window-exceeded variant.
    expect(content[0]?.text).toMatch(/not found within 0-entry/);
    expect(content[0]?.text).not.toMatch(/scan-window exceeded/);
  });
});
