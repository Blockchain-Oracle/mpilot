// LangChain JS adapter for the framework-agnostic @concierge/tools registry
// (ADR-014). Outputs are stringified via bigintSafeStringify so ToolMessage
// content is a deterministic string under the adapter's control: LangChain
// v1 would otherwise coerce objects itself (its tool output type is `any`),
// turning an `undefined` return into a silent empty-success message and
// silently coercing an object containing wei-scale bigints to
// `"[object Object]"` (its stringify fallback swallows the BigInt TypeError).

import {
  bigintSafeStringify,
  type ConciergeAgentLike,
  type ConciergeTool,
  createConciergeTools,
  isZodObject,
  isZodPipe,
  type ProviderToolFactory,
} from '@concierge/tools';
import { tool as lcTool, type StructuredToolInterface } from '@langchain/core/tools';

/**
 * Convert one ConciergeTool into a LangChain structured tool. The Concierge
 * `inputSchema` passes through by reference, so LangChain parses inputs with
 * the exact same Zod schema before delegating — `invoke` receives the PARSED
 * value (defaults applied, unknown keys stripped), never the raw args.
 *
 * Throws a `TypeError` when `inputSchema` is not a Zod object — the registry
 * invariant `createConciergeTools` already enforces. Without the guard, a
 * missing or plain-string schema would make LangChain's `tool()` build a
 * string-input DynamicTool that feeds raw strings into an `invoke` expecting
 * a parsed object, and other non-object schemas surface only as confusing
 * call-time parse failures or quiet pass-throughs, never as a
 * construction-time error.
 */
export function toLangChainTool(t: ConciergeTool): StructuredToolInterface {
  // Guards run against a local so their narrowing cannot leak into the
  // `schema:` argument below: narrowing to the unrefined
  // z.ZodObject<z.ZodRawShape> flips LangChain's tool() overload resolution
  // onto its string-input DynamicTool arm, which fails to typecheck under
  // exactOptionalPropertyTypes.
  const inputSchema = t.inputSchema;
  if (isZodPipe(inputSchema)) {
    throw new TypeError(
      `Tool "${t.name}" inputSchema uses .transform() or .pipe(); perform normalization inside invoke() instead — LangChain must parse with the plain z.object shape.`,
    );
  }
  if (!isZodObject(inputSchema)) {
    throw new TypeError(
      `Tool "${t.name}" has a non-object inputSchema; ConciergeTool requires a Zod object schema (z.object({ ... })).`,
    );
  }
  return lcTool(async (args) => bigintSafeStringify(await t.invoke(args)), {
    name: t.name,
    description: t.description,
    schema: t.inputSchema,
  });
}

/**
 * Build a `bindTools`-ready `StructuredToolInterface[]` from the Concierge
 * registry. Mirrors `createConciergeTools(agent, providerToolFactories)`:
 * omitting the factories yields an empty array, and registry validation
 * errors (duplicate names, schema violations) propagate unchanged.
 *
 * Cancelling a LangChain run does NOT cancel an in-flight tool call —
 * `ConciergeTool.invoke` takes no abort signal, so a started execution
 * (e.g. an on-chain transaction) runs to completion.
 */
export function getLangChainTools(
  agent: ConciergeAgentLike,
  providerToolFactories?: ReadonlyArray<ProviderToolFactory>,
): StructuredToolInterface[] {
  return createConciergeTools(agent, providerToolFactories).map(toLangChainTool);
}
