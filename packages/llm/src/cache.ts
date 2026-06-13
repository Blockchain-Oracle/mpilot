import type Anthropic from '@anthropic-ai/sdk';

type ContentBlock = Anthropic.TextBlockParam;
type Tool = Anthropic.Tool;

const CACHE_EPHEMERAL = { type: 'ephemeral' as const };

/**
 * Anthropic's prompt cache treats `system` + `tools` as ONE stable prefix.
 * The `cache_control: { type: 'ephemeral' }` marker on the LAST block of the
 * prefix breaks the cache boundary there — every prior block is cached.
 *
 * NOTE: cache scope is per-organization (per API key); cross-tenant cache
 * poisoning is not possible.
 *
 * Both helpers return SHALLOW-COPIED arrays AND a deep-cloned trailing block
 * so the caller's input is NEVER mutated. The convenience wrapper
 * `markPrefixForCaching` is the canonical entry point; the per-array helpers
 * are exposed for callers that already split their construction.
 *
 * Empty input is the only branch that silently no-ops — empty system/tools
 * almost always indicates a caller bug (forgot to attach the prompt, or
 * filter returned zero). We emit a `console.warn` so the regression is
 * visible without blocking the call.
 */
function markLastForCaching<T extends { cache_control?: unknown }>(
  arr: readonly T[],
  kind: 'system' | 'tools',
): T[] {
  if (arr.length === 0) {
    // biome-ignore lint/suspicious/noConsole: empty prefix is almost always a caller bug, surface it
    console.warn(
      `[@concierge/llm] markLastForCaching: empty ${kind} array — no cache_control marker inserted. Likely caller bug.`,
    );
    return [];
  }
  const copy = arr.slice();
  const last = copy[copy.length - 1] as T;
  copy[copy.length - 1] = { ...last, cache_control: CACHE_EPHEMERAL } as T;
  return copy;
}

export function markSystemForCaching(blocks: readonly ContentBlock[]): ContentBlock[] {
  return markLastForCaching(blocks, 'system');
}

export function markToolsForCaching(tools: readonly Tool[]): Tool[] {
  return markLastForCaching(tools, 'tools');
}

export interface CacheablePrefix {
  readonly system?: ContentBlock[];
  readonly tools?: Tool[];
}

/**
 * Convenience wrapper marking BOTH system blocks AND tools in one call.
 * Returns a fresh object with shallow-copied arrays (deep-cloned trailing
 * blocks via `markLastForCaching`). Inputs are never mutated.
 *
 * Empty arrays are dropped from the result (rather than emitting `[]`) so
 * the caller can safely spread the return value directly into the SDK
 * request without leaking `tools: []` (which some SDK validation paths
 * reject).
 */
export function markPrefixForCaching(args: {
  system?: readonly ContentBlock[];
  tools?: readonly Tool[];
}): CacheablePrefix {
  const result: { system?: ContentBlock[]; tools?: Tool[] } = {};
  if (args.system !== undefined && args.system.length > 0) {
    result.system = markSystemForCaching(args.system);
  }
  if (args.tools !== undefined && args.tools.length > 0) {
    result.tools = markToolsForCaching(args.tools);
  }
  return result;
}
