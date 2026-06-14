// ConciergeTool — single source of truth for every adapter (Vercel AI / OpenAI / LangChain / AgentKit / MCP / React UI).
// Implements ADR-014. Differences from the ADR's verbatim form, applied for tighter invariants:
//  - `chainId` narrowed to `EvmChainId` from @concierge-mantle/shared (vs bare `number`).
//  - `UICardId` is the four-arm v1 set; `'plan'` / `'data-table'` are post-v1 (need an ADR amendment).
//  - `outputSchema` constrained to `z.ZodObject` per ADR-017 (MCP structuredContent needs an object at top level).

import type { EvmChainId } from '@concierge-mantle/shared';
import type { z } from 'zod';

export type { TickLoopPhase as TickPhase } from '@concierge-mantle/shared';

/** UI card identifiers; each id MUST have a matching SerializableXxxCardSchema (caught by CARD_SCHEMAS' `satisfies` in serializable.ts). */
export type UICardId = 'proposal' | 'tick' | 'portfolio' | 'reputation';

/**
 * MCP tool annotations per MCP spec 2025-06-18 (`registerTool` `annotations`).
 * These are hints to MCP clients about safety/behaviour; non-MCP adapters ignore.
 * Context7 audit M3 (2026-06-14): surfaced through the ConciergeTool primitive
 * so providers declare semantics once and every adapter that cares (MCP) reads
 * them — instead of MCP having to special-case per-tool annotation tables.
 */
export interface ConciergeToolAnnotations {
  /** True when the tool performs only read operations (no side effects). */
  readonly readOnlyHint?: boolean;
  /** True when repeating the call with the same args yields the same result. */
  readonly idempotentHint?: boolean;
  /** True when the tool reaches outside the local process (RPC, HTTP, on-chain). */
  readonly openWorldHint?: boolean;
  // `destructiveHint` (MCP spec) intentionally omitted until the first write
  // tool needs it — its MCP-spec default is `true`, which is the safe behaviour
  // for any tool that omits annotations entirely. Add the field when needed.
}

export interface ConciergeTool<
  TInputSchema extends z.ZodTypeAny = z.ZodTypeAny,
  // biome-ignore lint/suspicious/noExplicitAny: ZodObject's shape param defaults to z.ZodRawShape; using any here lets adapters compose without specifying the shape generic at every callsite.
  TOutputSchema extends z.ZodObject<any> = z.ZodObject<z.ZodRawShape>,
> {
  name: string;
  /** Human-readable display title (MCP `registerTool` `title`). Optional; defaults to `name`. */
  title?: string;
  description: string;
  inputSchema: TInputSchema;
  outputSchema: TOutputSchema;
  uiCardId?: UICardId;
  /** Optional MCP-spec annotations forwarded by `@concierge-mantle/mcp`. */
  annotations?: ConciergeToolAnnotations;
  invoke(args: z.infer<TInputSchema>): Promise<z.infer<TOutputSchema>>;
  supportsNetwork?(chainId: EvmChainId): boolean;
}

/** Minimum agent shape `createConciergeTools` needs for chain-gated filtering. */
export interface ConciergeAgentLike {
  readonly chainId: EvmChainId;
}

/**
 * Each provider package exports one of these as `tools`; the agent constructor composes them.
 *
 * **Must be synchronous** — the return type is `Array<…>`, NOT `Promise<Array<…>>`. Async
 * setup (network probes, dynamic ABI fetches, RPC version checks) belongs in the agent
 * constructor BEFORE `createConciergeTools(agent, factories)` is called; the registry
 * detects Promise/thenable returns and throws with a "did you forget to await?" hint
 * (see createConciergeTools.ts duties 2-3). The signature is sync because tool composition
 * must be deterministic at adapter-build time — Vercel AI SDK / OpenAI / MCP all need
 * the tool list resolved before the first model call.
 *
 * Generic narrowing is intentionally erased at the boundary — adapters dispatch by `t.name`
 * at runtime; per-tool inference belongs at the tool-definition site (via `tool()`), not here.
 */
// biome-ignore lint/suspicious/noExplicitAny: deliberate erasure — see comment above.
export type ProviderToolFactory = (agent: ConciergeAgentLike) => Array<ConciergeTool<any, any>>;
