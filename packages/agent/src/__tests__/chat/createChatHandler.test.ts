import type {
  ConciergeAgentLike,
  ConciergeTool,
  ProviderToolFactory,
} from '@concierge-mantle/tools';
import { tool } from '@concierge-mantle/tools';
import type { LanguageModelV2 } from 'ai';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createChatHandler, DEFAULT_MAX_STEPS } from '../../chat/createChatHandler.ts';
import { renderSystemPrompt } from '../../chat/systemPrompt.ts';

const fakeAgent: ConciergeAgentLike = { chainId: 5000 } as ConciergeAgentLike;

/** Minimal Vercel AI SDK v6 model stub.
 *  Returns ONE assistant text chunk + finish — enough to assert wiring +
 *  exercise the toUIMessageStreamResponse path. */
function fakeModel(): LanguageModelV2 {
  return {
    specificationVersion: 'v2',
    provider: 'test',
    modelId: 'test-model',
    supportedUrls: {},
    // biome-ignore lint/suspicious/noExplicitAny: matches v2 model shape loosely for tests
    doStream: async () =>
      ({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: 'response-metadata', id: '1' });
            controller.enqueue({ type: 'text-start', id: 't1' });
            controller.enqueue({ type: 'text-delta', id: 't1', delta: 'ok' });
            controller.enqueue({ type: 'text-end', id: 't1' });
            controller.enqueue({
              type: 'finish',
              finishReason: 'stop',
              usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
            });
            controller.close();
          },
        }),
        request: {},
        response: {},
        // biome-ignore lint/suspicious/noExplicitAny: model shape is intentionally loose
      }) as any,
    // biome-ignore lint/suspicious/noExplicitAny: doGenerate stub for the v2 model contract
    doGenerate: vi.fn() as any,
  };
}

function postJson(body: unknown): Request {
  return new Request('http://test/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const baseDeps = {
  agent: fakeAgent,
  systemPromptContext: {
    agentId: '42',
    goal: 'max stablecoin yield',
    availableProviders: ['Aave V3'],
    network: 'mantle-mainnet' as const,
  },
};

describe('createChatHandler', () => {
  it('rejects non-POST with 405', async () => {
    const handler = createChatHandler({ ...baseDeps, model: fakeModel() });
    const res = await handler(new Request('http://test/api/chat', { method: 'GET' }));
    expect(res.status).toBe(405);
  });

  it('rejects malformed JSON with 400', async () => {
    const handler = createChatHandler({ ...baseDeps, model: fakeModel() });
    const res = await handler(
      new Request('http://test/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{not json',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('rejects body without messages array with 400', async () => {
    const handler = createChatHandler({ ...baseDeps, model: fakeModel() });
    const res = await handler(postJson({ unrelated: 1 }));
    expect(res.status).toBe(400);
  });

  it('returns a UI-message-stream Response for a valid POST', async () => {
    const handler = createChatHandler({ ...baseDeps, model: fakeModel() });
    const res = await handler(
      postJson({
        messages: [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hello' }] }],
      }),
    );
    expect(res.status).toBe(200);
    // Vercel AI SDK v6 sets this header on UI-message streams.
    expect(res.headers.get('x-vercel-ai-ui-message-stream')).toBe('v1');
  });

  it('verify=false rejects with 401 (auth gate enforced before LLM hit)', async () => {
    const verify = vi.fn(async () => false);
    const handler = createChatHandler({ ...baseDeps, model: fakeModel(), verify });
    const res = await handler(
      postJson({
        messages: [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hello' }] }],
      }),
    );
    expect(res.status).toBe(401);
    expect(verify).toHaveBeenCalledTimes(1);
  });

  it('verify throwing → 401 (NEVER 500 — auth errors never leak)', async () => {
    const verify = vi.fn(async () => {
      throw new Error('upstream-auth-down');
    });
    const handler = createChatHandler({ ...baseDeps, model: fakeModel(), verify });
    const res = await handler(
      postJson({
        messages: [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hello' }] }],
      }),
    );
    expect(res.status).toBe(401);
  });

  it('verify=true lets the request through to the LLM stream', async () => {
    const verify = vi.fn(async () => true);
    const handler = createChatHandler({ ...baseDeps, model: fakeModel(), verify });
    const res = await handler(
      postJson({
        messages: [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hello' }] }],
      }),
    );
    expect(res.status).toBe(200);
  });

  it('default DEFAULT_MAX_STEPS is the locked 8', () => {
    expect(DEFAULT_MAX_STEPS).toBe(8);
  });

  it('renderSystemPrompt embeds goal verbatim + provider list + network', () => {
    const out = renderSystemPrompt({
      agentId: '4200',
      goal: 'preserve capital, never lose more than 1%',
      availableProviders: ['Aave V3', 'Ethena'],
      network: 'mantle-sepolia',
      policySummary: 'all autopilot',
    });
    expect(out).toContain('Agent id: 4200');
    expect(out).toContain('mantle-sepolia');
    expect(out).toContain('"preserve capital, never lose more than 1%"');
    expect(out).toContain('Aave V3, Ethena');
    expect(out).toContain('all autopilot');
  });

  it('renderSystemPrompt has sensible defaults for omitted fields', () => {
    const out = renderSystemPrompt({
      agentId: '1',
      goal: 'test',
      availableProviders: [],
    });
    expect(out).toContain('mantle-mainnet');
    expect(out).toContain('no providers configured');
    expect(out).toContain('manual approval');
  });

  it('passes providerToolFactories through to getVercelAITools', async () => {
    const sentinel = vi.fn((): readonly ConciergeTool[] => [
      tool({
        name: 'fake_action',
        description: 'fake tool',
        inputSchema: z.object({ q: z.string() }),
        outputSchema: z.object({ result: z.string() }),
        invoke: async (args) => ({ result: `echo:${args.q}` }),
      }) as ConciergeTool,
    ]);
    const factory: ProviderToolFactory = sentinel as unknown as ProviderToolFactory;
    const handler = createChatHandler({
      ...baseDeps,
      model: fakeModel(),
      providerToolFactories: [factory],
    });
    const res = await handler(
      postJson({
        messages: [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hello' }] }],
      }),
    );
    // Factory ran at handler-construction time (NOT per-request) per
    // getVercelAITools' upfront ToolSet build.
    expect(sentinel).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });
});
