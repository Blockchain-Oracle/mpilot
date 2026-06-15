import type { ConciergeTool } from '@mpilot/tools';

/**
 * Return a shallow clone of `t` with its `name` prefixed (`<prefix>_<name>`).
 *
 * The tool registry (`createConciergeTools`) and every adapter key tools by
 * `t.name` and THROW on a duplicate name. Several providers expose the same
 * bare action name (`getYieldRate` ×3, `getBalance` ×2, `quote` ×2), so
 * assembling them unprefixed would throw at registration. Prefixing per
 * provider keeps every tool name unique and reads clearly to the model
 * (`dex_quote` vs `lifi_quote`).
 */
export function namespaceTool(
  prefix: string,
  // biome-ignore lint/suspicious/noExplicitAny: tools are erased at the registry boundary (ProviderToolFactory).
  t: ConciergeTool<any, any>,
  // biome-ignore lint/suspicious/noExplicitAny: see above.
): ConciergeTool<any, any> {
  return { ...t, name: `${prefix}_${t.name}` };
}
