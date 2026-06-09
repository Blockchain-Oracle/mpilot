// Convert a tool's schemas to OpenAPI 3 JSON Schema for OpenAI / Anthropic / MCP.
// Behavior on non-representable shapes:
//  - Refinements (.refine, .superRefine) are stripped silently — JSON Schema can't
//    represent them. Prefer expressible constraints (.regex, .min, .max, .email).
//  - .transform() / z.custom() / .pipe() throw at conversion time (neither silent
//    strip nor lossy round-trip is safe). The wrapper re-throws with tool name
//    + which schema (input vs output) for attribution.

import { z } from 'zod';
import type { ConciergeTool } from './types.ts';

function convert(
  schema: z.ZodTypeAny,
  toolName: string,
  field: 'inputSchema' | 'outputSchema',
): Record<string, unknown> {
  try {
    return z.toJSONSchema(schema, { target: 'openapi-3.0' }) as Record<string, unknown>;
  } catch (cause) {
    throw new Error(
      `[@concierge/tools] toJsonSchema: cannot convert ${field} for tool "${toolName}" — ${
        cause instanceof Error ? cause.message : String(cause)
      }. .transform() / z.custom() / .pipe() are not representable in JSON Schema.`,
      { cause },
    );
  }
}

export function toInputJsonSchema(tool: ConciergeTool): Record<string, unknown> {
  return convert(tool.inputSchema, tool.name, 'inputSchema');
}

export function toOutputJsonSchema(tool: ConciergeTool): Record<string, unknown> {
  return convert(tool.outputSchema, tool.name, 'outputSchema');
}

/** Canonical name per ADR-014 — alias of `toInputJsonSchema` for the common single-schema case. */
export const toJsonSchema = toInputJsonSchema;
