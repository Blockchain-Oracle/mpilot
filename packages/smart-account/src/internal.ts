import { ConciergeError } from '@concierge/sdk';
import { CHAIN_CONFIGS } from './constants.ts';
import type { SupportedChain } from './types.ts';

const MAX_CAUSE_DEPTH = 10;

function buildPatterns(apiKey: string): readonly string[] {
  const encoded = encodeURIComponent(apiKey);
  return apiKey === encoded ? [apiKey] : [apiKey, encoded];
}

function redactString(value: string, patterns: readonly string[]): string {
  let out = value;
  for (const p of patterns) out = out.replaceAll(p, '[REDACTED]');
  return out;
}

function stringContainsAny(value: string, patterns: readonly string[]): boolean {
  for (const p of patterns) if (value.includes(p)) return true;
  return false;
}

function sanitizeStringProps(target: object, src: object, patterns: readonly string[]): void {
  for (const key of Object.getOwnPropertyNames(src)) {
    if (key === 'message' || key === 'stack' || key === 'cause') continue;
    // biome-ignore lint/suspicious/noExplicitAny: walking unknown SDK error shapes
    const value = (src as any)[key];
    if (typeof value === 'string' && stringContainsAny(value, patterns)) {
      // biome-ignore lint/suspicious/noExplicitAny: target is the clone receiving redacted value
      (target as any)[key] = redactString(value, patterns);
    } else if (
      Array.isArray(value) &&
      value.every((v) => typeof v === 'string') &&
      value.some((v) => stringContainsAny(v, patterns))
    ) {
      // biome-ignore lint/suspicious/noExplicitAny: redacting string[] in place on clone
      (target as any)[key] = value.map((v: string) => redactString(v, patterns));
    }
  }
}

function errorContainsAny(err: Error, patterns: readonly string[]): boolean {
  if (stringContainsAny(err.message, patterns)) return true;
  if (err.stack && stringContainsAny(err.stack, patterns)) return true;
  for (const key of Object.getOwnPropertyNames(err)) {
    if (key === 'message' || key === 'stack' || key === 'cause') continue;
    // biome-ignore lint/suspicious/noExplicitAny: walking unknown SDK error shapes
    const value = (err as any)[key];
    if (typeof value === 'string' && stringContainsAny(value, patterns)) return true;
    if (
      Array.isArray(value) &&
      value.some((v) => typeof v === 'string' && stringContainsAny(v, patterns))
    ) {
      return true;
    }
  }
  return false;
}

function valueContainsAnyDeep(
  v: unknown,
  patterns: readonly string[],
  seen: WeakSet<object>,
  depth: number,
): boolean {
  if (depth > MAX_CAUSE_DEPTH) return false;
  if (typeof v === 'string') return stringContainsAny(v, patterns);
  if (!(v instanceof Error)) return false;
  if (seen.has(v)) return false;
  seen.add(v);
  if (errorContainsAny(v, patterns)) return true;
  if (v.cause !== undefined && valueContainsAnyDeep(v.cause, patterns, seen, depth + 1))
    return true;
  if (v instanceof AggregateError && Array.isArray(v.errors)) {
    for (const e of v.errors) {
      if (valueContainsAnyDeep(e, patterns, seen, depth + 1)) return true;
    }
  }
  return false;
}

function sanitizeErrorDeep(
  err: Error,
  patterns: readonly string[],
  seen: WeakSet<object>,
  depth: number,
): Error {
  if (seen.has(err) || depth > MAX_CAUSE_DEPTH) return err;
  seen.add(err);
  const clone = Object.create(Object.getPrototypeOf(err)) as Error;
  Object.assign(clone, err);
  for (const key of Object.getOwnPropertyNames(err)) {
    if (key === 'message' || key === 'stack') continue;
    if (!Object.hasOwn(clone, key)) {
      const descriptor = Object.getOwnPropertyDescriptor(err, key);
      if (descriptor) Object.defineProperty(clone, key, descriptor);
    }
  }
  sanitizeStringProps(clone, err, patterns);
  Object.defineProperty(clone, 'message', {
    value: redactString(err.message, patterns),
    configurable: true,
    writable: true,
    enumerable: false,
  });
  if (err.stack) {
    Object.defineProperty(clone, 'stack', {
      value: redactString(err.stack, patterns),
      writable: true,
      enumerable: false,
      configurable: true,
    });
  }
  if (err.cause !== undefined) {
    // biome-ignore lint/suspicious/noExplicitAny: cause is readonly unknown on Error; assigning sanitized form
    (clone as any).cause = sanitizeValue(err.cause, patterns, seen, depth + 1);
  }
  if (err instanceof AggregateError && Array.isArray(err.errors)) {
    // biome-ignore lint/suspicious/noExplicitAny: AggregateError.errors is non-enumerable own
    (clone as any).errors = err.errors.map((e: unknown) =>
      sanitizeValue(e, patterns, seen, depth + 1),
    );
  }
  return clone;
}

