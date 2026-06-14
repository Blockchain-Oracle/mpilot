import type { LanguageModelV2 } from '@ai-sdk/provider';
import type { ConciergeAgentLike, ProviderToolFactory } from '@concierge-mantle/tools';
import { getVercelAITools } from '@concierge-mantle/vercel-ai';
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from 'ai';
import { renderSystemPrompt, type SystemPromptContext } from './systemPrompt.ts';

/** Default cap on the LLM tool-loop per response. Story-61 BDD: 8 max. */
export const DEFAULT_MAX_STEPS = 8;

export interface CreateChatHandlerDeps {
  /** Vercel AI SDK v6 model. Typically from `defaultModel()` (story-320). */
  readonly model: LanguageModelV2;
  /** Concierge runtime context — supplies `chainId` for tool gating. */
  readonly agent: ConciergeAgentLike;
  /** Provider tool factories from each `@concierge-mantle/<provider>` package. */
  readonly providerToolFactories?: ReadonlyArray<ProviderToolFactory>;
  /**
   * System prompt context. The handler renders one prompt per request from
   * this base, so callers can keep static fields (agentId, providers) here
   * and override per-request fields via `extractContext` if needed.
   */
  readonly systemPromptContext: SystemPromptContext;
  /**
   * Cap on multi-step tool calls per response. Default 8 per story-61 BDD.
   * Going above this risks runaway loops; stay below this if you want a
   * tighter feedback loop in the UI.
   */
  readonly maxSteps?: number;
  /**
   * Optional auth gate. The handler is framework-agnostic; authentication
   * is the caller's concern. If `verify` rejects, the handler returns a 401
   * Response without invoking the LLM. The default is unauthenticated —
   * production deployments MUST wire a verify callback or front the handler
   * with framework-level auth.
   */
  readonly verify?: (req: Request) => Promise<boolean>;
}

/**
 * Build a framework-agnostic Web Request → Response handler for the
 * Concierge chat surface.
 *
 * Pattern:
 *   POST /api/chat { messages: UIMessage[] }
 *   → Vercel AI SDK v6 `streamText` with the Concierge ToolSet
 *   → returns a UI-message-stream Response (`x-vercel-ai-ui-message-stream: v1`)
 *
 * The handler uses Web platform `Request`/`Response`, so it slots into
 * Next.js App Router (`apps/web/app/api/chat/route.ts`), Cloudflare Workers,
 * Hono, Bun.serve, and Deno without modification.
 *
 * Auth, rate limiting, and request validation belong at the framework
 * edge — not here. Pass a `verify` callback for a quick built-in gate,
 * or wrap the handler in middleware for richer auth flows.
 */
export function createChatHandler(
  deps: CreateChatHandlerDeps,
): (req: Request) => Promise<Response> {
  const tools = getVercelAITools(deps.agent, deps.providerToolFactories);
  const system = renderSystemPrompt(deps.systemPromptContext);
  const maxSteps = deps.maxSteps ?? DEFAULT_MAX_STEPS;

  return async (req: Request): Promise<Response> => {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    if (deps.verify) {
      let authed = false;
      try {
        authed = await deps.verify(req);
      } catch {
        // Treat verify errors as auth failures — never silently 200 a broken
        // auth gate. Body intentionally generic to avoid leaking failure mode.
        return new Response('Unauthorized', { status: 401 });
      }
      if (!authed) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    let payload: { messages?: ReadonlyArray<UIMessage> } | undefined;
    try {
      payload = (await req.json()) as { messages?: ReadonlyArray<UIMessage> };
    } catch {
      return new Response('Invalid JSON body', { status: 400 });
    }
    const messages = payload?.messages;
    if (!Array.isArray(messages)) {
      return new Response('`messages` is required and must be an array', { status: 400 });
    }

    const result = streamText({
      model: deps.model,
      system,
      messages: await convertToModelMessages(messages),
      stopWhen: stepCountIs(maxSteps),
      tools,
    });

    return result.toUIMessageStreamResponse();
  };
}
