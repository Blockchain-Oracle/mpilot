import type {
  ConciergeAgentLike,
  ConciergeTool,
  ProviderToolFactory,
} from '@concierge-mantle/tools';
import { tool } from '@concierge-mantle/tools';
import type { LanguageModelV2 } from 'ai';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  type AuthGate,
  type CreateChatHandlerDeps,
  createChatHandler,
  DEFAULT_MAX_BODY_BYTES,
  DEFAULT_MAX_STEPS,
} from '../../chat/createChatHandler.ts';
import { MAX_GOAL_LENGTH, renderSystemPrompt } from '../../chat/systemPrompt.ts';

const fakeAgent: ConciergeAgentLike = { chainId: 5000 } as ConciergeAgentLike;
const publicAuth: AuthGate = { auth: 'public' };

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

const baseCtx = {
  agentId: '42',
  goal: 'max stablecoin yield',
  availableProviders: ['Aave V3'],
  network: 'mantle-mainnet' as const,
};

function baseDeps(override: Partial<CreateChatHandlerDeps> = {}): CreateChatHandlerDeps {
  return {
    agent: fakeAgent,
    model: fakeModel(),
    authGate: publicAuth,
    getSystemPromptContext: async () => baseCtx,
    ...override,
  };
}

describe('createChatHandler', () => {
  it('rejects non-POST with 405', async () => {
    const handler = createChatHandler(baseDeps());
    const res = await handler(new Request('http://test/api/chat', { method: 'GET' }));
    expect(res.status).toBe(405);
  });

  it('rejects malformed JSON with 400', async () => {
    const handler = createChatHandler(baseDeps());
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
    const handler = createChatHandler(baseDeps());
    const res = await handler(postJson({ unrelated: 1 }));
    expect(res.status).toBe(400);
  });

  it('returns a UI-message-stream Response for a valid POST', async () => {
    const handler = createChatHandler(baseDeps());
    const res = await handler(
      postJson({
        messages: [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hello' }] }],
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('x-vercel-ai-ui-message-stream')).toBe('v1');
  });

  // ── Auth gate (discriminated union, no optional verify) ────────────────

  it('authGate: { auth: "verify", verify } — verify=false → 401', async () => {
    const verify = vi.fn(async () => false);
    const handler = createChatHandler(baseDeps({ authGate: { auth: 'verify', verify } }));
    const res = await handler(
      postJson({
        messages: [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hello' }] }],
      }),
    );
    expect(res.status).toBe(401);
    expect(verify).toHaveBeenCalledTimes(1);
  });

  it('authGate: verify throws → 401 + onError invoked (NEVER silently 401)', async () => {
    const onError = vi.fn();
    const verify = vi.fn(async () => {
      throw new Error('upstream-auth-down');
    });
    const handler = createChatHandler(baseDeps({ authGate: { auth: 'verify', verify }, onError }));
    const res = await handler(
      postJson({
        messages: [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hello' }] }],
      }),
    );
    expect(res.status).toBe(401);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ stage: 'verify' }));
  });

  it('authGate: verify=true → passes through to LLM', async () => {
    const verify = vi.fn(async () => true);
    const handler = createChatHandler(baseDeps({ authGate: { auth: 'verify', verify } }));
    const res = await handler(
      postJson({
        messages: [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hello' }] }],
      }),
    );
    expect(res.status).toBe(200);
  });

  // ── Body cap (CWE-400 memory DoS) ──────────────────────────────────────

  it('413 when Content-Length exceeds maxBodyBytes', async () => {
    const handler = createChatHandler(baseDeps({ maxBodyBytes: 64 }));
    const big = 'x'.repeat(200);
    const res = await handler(
      new Request('http://test/api/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': String(big.length),
        },
        body: big,
      }),
    );
    expect(res.status).toBe(413);
  });

  it('DEFAULT_MAX_BODY_BYTES is 256 KB (the doc-locked default)', () => {
    expect(DEFAULT_MAX_BODY_BYTES).toBe(256 * 1024);
  });

  // ── Per-request system-prompt context (round-1 CRITICAL multi-tenant fix) ──

  it('calls getSystemPromptContext PER REQUEST (no construction-time freeze)', async () => {
    const calls: string[] = [];
    const getSystemPromptContext = vi.fn(async (req: Request) => {
      const goal = new URL(req.url).searchParams.get('g') ?? baseCtx.goal;
      calls.push(goal);
      return { ...baseCtx, goal };
    });
    const handler = createChatHandler(baseDeps({ getSystemPromptContext }));

    const r1 = await handler(
      new Request('http://test/api/chat?g=alpha', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }],
        }),
      }),
    );
    const r2 = await handler(
      new Request('http://test/api/chat?g=beta', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }],
        }),
      }),
    );
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    // Critical lock: 2 calls = 2 contexts. Multi-tenant correctness.
    expect(getSystemPromptContext).toHaveBeenCalledTimes(2);
    expect(calls).toEqual(['alpha', 'beta']);
  });

  it('getSystemPromptContext throws → 500 + onError invoked (no silent leak)', async () => {
    const onError = vi.fn();
    const handler = createChatHandler(
      baseDeps({
        onError,
        getSystemPromptContext: async () => {
          throw new Error('postgres-down');
        },
      }),
    );
    const res = await handler(
      postJson({
        messages: [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }],
      }),
    );
    // Round-2: 503 not 500 — getSystemPromptContext is an upstream-dependency
    // failure (DB/JWT/config), not a handler bug. Lets LBs retry.
    expect(res.status).toBe(503);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'getSystemPromptContext' }),
    );
  });

  // ── Round-2 hardening tests ────────────────────────────────────────────

  it('onError throwing does NOT propagate (observability never breaks request handling)', async () => {
    // CRITICAL silent-failure round-2 fix: a user-supplied onError that
    // throws must NOT escape; the handler still returns its intended Response.
    const throwingOnError = vi.fn(() => {
      throw new Error('sentry-init-broken');
    });
    const handler = createChatHandler(
      baseDeps({
        onError: throwingOnError,
        getSystemPromptContext: async () => {
          throw new Error('downstream-dead');
        },
      }),
    );
    const res = await handler(
      postJson({
        messages: [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }],
      }),
    );
    expect(res.status).toBe(503); // still returns 503; onError throw swallowed
    expect(throwingOnError).toHaveBeenCalled();
  });

  it('malformed Content-Length header → 400 (NaN bypass closed)', async () => {
    const handler = createChatHandler(baseDeps({ maxBodyBytes: 100 }));
    const res = await handler(
      new Request('http://test/api/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': 'abc', // NaN — previously bypassed cap
        },
        body: JSON.stringify({
          messages: [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hi' }] }],
        }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('post-read body cap closes the chunked/spoofed Content-Length bypass', async () => {
    // Send a body that exceeds the cap, but WITHOUT a content-length header
    // (simulates chunked / lying client). Post-read check should still 413.
    const handler = createChatHandler(baseDeps({ maxBodyBytes: 64 }));
    const big = 'x'.repeat(500);
    const res = await handler(
      new Request('http://test/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' }, // NO content-length
        body: big,
      }),
    );
    expect(res.status).toBe(413);
  });

  // ── Defaults + constants ──────────────────────────────────────────────

  it('DEFAULT_MAX_STEPS is the locked 8', () => {
    expect(DEFAULT_MAX_STEPS).toBe(8);
  });

  // ── System prompt — goal fencing (prompt-injection mitigation) ─────────

  it('renderSystemPrompt fences goal between explicit delimiters', () => {
    const out = renderSystemPrompt({
      agentId: '4200',
      goal: 'preserve capital',
      availableProviders: ['Aave V3'],
    });
    expect(out).toContain('<<<USER_GOAL>>>');
    expect(out).toContain('<<<END_USER_GOAL>>>');
    expect(out).toContain('preserve capital');
  });

  it('renderSystemPrompt caps goal at MAX_GOAL_LENGTH bytes', () => {
    const huge = 'a'.repeat(MAX_GOAL_LENGTH + 500);
    const out = renderSystemPrompt({
      agentId: '1',
      goal: huge,
      availableProviders: [],
    });
    // The goal segment inside the fence MUST be ≤ MAX_GOAL_LENGTH.
    const start = out.indexOf('<<<USER_GOAL>>>\n') + '<<<USER_GOAL>>>\n'.length;
    const end = out.indexOf('\n<<<END_USER_GOAL>>>');
    const goalInPrompt = out.slice(start, end);
    expect(goalInPrompt.length).toBe(MAX_GOAL_LENGTH);
    expect(goalInPrompt).not.toContain('aaa'.repeat(MAX_GOAL_LENGTH)); // sanity
  });

  it('renderSystemPrompt embeds providers + network + policy', () => {
    const out = renderSystemPrompt({
      agentId: '4200',
      goal: 'g',
      availableProviders: ['Aave V3', 'Ethena'],
      network: 'mantle-sepolia',
      policySummary: 'all autopilot',
    });
    expect(out).toContain('Agent id: 4200');
    expect(out).toContain('mantle-sepolia');
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

  // ── Provider factories pass-through (registry contract) ───────────────

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
    const handler = createChatHandler(baseDeps({ providerToolFactories: [factory] }));
    const res = await handler(
      postJson({
        messages: [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hello' }] }],
      }),
    );
    expect(sentinel).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });
});
