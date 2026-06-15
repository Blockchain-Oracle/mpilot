// Zod primitives for the wallet provider. Addresses/amounts cross the JSON
// Schema boundary as strings (no bigint in schemas — ADR-014 + the
// no-bigint-in-schemas guard in @mpilot/tools).

import type { Address } from '@mpilot/shared';
import { z } from 'zod';

export const HEX_ADDRESS = z.string().regex(/^0x[0-9a-fA-F]{40}$/) as z.ZodType<Address>;

export const NON_ZERO_ADDRESS = HEX_ADDRESS.refine(
  (addr) => addr !== '0x0000000000000000000000000000000000000000',
  { message: 'address must not be the zero address' },
) as z.ZodType<Address>;

/** Positive integer base-units (wei / token units) as a decimal string. */
export const POSITIVE_AMOUNT = z
  .string()
  .regex(/^[1-9]\d*$/, 'amount must be a positive integer string of base units (no decimals)');

/** Non-negative integer base-units (balances may be 0). */
export const NON_NEG_AMOUNT = z.string().regex(/^\d+$/, 'must be a non-negative integer string');

export const HEX32 = z.string().regex(/^0x[0-9a-fA-F]{64}$/, 'must be a 32-byte hex hash');

export const HEX_DATA = z.string().regex(/^0x[0-9a-fA-F]*$/, 'must be 0x-prefixed hex calldata');

/**
 * Unsigned-transaction preview returned by every write tool in `propose` mode.
 * Shape is a superset of `SerializableProposalCardSchema.txPreview` (to/value/
 * data) plus the chainId + a human summary so the chat client can render a
 * proposal card and hand {to,value,data} straight to wagmi `useSendTransaction`.
 */
export const TX_PROPOSAL = z.object({
  kind: z.literal('proposal'),
  to: HEX_ADDRESS.describe('Transaction target address'),
  value: NON_NEG_AMOUNT.describe('Native value in wei (decimal string)'),
  data: HEX_DATA.describe('ABI-encoded calldata (0x for plain native transfer)'),
  chainId: z.number().int().describe('EVM chain id the proposal targets'),
  summary: z.string().min(1).describe('Human-readable description of the proposal'),
});
export type TxProposal = z.infer<typeof TX_PROPOSAL>;
