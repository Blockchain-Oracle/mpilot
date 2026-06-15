import type { LanguageModelV2 } from '@ai-sdk/provider';
import type { ConciergeAgentLike, ProviderToolFactory } from '@mpilot/tools';
import { getVercelAITools } from '@mpilot/vercel-ai';
import {
  consumeStream,
  convertToModelMessages,
  type ModelMessage,
  stepCountIs,
  streamText,
  type UIMessage,
} from 'ai';
import { renderSystemPrompt, type SystemPromptContext } from './systemPrompt.ts';

/** Default cap on the LLM tool-loop per response. Story-61 BDD: 8 max. */
export const DEFAULT_MAX_STEPS = 8;

/** Maximum request body in bytes — 256 KB is generous for any chat payload.
 *  Larger bodies are rejected with 413 — header-checked AND length-checked
 *  after read so chunked/spoofed clients can't bypass. */
export const DEFAULT_MAX_BODY_BYTES = 256 * 1024;

/**
 * Auth gate. Discriminated union forces a deliberate choice at the call site:
 *   - `{ auth: 'public' }` — explicitly unauthenticated. Required acknowledgement.
 *   - `{ auth: 'verify'; verify }` — gated by the verify callback.
 *
 * Per the post-merge security review of PR #144 — making `verify` optional
 * was a CWE-306 vector (default-unauthenticated LLM passthrough → credit DoS).
 */
export type AuthGate =
  | { readonly auth: 'public' }
  | { readonly auth: 'verify'; readonly verify: (req: Request) => Promise<boolean> };

/** Closed set of error stages — narrowing type lets ops route alerts and
 *  forces compile errors at every call site if a stage is renamed. */
export type ChatHandlerErrorStage =
  | 'verify'
  | 'parseBody'
  | 'convertToModelMessages'
  | 'getSystemPromptContext'
  | 'streamText';

export interface ChatHandlerErrorInfo {
  readonly stage: ChatHandlerErrorStage;
  readonly error: unknown;
}

export interface CreateChatHandlerDeps {
  /** Vercel AI SDK v6 model. Typically from `defaultModel()` (story-320). */
  readonly model: LanguageModelV2;
  /** Concierge runtime context — supplies `chainId` for tool gating. */
  readonly agent: ConciergeAgentLike;
  /** Provider tool factories from each `@mpilot/<provider>` package. */
  readonly providerToolFactories?: ReadonlyArray<ProviderToolFactory>;
  /**
   * Per-request system-prompt context provider. Called on EVERY request so
   * multi-tenant routes serving multiple agents/users get the correct goal,
   * policy, and provider list per request — NOT the first caller's frozen
   * values (round-1 CRITICAL fix from PR #144 review).
   */
  readonly getSystemPromptContext: (req: Request) => Promise<SystemPromptContext>;
  /** Cap on multi-step tool calls per response. Default 8 per story-61 BDD. */
  readonly maxSteps?: number;
  /** Auth gate — required, no default. */
  readonly authGate: AuthGate;
  /** Max request body in bytes. Default 256 KB. */
  readonly maxBodyBytes?: number;
  /**
   * Observability hook. Default writes to stderr (Node) / console.error
   * (Workers fallback). Pass `() => {}` to suppress. Errors thrown FROM
   * onError are caught and dropped — observability must never break request
   * handling (round-2 silent-failure fix).
   */
  readonly onError?: (info: ChatHandlerErrorInfo) => void;
}

function defaultOnError(info: ChatHandlerErrorInfo): void {
  const detail =
    info.error instanceof Error ? `${info.error.name}: ${info.error.message}` : String(info.error);
  const line = `[concierge-mantle/agent/chat] ${info.stage} error: ${detail}`;
  // Cloudflare Workers doesn't expose `process.stderr`. Feature-detect and
  // fall back to console.error — per the round-2 silent-failure review, the
  // raw `process.stderr.write` was the default deploy's only sink and would
  // silently 401 every auth failure on Workers.
  try {
    if (
      typeof process !== 'undefined' &&
      process.stderr &&
      typeof process.stderr.write === 'function'
    ) {
      process.stderr.write(`${line}\n`);
    } else if (typeof console !== 'undefined') {
      console.error(line);
    }
  } catch {
    /* observability loss is acceptable; request handling is not */
  }
}

/** Round-2 CRITICAL silent-failure fix: a user-supplied `onError` that throws
 *  must NOT propagate out of the handler. Observability cannot break request
 *  handling. Every `onError` call site goes through this wrapper. */
