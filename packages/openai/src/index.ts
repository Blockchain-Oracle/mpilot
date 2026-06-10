// Raw-shape OpenAI adapter for the framework-agnostic @concierge/tools
// registry (ADR-014). Wraps NO SDK — emits the Chat Completions wire-format
// tool array plus a dispatch() executor, so the same toolkit drives the
// `openai` client AND Anthropic Messages raw tool-use (key renames only:
// { name, description, input_schema: parameters }). Wrapper SDKs like
// @openai/agents are banned as stale per AUDIT-2026-06-09 §7; the `openai`
// and `@anthropic-ai/sdk` packages appear only as type-only devDependencies
// that pin wire-shape compatibility in tests.

import {
  bigintSafeStringify,
  type ConciergeAgentLike,
  type ConciergeTool,
  createConciergeTools,
  isZodObject,
  isZodPipe,
  type ProviderToolFactory,
  toJsonSchema,
} from '@concierge/tools';

/**
 * Re-exported for callers building the tool-result message: dispatch returns
 * the raw invoke() value, and both wire formats want a string
 * (`{ role: 'tool', content }` / `{ type: 'tool_result', content }`).
 * Plain JSON.stringify throws on the wei-scale bigints Concierge tools emit;
 * this serializer rewrites them to decimal strings.
 */
export { bigintSafeStringify };

/**
 * The NESTED Chat Completions function-tool wire shape (`.function` holds the
 * definition). Structurally assignable to the `openai` SDK's
 * `ChatCompletionFunctionTool` — pinned by a type-level test. The flat
 * Responses-API `FunctionTool` shape is NOT this type.
 */
export interface OpenAIFunctionTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/**
 * `tools` goes into the request body; `dispatch` executes a model-issued
 * tool call. `args` accepts the raw JSON string from a Chat Completions
 * `tool_calls[].function.arguments` or the already-parsed object from an
 * Anthropic `tool_use.input` block.
 */
export interface OpenAIToolkit {
  tools: OpenAIFunctionTool[];
  dispatch(name: string, args: string | object): Promise<unknown>;
}

/**
 * Convert one ConciergeTool into the Chat Completions function-tool shape,
 * with `parameters` emitted as OpenAPI-3 JSON Schema via `toJsonSchema`.
 *
 * Throws a `TypeError` when `inputSchema` is not a plain Zod object — the
 * registry invariant `createConciergeTools` already enforces, re-checked here
 * because direct callers bypass the registry. Pipes get their own error:
 * `z.toJSONSchema` may silently convert a `.transform()`/`.pipe()` chain as
 * its first segment, advertising a schema to the model that no longer matches
 * what `inputSchema.parse()` accepts at dispatch time.
 *
 * Note: emitted schemas are NOT OpenAI strict-mode ready (`strict: true`
 * requires `additionalProperties: false` and all properties required); see
 * the README if you need strict mode.
 */
export function toOpenAITool(t: ConciergeTool): OpenAIFunctionTool {
  if (isZodPipe(t.inputSchema)) {
    throw new TypeError(
      `Tool "${t.name}" inputSchema uses .transform() or .pipe(); perform normalization inside invoke() instead — the schema advertised to the model must match what inputSchema.parse() accepts.`,
    );
  }
  if (!isZodObject(t.inputSchema)) {
    throw new TypeError(
      `Tool "${t.name}" has a non-object inputSchema; ConciergeTool requires a Zod object schema (z.object({ ... })).`,
    );
  }
  return {
    type: 'function',
    function: { name: t.name, description: t.description, parameters: toJsonSchema(t) },
  };
}

/**
 * Build a Chat Completions toolkit from the Concierge registry. Mirrors
 * `createConciergeTools(agent, providerToolFactories)`: omitting the
 * factories yields an empty `tools` array (an unsupported `chainId` does the
 * same — if the model never sees your tools, check both), and registry
 * validation errors (duplicate names, schema violations) propagate unchanged.
 *
 * `dispatch` parses string args as JSON (SyntaxError propagates), rejects
 * unknown tool names loudly, and validates with the tool's own `inputSchema`
 * BEFORE invoking — `invoke` always receives the PARSED value (defaults
 * applied, unknown keys stripped), the same invariant every other Concierge
 * adapter upholds. No framework sits in between here, so the adapter is the
 * one that must parse.
 *
 * Cancelling a model run does NOT cancel an in-flight tool call —
 * `ConciergeTool.invoke` takes no abort signal, so a started execution
 * (e.g. an on-chain transaction) runs to completion.
 */
export function getOpenAITools(
  agent: ConciergeAgentLike,
  providerToolFactories?: ReadonlyArray<ProviderToolFactory>,
): OpenAIToolkit {
  const conciergeTools = createConciergeTools(agent, providerToolFactories);
  const tools = conciergeTools.map(toOpenAITool);
  const byName = new Map(conciergeTools.map((t) => [t.name, t]));
  return {
    tools,
    async dispatch(name, args) {
      const t = byName.get(name);
      if (!t) {
        throw new Error(
          `[@concierge/openai] dispatch: unknown tool "${name}". Known tools: ${[...byName.keys()].sort().join(', ')}`,
        );
      }
      const parsed: unknown = typeof args === 'string' ? JSON.parse(args) : args;
      return t.invoke(t.inputSchema.parse(parsed));
    },
  };
}
