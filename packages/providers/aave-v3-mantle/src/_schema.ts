// Shared Zod primitives for action input schemas.
// Centralised here to avoid the unsafe `as z.ZodType<Address>` cast being duplicated per file.

import type { Address } from '@mpilot/shared';
import { z } from 'zod';

export const HEX_ADDRESS = z.string().regex(/^0x[0-9a-fA-F]{40}$/) as z.ZodType<Address>;

export const NON_ZERO_ADDRESS = HEX_ADDRESS.refine(
  (addr) => addr !== '0x0000000000000000000000000000000000000000',
  { message: 'address must not be the zero address' },
) as z.ZodType<Address>;

// Positive uint256 as a decimal string. Was `z.coerce.bigint()` — that
// rendered as JSON Schema "integer" which OpenAI strict-mode rejects with
// "BigInt cannot be represented in JSON Schema", killing every tool call
// that referenced the schema. Decimal string is JSON-native; consumers
// `BigInt(value)` at the EVM boundary.
export const POSITIVE_BIGINT = z
  .string()
  .regex(/^[1-9]\d*$/)
  .describe('Positive uint256 as a decimal string (e.g. "1000000" for 1 USDC)');

export const NON_NEG_INT_STR = z
  .string()
  .regex(/^\d+$/, 'must be a non-negative integer decimal string');
