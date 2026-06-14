/**
 * Story-137 / SEP-1865 — `ui://concierge/*` HTML resource registration
 * + `_meta.ui.resourceUri` propagation on tools with a `uiCardId`.
 */
import { type ConciergeTool, tool } from '@concierge-mantle/tools';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { UI_RESOURCES } from '../registerUIResources.ts';
import { createConciergeMcpServer } from '../server.ts';

async function connect(tools: ReadonlyArray<ConciergeTool>) {
  const server = createConciergeMcpServer({
    tools,
    onEmptyToolset: () => {},
    onToolError: () => {},
  });
  const client = new Client({ name: 'test-client', version: '0.0.0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  return { server, client };
}

const MCP_APP_MIME = 'text/html; profile=mcp-app';
const ALL_URIS = [
  'ui://concierge/proposal-card',
  'ui://concierge/tick-card',
  'ui://concierge/portfolio-snapshot',
  'ui://concierge/reputation-receipt',
];

describe('registerUIResources (story-137)', () => {
  it('lists all 4 ui://concierge/* resources via tools-less server', async () => {
    const { client } = await connect([]);
    const list = await client.listResources();
    const uris = list.resources.map((r) => r.uri).sort();
    expect(uris).toEqual([...ALL_URIS].sort());
  });

  it('every resource has mimeType text/html; profile=mcp-app and a valid HTML body', async () => {
    const { client } = await connect([]);
    for (const uri of ALL_URIS) {
      const res = await client.readResource({ uri });
      expect(res.contents).toHaveLength(1);
      const c = res.contents[0] as { mimeType?: string; text?: string };
      expect(c.mimeType).toBe(MCP_APP_MIME);
      expect(c.text).toMatch(/^<!DOCTYPE html>/i);
      expect(c.text).toContain('<html');
      // Every card listens for the host's `concierge.data` message (read-only cards
      // don't postMessage BACK; only proposal-card does, covered in a separate test).
      expect(c.text).toContain("'message'");
      expect(c.text).toContain('concierge.data');
    }
  });

  it('every HTML body is under 50KB (ADR-017 iframe perf budget)', () => {
    for (const r of UI_RESOURCES) {
      const bytes = new TextEncoder().encode(r.html).length;
      expect(bytes).toBeLessThan(50 * 1024);
    }
  });

  it('NO external script src= in any HTML body (sandboxed iframes block them)', () => {
    for (const r of UI_RESOURCES) {
      expect(r.html).not.toMatch(/<script[^>]*\bsrc\s*=/i);
    }
  });

  it("NO postMessage with '*' origin (SEP-1865 origin-validation discipline)", () => {
    for (const r of UI_RESOURCES) {
      expect(r.html).not.toMatch(/postMessage\([^,]+,\s*['"]\*['"]/);
    }
  });

  it("tool with uiCardId: 'proposal' carries _meta.ui.resourceUri on tools/list", async () => {
    const proposalTool: ConciergeTool = tool({
      name: 'plan_thing',
      description: 'returns a proposal',
      inputSchema: z.object({}),
      outputSchema: z.object({ proposalId: z.string() }),
      uiCardId: 'proposal',
      invoke: async () => ({ proposalId: 'p-1' }),
    }) as ConciergeTool;
    const { client } = await connect([proposalTool]);
    const list = await client.listTools();
    const entry = list.tools.find((t) => t.name === 'plan_thing');
    expect(entry).toBeDefined();
    expect((entry?._meta as { ui?: { resourceUri?: string } } | undefined)?.ui?.resourceUri).toBe(
      'ui://concierge/proposal-card',
    );
  });

  it('tool without uiCardId does NOT carry _meta.ui (and never spreads stray undefined)', async () => {
    const plain: ConciergeTool = tool({
      name: 'plain',
      description: 'no card',
      inputSchema: z.object({}),
      outputSchema: z.object({ ok: z.boolean() }),
      invoke: async () => ({ ok: true }),
    }) as ConciergeTool;
    const { client } = await connect([plain]);
    const list = await client.listTools();
    const entry = list.tools.find((t) => t.name === 'plain');
    const meta = entry?._meta as { ui?: unknown } | undefined;
    expect(meta?.ui).toBeUndefined();
  });

  it('all four uiCardIds (proposal/tick/portfolio/reputation) map to their canonical resource URI', async () => {
    const cards: ReadonlyArray<['proposal' | 'tick' | 'portfolio' | 'reputation', string]> = [
      ['proposal', 'ui://concierge/proposal-card'],
      ['tick', 'ui://concierge/tick-card'],
      ['portfolio', 'ui://concierge/portfolio-snapshot'],
      ['reputation', 'ui://concierge/reputation-receipt'],
    ];
    const tools: ConciergeTool[] = cards.map(
      ([card, _uri], i) =>
        tool({
          name: `t_${i}`,
          description: 'x',
          inputSchema: z.object({}),
          outputSchema: z.object({ ok: z.boolean() }),
          uiCardId: card,
          invoke: async () => ({ ok: true }),
        }) as ConciergeTool,
    );
    const { client } = await connect(tools);
    const list = await client.listTools();
    for (const [i, [, expectedUri]] of cards.entries()) {
      const entry = list.tools.find((t) => t.name === `t_${i}`);
      const ref = (entry?._meta as { ui?: { resourceUri?: string } } | undefined)?.ui?.resourceUri;
      expect(ref).toBe(expectedUri);
    }
  });
});
