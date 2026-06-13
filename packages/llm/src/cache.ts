import type Anthropic from '@anthropic-ai/sdk';

/**
 * Type aliases for the SDK content/tool shapes we mutate. We avoid importing
 * the actual SDK types because they're awkward to narrow without pulling the
 * union; the function bodies are the type-narrowing.
 */
type ContentBlock = Anthropic.TextBlockParam;
type Tool = Anthropic.Tool;

const CACHE_EPHEMERAL = { type: 'ephemeral' as const };

/**
 * Inserts `cache_control: { type: 'ephemeral' }` on the LAST block of the
 * system-prompt array. Per Anthropic's caching contract, the marker breaks
 * the cache prefix at that boundary — every prior block (recursively) is
 * cached as the stable prefix.
 *
 * Mutates the input array in place AND returns it for fluent chaining. We
 * mutate because the typical caller is constructing a fresh array per tick;
 * structural sharing across ticks is not a goal.
 *
 * Silently returns the array unchanged when empty (no-op) — caching nothing
 * is the right default for a tick that has no stable prefix yet.
 */
export function markSystemForCaching(blocks: ContentBlock[]): ContentBlock[] {
  if (blocks.length === 0) return blocks;
  const last = blocks[blocks.length - 1];
  if (!last) return blocks;
  blocks[blocks.length - 1] = { ...last, cache_control: CACHE_EPHEMERAL };
  return blocks;
}

/**
 * Same pattern as `markSystemForCaching` but for the `tools` array. The
 * Anthropic cache treats tools + system prompt as ONE prefix when both are
 * present; marking the last tool extends the same cached prefix through to
 * the end of the tool schemas, which is exactly what tick callers want.
 */
export function markToolsForCaching(tools: Tool[]): Tool[] {
  if (tools.length === 0) return tools;
  const last = tools[tools.length - 1];
  if (!last) return tools;
  tools[tools.length - 1] = { ...last, cache_control: CACHE_EPHEMERAL };
  return tools;
}

/**
 * Convenience wrapper that marks BOTH system blocks AND tools in one call —
 * matches the typical tick-phase invocation pattern. Returns a tuple instead
 * of mutating its inputs so the caller can destructure into the SDK request
 * without re-shadowing.
 */
export function markPrefixForCaching(args: { system?: ContentBlock[]; tools?: Tool[] }): {
  system?: ContentBlock[];
  tools?: Tool[];
} {
  const result: { system?: ContentBlock[]; tools?: Tool[] } = {};
  if (args.system !== undefined) {
    result.system = markSystemForCaching([...args.system]);
  }
  if (args.tools !== undefined) {
    result.tools = markToolsForCaching([...args.tools]);
  }
  return result;
}
