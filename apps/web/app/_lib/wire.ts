/**
 * Wire schemas shared between client and server. Every `/api/*` route response
 * is defined here so the client's react-query callers + the server's route
 * handler import the same Zod schema. No duplicate string-literal contracts.
 */
import { z } from 'zod';

/** GET /api/agents/me — returns the authenticated user's agent, partial state if mid-wizard. */
export const agentMeResponseSchema = z.union([
  z.object({
    agent: z.null(),
  }),
  z.object({
    agent: z.object({
      id: z.string().uuid(),
      smartAccountAddress: z
        .string()
        .regex(/^0x[0-9a-fA-F]{40}$/)
        .nullable(),
      agentTokenId: z.string().nullable(), // bigint as decimal string (JSON-safe)
      ownerEoa: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
      goal: z.string().nullable(),
      status: z.enum(['onboarding', 'active', 'paused', 'stopped']),
      chain: z.enum(['mantle-mainnet', 'mantle-sepolia']),
      createdAt: z.string(),
    }),
  }),
]);

export type AgentMeResponse = z.infer<typeof agentMeResponseSchema>;

/** Standard error envelope every route returns on failure. */
export const errorResponseSchema = z.object({
  error: z.string(),
  // Optional machine-readable code — for the UI to switch on without parsing prose.
  code: z
    .enum([
      'unauthorized',
      'forbidden',
      'not_found',
      'bad_request',
      'rate_limited',
      'internal_error',
    ])
    .optional(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
