import { ConciergeError } from '@mpilot/sdk';

/**
 * Boundary BigInt parse. The Zod `BigIntString` schema already constrains
 * input to `^\d{1,78}$`, so `BigInt(value)` cannot throw in the normal
 * MCP path. This wrapper exists to harden the rare case where a caller
 * invokes a tool's `invoke()` directly (bypassing MCP's pre-validation)
 * with a malformed string — surfaces a typed `ConfigError` instead of
 * an opaque `SyntaxError: Cannot convert ... to a BigInt`.
 */
export function safeBigInt(value: string, fieldName: string): bigint {
  try {
    return BigInt(value);
  } catch (cause) {
    throw new ConciergeError(
      'ConfigError',
      `[@mpilot/mcp] ${fieldName}: invalid decimal-string input "${value.slice(0, 32)}" — expected /^\\d{1,78}$/`,
      { cause },
    );
  }
}
