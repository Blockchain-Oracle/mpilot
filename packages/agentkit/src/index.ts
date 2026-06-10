// Coinbase AgentKit adapter for the framework-agnostic @concierge/tools
// registry (ADR-014), via the `customActionProvider` ESCAPE HATCH — never
// AgentKit's CreateAction decorator path. That keeps OUR src free of
// decorator syntax, metadata-reflection imports, and `experimentalDecorators`;
// AgentKit self-loads its reflection polyfill inside its own actionDecorator
// module. (The story's anti-regression greps for the literal decorator and
// polyfill import strings — keep them out of this package's src, comments
// included.)
//
// Outputs are stringified via bigintSafeStringify because AgentKit's
// `Action.invoke` contract is `Promise<string>`: bare JSON.stringify throws
// on the wei-scale bigints provider tools return, and handing back a raw
// object would rely on downstream coercion ("[object Object]").

import {
  type CustomActionProvider,
  customActionProvider,
  type WalletProvider,
} from '@coinbase/agentkit';
import {
  bigintSafeStringify,
  type ConciergeAgentLike,
  type ConciergeTool,
  createConciergeTools,
  isZodObject,
  isZodPipe,
  type ProviderToolFactory,
} from '@concierge/tools';

/**
 * One entry of the `customActionProvider` options array, typed with OUR
 * zod-4 schema. AgentKit's own option type annotates `schema` with its
 * bundled zod 3, so this interface is the honest shape we build and the
 * cast in `getConciergeActionProvider` is the single boundary where the
 * two zod majors meet (see the comment there).
 */
export interface ConciergeAgentKitAction {
  name: string;
  description: string;
  schema: ConciergeTool['inputSchema'];
  invoke: (args: unknown) => Promise<string>;
}

/**
 * Convert one ConciergeTool into a `customActionProvider` action. The
 * Concierge `inputSchema` passes through BY REFERENCE, and AgentKit's
 * wrapper calls `schema.parse(args)` before delegating — `invoke` receives
 * the PARSED value (defaults applied, unknown keys stripped), the same
 * invariant every other Concierge adapter upholds. Only `.parse` is touched
 * at runtime, which is why a zod-4 schema works inside zod-3-era AgentKit.
 *
 * The returned `invoke` is deliberately UNARY: AgentKit decides whether to
 * inject a WalletProvider by checking `invoke.length === 2`, so a binary
 * closure would silently shift the model's arguments out of position.
 *
 * Throws a `TypeError` on `.transform()`/`.pipe()` schemas: AgentKit core
 * only parses, but every downstream action→model bridge converts `schema`
 * to JSON Schema, where a pipe advertises its OUTPUT segment — a shape that
 * may not match what `parse()` accepts (the openai/langchain siblings
 * reject the same trap). Non-object schemas are rejected for the same
 * registry invariant `createConciergeTools` enforces.
 */
export function toAgentKitAction(t: ConciergeTool): ConciergeAgentKitAction {
  const inputSchema = t.inputSchema;
  if (isZodPipe(inputSchema)) {
    throw new TypeError(
      `Tool "${t.name}" inputSchema uses .transform() or .pipe(); perform normalization inside invoke() instead — AgentKit consumers convert the advertised schema to JSON Schema, which would ship the pipe's output shape.`,
    );
  }
  if (!isZodObject(inputSchema)) {
    throw new TypeError(
      `Tool "${t.name}" has a non-object inputSchema; ConciergeTool requires a Zod object schema (z.object({ ... })).`,
    );
  }
  return {
    name: t.name,
    description: t.description,
    schema: t.inputSchema,
    invoke: async (args: unknown) => bigintSafeStringify(await t.invoke(args)),
  };
}

/**
 * Build an AgentKit `ActionProvider` from the Concierge registry, ready for
 * `AgentKit.from({ walletProvider, actionProviders: [provider] })`. Mirrors
 * `createConciergeTools(agent, providerToolFactories)`: omitting the
 * factories yields a provider with zero actions, and registry validation
 * errors (duplicate names, schema violations) propagate unchanged.
 *
 * Three AgentKit behaviors consumers must know (verified against 0.10.4):
 *
 * - Action names surface PREFIXED as `CustomActionProvider_<toolName>` —
 *   AgentKit's CreateAction stamps `${ClassName}_${name}` on every custom
 *   action, and models address tools by the full prefixed name.
 * - Every action invocation fires AgentKit's own un-awaited telemetry fetch
 *   to `cca-lite.coinbase.com`. That is upstream behavior, not this
 *   adapter's; stub `fetch` in tests if it matters.
 * - Create ONE provider per process: AgentKit registers custom-action
 *   metadata on the shared CustomActionProvider class and `getActions`
 *   resolves from it AT CALL TIME, so after a second call with overlapping
 *   tool names the first provider's `getActions` hands out the later
 *   registration's closures (last wins).
 *
 * `outputSchema` is deliberately NOT enforced on the return value (same
 * policy as the langchain sibling): AgentKit's Action contract has no
 * return-shape slot — output validation belongs to the tool. Cancelling an
 * AgentKit run does NOT cancel an in-flight tool call — `ConciergeTool.invoke`
 * takes no abort signal, so a started execution runs to completion.
 */
export function getConciergeActionProvider(
  agent: ConciergeAgentLike,
  providerToolFactories?: ReadonlyArray<ProviderToolFactory>,
): CustomActionProvider<WalletProvider> {
  const actions = createConciergeTools(agent, providerToolFactories).map(toAgentKitAction);
  // Single cross-library type boundary: AgentKit's option type annotates
  // `schema` with its bundled zod 3, which a zod-4 schema cannot satisfy
  // structurally. Runtime only ever calls `schema.parse` (verified against
  // the 0.10.4 dist and pinned by this package's tests), so the cast is
  // type-level reconciliation, not a behavior change.
  return customActionProvider<WalletProvider>(
    actions as unknown as Parameters<typeof customActionProvider<WalletProvider>>[0],
  );
}