function safeOnError(
  onError: (info: ChatHandlerErrorInfo) => void,
  info: ChatHandlerErrorInfo,
): void {
  try {
    onError(info);
  } catch {
    /* see comment above */
  }
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
 * **Production checklist** (the handler enforces what it can; the rest is
 * caller responsibility):
 *  - Auth: REQUIRED via `authGate: { auth: 'verify', verify }` OR explicit
 *    `{ auth: 'public' }` acknowledgement.
 *  - Rate limit: front this handler with a token bucket. NOT built in.
 *  - CORS: caller's responsibility at the framework edge.
 *  - Body size: enforced via `maxBodyBytes` (default 256 KB) — both
 *    Content-Length declaration AND post-read length check so chunked /
 *    spoofed clients can't bypass.
 *  - Prompt injection on `goal`: caller's responsibility to sanitize at the
 *    onboarding boundary. The renderer caps + fences it.
 */
export function createChatHandler(
  deps: CreateChatHandlerDeps,
): (req: Request) => Promise<Response> {
  const tools = getVercelAITools(deps.agent, deps.providerToolFactories);
  const maxSteps = deps.maxSteps ?? DEFAULT_MAX_STEPS;
  const maxBodyBytes = deps.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
  const onError = deps.onError ?? defaultOnError;

  return async (req: Request): Promise<Response> => {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // Auth gate. Discriminated union: `verify` is explicit; `public` is opt-in.
    if (deps.authGate.auth === 'verify') {
      let authed = false;
      try {
        authed = await deps.authGate.verify(req);
      } catch (err) {
        // Round-1 CRITICAL: never silently swallow auth-system outages.
        // 401 is preserved (not 503) so we never leak auth-system state.
        safeOnError(onError, { stage: 'verify', error: err });
        return new Response('Unauthorized', { status: 401 });
      }
      if (!authed) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    // Body cap — two layers:
    // 1. Advisory: if Content-Length declares > cap, reject without buffering.
    //    Header is client-controlled so this is best-effort.
    // 2. Authoritative: read raw text, enforce cap on actual byte length BEFORE
    //    JSON.parse. Closes the chunked / spoofed-Content-Length bypass
    //    (CWE-400) flagged by silent-failure round-2.
    const declaredHeader = req.headers.get('content-length');
    if (declaredHeader !== null) {
      const declared = Number(declaredHeader);
      if (!Number.isFinite(declared)) {
        return new Response('Invalid Content-Length header', { status: 400 });
      }
      if (declared > maxBodyBytes) {
        return new Response(`Body too large (max ${String(maxBodyBytes)} bytes)`, { status: 413 });
      }
    }

    let raw: string;
    try {
      raw = await req.text();
    } catch (err) {
      safeOnError(onError, { stage: 'parseBody', error: err });
      return new Response('Failed to read request body', { status: 400 });
    }
    if (raw.length > maxBodyBytes) {
      return new Response(`Body too large (max ${String(maxBodyBytes)} bytes)`, { status: 413 });
    }

    let payload: { messages?: ReadonlyArray<UIMessage> } | undefined;
    try {
      payload = JSON.parse(raw) as { messages?: ReadonlyArray<UIMessage> };
    } catch {
      return new Response('Invalid JSON body', { status: 400 });
    }
    const messages = payload?.messages;
    if (!Array.isArray(messages)) {
      return new Response('`messages` is required and must be an array', { status: 400 });
    }

    // convertToModelMessages can reject malformed UIMessage shapes (bad role,
    // unknown part type). Without a try/catch this surfaced as a 500.
    let modelMessages: ModelMessage[];
    try {
      modelMessages = await convertToModelMessages(messages);
    } catch (err) {
      safeOnError(onError, { stage: 'convertToModelMessages', error: err });
      return new Response('Invalid messages payload', { status: 400 });
    }

    // Round-1 CRITICAL: render system prompt PER REQUEST so multi-tenant
    // routes serve the correct goal/policy/context — NOT the first caller's
    // frozen state at handler-construction time.
    // Round-2: 503 (not 500) — this is an upstream-dependency failure
    // (DB/JWT/config service), not a bug in the handler. 503 + lets LBs retry.
    let system: string;
    try {
      const ctx = await deps.getSystemPromptContext(req);
      system = renderSystemPrompt(ctx);
    } catch (err) {
      safeOnError(onError, { stage: 'getSystemPromptContext', error: err });
      return new Response('System prompt context unavailable', { status: 503 });
    }

    // Round-3 — verified against Vercel AI SDK v6 official docs via Context7:
    //  - `abortSignal: req.signal` so client disconnects cancel the upstream
    //    LLM call. WITHOUT this, an aborted browser request keeps burning
    //    Anthropic/OpenAI credits to completion (cost-control bug per the
    //    v6 stopping-streams doc).
    //  - `consumeSseStream: consumeStream` for proper abort cleanup
    //    (releases the SSE reader on abort so the request slot frees up).
    //  - `stepCountIs` is the v6 export (verified: `isStepCount` is v7-only;
    //    `toUIMessageStream` is also v7-only).
    //  - `result.toUIMessageStreamResponse({...})` is the v6 pattern. v7
    //    migration will switch to `createUIMessageStreamResponse + toUIMessageStream`
    //    but those don't exist in v6 today.
    const result = streamText({
      model: deps.model,
      system,
      messages: modelMessages,
      stopWhen: stepCountIs(maxSteps),
      tools,
      abortSignal: req.signal,
    });

    return result.toUIMessageStreamResponse({
      consumeSseStream: consumeStream,
      onError: (err) => {
        safeOnError(onError, { stage: 'streamText', error: err });
        return err instanceof Error ? `Stream error: ${err.message}` : 'Stream error';
      },
    });
  };
}
