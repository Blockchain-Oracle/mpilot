// Aggregate ConciergeTools from provider factories. Validates tool shape, dedups
// names across factories (TypeError with factory index on collision), runs chain-gate
// filter via supportsNetwork, wraps factory construction throws with cause.
// Per-tool generics intentionally erased; adapters dispatch by name at runtime.

import type { ConciergeAgentLike, ConciergeTool, ProviderToolFactory } from './types.ts';

// Duck-type a zod schema via its `_def.type` discriminant (zod 4 stable internal).
function isZodSchema(
  s: unknown,
): s is { _def: { type: string }; safeParse: (v: unknown) => unknown } {
  if (s === null || typeof s !== 'object') return false;
  const def = (s as { _def?: { type?: unknown } })._def;
  return (
    typeof def === 'object' &&
    def !== null &&
    typeof def.type === 'string' &&
    typeof (s as { safeParse?: unknown }).safeParse === 'function'
  );
}

function isZodObject(s: unknown): boolean {
  return isZodSchema(s) && s._def.type === 'object';
}

export function createConciergeTools(
  agent: ConciergeAgentLike,
  providerToolFactories: ReadonlyArray<ProviderToolFactory> = [],
): ReadonlyArray<ConciergeTool> {
  const out: ConciergeTool[] = [];
  const seen = new Map<string, number>();

  providerToolFactories.forEach((factory, idx) => {
    let produced: unknown;
    try {
      produced = factory(agent);
    } catch (cause) {
      throw new Error(
        `[@concierge/tools] factory at index ${idx} threw during construction: ${
          cause instanceof Error ? cause.message : String(cause)
        }`,
        { cause },
      );
    }
    // Detect async factories (Promise / thenable). ProviderToolFactory is sync;
    // an async factory would leak as a misleading "expected ConciergeTool[]" error
    // PLUS an unhandledRejection (process crash under --unhandled-rejections=throw).
    if (
      produced !== null &&
      typeof produced === 'object' &&
      typeof (produced as { then?: unknown }).then === 'function'
    ) {
      // Suppress the secondary unhandledRejection so users see only OUR error.
      (produced as Promise<unknown>).catch(() => {});
      throw new TypeError(
        `[@concierge/tools] factory at index ${idx} returned a Promise. ProviderToolFactory must be synchronous; await any async setup before calling createConciergeTools.`,
      );
    }
    if (!Array.isArray(produced)) {
      throw new TypeError(
        `[@concierge/tools] factory at index ${idx} returned ${typeof produced}, expected ConciergeTool[]`,
      );
    }

    for (const t of produced as ConciergeTool[]) {
      if (
        t === null ||
        typeof t !== 'object' ||
        typeof t.name !== 'string' ||
        t.name.length === 0 ||
        typeof t.description !== 'string' ||
        typeof t.invoke !== 'function'
      ) {
        throw new TypeError(
          `[@concierge/tools] factory at index ${idx} produced an invalid tool (missing/invalid name|description|invoke); got name=${JSON.stringify(t?.name)}`,
        );
      }
      if (!isZodSchema(t.inputSchema) || !isZodSchema(t.outputSchema)) {
        throw new TypeError(
          `[@concierge/tools] tool "${t.name}" inputSchema/outputSchema must be Zod schemas (got input=${typeof t.inputSchema}, output=${typeof t.outputSchema})`,
        );
      }
      if (!isZodObject(t.outputSchema)) {
        throw new TypeError(
          `[@concierge/tools] tool "${t.name}".outputSchema must be a z.ZodObject per ADR-017 (MCP structuredContent requires top-level object); wrap scalar returns in z.object({ value: ... })`,
        );
      }
      if (t.supportsNetwork !== undefined) {
        if (typeof t.supportsNetwork !== 'function') {
          throw new TypeError(
            `[@concierge/tools] tool "${t.name}".supportsNetwork must be a function, got ${typeof t.supportsNetwork}`,
          );
        }
        const verdict = t.supportsNetwork(agent.chainId);
        if (typeof verdict !== 'boolean') {
          throw new TypeError(
            `[@concierge/tools] ${t.name}.supportsNetwork must return boolean, got ${typeof verdict}`,
          );
        }
        if (!verdict) continue;
      }

      const prior = seen.get(t.name);
      if (prior !== undefined) {
        throw new Error(
          `[@concierge/tools] duplicate tool name "${t.name}" — registered by factory ${prior} and factory ${idx}`,
        );
      }
      seen.set(t.name, idx);
      out.push(t);
    }
  });

  return out;
}
