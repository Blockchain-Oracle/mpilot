// JSON.stringify with bigint → decimal-string, Map → object, Set → array. Native
// JSON.stringify already throws on circular refs; we wrap with a tool-context error.
// Shared-reference DAGs serialize normally. Spec-defined nested drops (Symbol-keyed,
// function-valued, undefined-valued props) are NOT recovered — `:string` contract
// applies to TOP-LEVEL only; nested drops follow JSON.stringify spec.

export function bigintSafeStringify(value: unknown, space?: number | string): string {
  // Reject every top-level value where JSON.stringify returns the value `undefined`
  // (violates the `: string` return contract). Symbol, function, undefined, and
  // Promise all hit this trap. Promise.then check is duck-typed so thenables also
  // catch.
  if (
    value === undefined ||
    typeof value === 'function' ||
    typeof value === 'symbol' ||
    (value !== null &&
      typeof value === 'object' &&
      typeof (value as { then?: unknown }).then === 'function')
  ) {
    throw new TypeError(
      `[@concierge/tools] bigintSafeStringify: top-level ${typeof value === 'object' ? 'thenable/Promise' : typeof value} is not serializable (violates :string contract)`,
    );
  }

  let result: string | undefined;
  try {
    result = JSON.stringify(
      value,
      (_key, v) => {
        if (typeof v === 'bigint') return v.toString();
        if (v instanceof Map) return Object.fromEntries(v);
        if (v instanceof Set) return Array.from(v);
        return v;
      },
      space,
    );
  } catch (cause) {
    // Native JSON.stringify throws TypeError("Converting circular structure to JSON")
    // on cycles; everything else surfaces as a regular error. Decorate either way.
    const msg = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`[@concierge/tools] bigintSafeStringify: ${msg}`, { cause });
  }
  // Post-stringify guard: spec says replacer-returning-undefined at top level yields
  // undefined. Defense-in-depth for any future replacer change that breaks the contract.
  if (typeof result !== 'string') {
    throw new TypeError(
      `[@concierge/tools] bigintSafeStringify: JSON.stringify returned non-string (${typeof result})`,
    );
  }
  return result;
}