function sanitizeValue(
  err: unknown,
  patterns: readonly string[],
  seen: WeakSet<object>,
  depth: number,
): unknown {
  if (typeof err === 'string') {
    return stringContainsAny(err, patterns) ? redactString(err, patterns) : err;
  }
  if (err instanceof Error) {
    if (!valueContainsAnyDeep(err, patterns, new WeakSet(), 0)) return err;
    return sanitizeErrorDeep(err, patterns, seen, depth);
  }
  return err;
}

/**
 * Redacts apiKey (and its `encodeURIComponent` form) from an error's message, stack,
 * own string properties (viem's `shortMessage` / `details` / `metaMessages[]`), and
 * the full `.cause` chain — while preserving prototype identity. Returns a clone when
 * redaction fires; otherwise returns the input by reference.
 *
 * Does NOT preserve reference identity on the redaction path — callers MUST NOT rely
 * on `sanitizeCause(e, k) === e`. Cycle-safe via WeakSet; depth-capped at 10.
 *
 * Skips redaction when apiKey is empty to avoid `replaceAll('', '[REDACTED]')`.
 */
export function sanitizeCause<T>(err: T, apiKey: string): T {
  if (!apiKey) return err;
  return sanitizeValue(err, buildPatterns(apiKey), new WeakSet(), 0) as T;
}

/**
 * Returns a .catch() callback that wraps any rejection as a sanitised RpcError.
 * `apiKey` is REQUIRED — use `rpcCatchNoRedact` for the rare op that has no secret in scope.
 * Note: catches ALL rejections including programmer errors (TypeError, RangeError) —
 * always inspect `.cause` when debugging unexpected RpcErrors.
 */
export function rpcCatch(op: string, chain: SupportedChain, apiKey: string) {
  return (err: unknown): never => {
    throw new ConciergeError(
      'RpcError',
      `[@concierge/smart-account] ${op} (chain: '${chain}')`,
      sanitizeCause(err, apiKey),
    );
  };
}

/**
 * Variant of rpcCatch for ops where no apiKey is in scope (no transport URL embedded).
 * Use sparingly — every call site is an audit checkpoint.
 */
export function rpcCatchNoRedact(op: string, chain: SupportedChain) {
  return (err: unknown): never => {
    throw new ConciergeError(
      'RpcError',
      `[@concierge/smart-account] ${op} (chain: '${chain}')`,
      err,
    );
  };
}

/** Validates chain + apiKey and returns the resolved config bundle. */
export function resolveChainConfig(
  callerName: string,
  chain: SupportedChain,
  apiKey: string | undefined,
): {
  chainConfig: (typeof CHAIN_CONFIGS)[keyof typeof CHAIN_CONFIGS];
  apiKey: string;
  bundlerUrl: string;
} {
  const chainConfig = CHAIN_CONFIGS[chain];
  if (!chainConfig) {
    throw new ConciergeError(
      'ConfigError',
      `[@concierge/smart-account] ${callerName}: UnsupportedChain('${chain}') — supported: ${Object.keys(CHAIN_CONFIGS).join(', ')}`,
    );
  }
  if (!apiKey) {
    throw new ConciergeError(
      'ConfigError',
      `[@concierge/smart-account] ${callerName}: MissingEnvVar('PIMLICO_API_KEY') — set this env var or pass apiKey in config.`,
    );
  }
  return {
    chainConfig,
    apiKey,
    bundlerUrl: `${chainConfig.bundlerBaseUrl}?apikey=${encodeURIComponent(apiKey)}`,
  };
}
