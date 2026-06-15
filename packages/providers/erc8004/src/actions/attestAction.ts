import { canonicalize } from '@mpilot/attestation';
import { ConciergeError } from '@mpilot/sdk';
import { reputationRegistryAbi } from '@mpilot/shared/abi';
import { tool } from '@mpilot/tools';
import {
  AbiEventSignatureEmptyTopicsError,
  AbiEventSignatureNotFoundError,
  ContractFunctionRevertedError,
  decodeEventLog,
  keccak256,
  toBytes,
} from 'viem';
import { z } from 'zod';
import type { ActionContext } from '../_context.ts';
import type { ReceiptLog } from '../_types.ts';

/**
 * Cross-package contract (Context7 audit C2, post-review):
 *
 * The envelope built below has the SAME shape as `FeedbackEnvelope` in
 * `@mpilot/attestation` ({v, schema, agentId, chainId, txHash?,
 * payload, createdAt}) so a verifier reading the on-chain feedbackHash and
 * fetching the IPFS-pinned bytes (produced by writeAttestation, which uses
 * `computeFeedbackPair`) gets a byte-identical preimage and a matching
 * keccak hash.
 *
 * We canonicalize + keccak DIRECTLY here (rather than calling
 * `computeFeedbackPair`) so that providers can attest under schema strings
 * that aren't yet in attestation/schema.ts's closed SchemaId discriminator
 * (e.g. `concierge.lifi.bridge.sent.v1`). The math contract holds with or
 * without the Zod check; missing schemas are a separate spec hygiene task.
 */
interface AttestEnvelope {
  readonly v: 1;
  readonly schema: string;
  readonly agentId: string;
  readonly chainId: number;
  readonly txHash?: `0x${string}`;
  readonly payload: { schema: string } & Record<string, unknown>;
  readonly createdAt: string;
}

export const AttestActionInput = z.object({
  agentId: z
    .string()
    .regex(/^\d+$/)
    .describe('Agent NFT token id (decimal string of uint256) from registerAgent'),
  providerSchema: z.string().min(1).describe('Schema name e.g. concierge.aave.v3.borrow.v1'),
  actionPayload: z
    .object({ schema: z.string() })
    .catchall(z.unknown())
    .describe('Full action payload — schema field must match providerSchema'),
  txHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/)
    .optional()
    .describe(
      'Tx hash of the on-chain action being attested about (NOT the giveFeedback tx). Included in the canonical envelope when provided.',
    ),
  createdAt: z
    .string()
    .datetime({ offset: false })
    .optional()
    .describe('UTC ISO-8601 timestamp (suffix Z). Defaults to now() if omitted.'),
});

export const AttestActionOutput = z.object({
  txHash: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/)
    .describe('Transaction hash'),
  feedbackIndex: z
    .string()
    .regex(/^\d+$/)
    .describe(
      'Index of the stored feedback entry in the ReputationRegistry (decimal string of uint256; JSON-safe)',
    ),
  feedbackHash: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/)
    .describe(
      'Canonical-JSON keccak256 hash committed on-chain as the tamper-evident payload commitment (per ADR-004 and Context7 audit C2 — replaces prior EIP-712 path that diverged from attestation/hash.ts)',
    ),
});

function scanForFeedbackIndex(
  logs: readonly ReceiptLog[],
  registryAddress: `0x${string}`,
): bigint | undefined {
  for (const log of logs) {
    if (log.removed === true) continue;
    if (log.address.toLowerCase() !== registryAddress.toLowerCase()) continue;
    try {
      return decodeEventLog({
        abi: reputationRegistryAbi,
        eventName: 'NewFeedback',
        // biome-ignore lint/suspicious/noExplicitAny: viem expects mutable tuple; readonly Hex[] is structurally identical
        topics: log.topics as any,
        data: log.data,
      }).args.feedbackIndex;
    } catch (err) {
      // Expected: registry log is not a NewFeedback event
      if (
        err instanceof AbiEventSignatureEmptyTopicsError ||
        err instanceof AbiEventSignatureNotFoundError
      )
        continue;
      throw new ConciergeError(
        'RpcError',
        '[@mpilot/erc8004] attestAction: unexpected error decoding ReputationRegistry log',
        err,
      );
    }
  }
  return undefined;
}

function assertAttestInputValid(
  ctx: ActionContext,
  input: z.infer<typeof AttestActionInput>,
): void {
  if (!ctx.walletClient) {
    throw new ConciergeError(
      'ConfigError',
      '[@mpilot/erc8004] attestAction: walletClient is required',
    );
  }
  if (input.actionPayload.schema !== input.providerSchema) {
    throw new ConciergeError(
      'ConfigError',
      `[@mpilot/erc8004] attestAction: actionPayload.schema ("${input.actionPayload.schema}") must match providerSchema ("${input.providerSchema}")`,
    );
  }
}

export async function executeAttestAction(
  ctx: ActionContext,
  input: z.infer<typeof AttestActionInput>,
): Promise<z.infer<typeof AttestActionOutput>> {
  assertAttestInputValid(ctx, input);

  // Context7 audit C2 + ADR-004 (post-review fix): the canonical attestation
  // hash MUST be `computeFeedbackPair(FeedbackEnvelope)` from
  // @mpilot/attestation — the SAME function writeAttestation uses
  // when it pins to IPFS. Earlier in this PR we canonicalized only
  // {schema, agentId, payload}; that produced a DIFFERENT preimage from the
  // 6-field FeedbackEnvelope ({v, schema, agentId, chainId, txHash?, payload,
  // createdAt}), so any verifier fetching the pinned bytes would re-keccak
  // them and observe a hash mismatch — the very ADR-004 failure mode the
  // audit aimed to close. Construct the full envelope here and reuse the
  // shared helper. computeFeedbackPair validates via Zod before hashing.
  const createdAt = input.createdAt ?? new Date().toISOString();
  // silent-failure CRITICAL-1: assertAttestInputValid already requires
  // actionPayload.schema === providerSchema, but defense-in-depth — overwrite
  // payload.schema with providerSchema here so the envelope can never embed
  // two divergent schema strings even if a future caller bypasses the asserter.
  const envelope: AttestEnvelope = {
    v: 1,
    schema: input.providerSchema,
    agentId: input.agentId.toString(),
    chainId: ctx.chainId,
    // Zod regex guarantees 0x-prefixed 32-byte hex at runtime; cast for the branded type.
    ...(input.txHash !== undefined ? { txHash: input.txHash as `0x${string}` } : {}),
    payload: { ...input.actionPayload, schema: input.providerSchema },
    createdAt,
  };
  // silent-failure CRITICAL-2: canonicalize JSON-stringifies; BigInt / Date /
  // Map / Set / undefined / circular refs in payload throw TypeError. Surface
  // as a typed ConfigError so callers get an actionable message instead of an
  // unwrapped TypeError bubbling to the SDK boundary.
  let feedbackHash: `0x${string}`;
  try {
    feedbackHash = keccak256(toBytes(canonicalize(envelope)));
  } catch (err) {
    throw new ConciergeError(
      'ConfigError',
      '[@mpilot/erc8004] attestAction: failed to canonicalize envelope — actionPayload likely contains a non-JSON-serialisable value (BigInt/Date/Map/Set/undefined/circular ref). Pre-serialise BigInts to strings before calling.',
      err,
    );
  }

  let txHash: `0x${string}`;
  try {
    // biome-ignore lint/suspicious/noExplicitAny: writeContract overloads vary by account/chain binding
    txHash = await (ctx.walletClient as any).writeContract({
      address: ctx.reputationRegistry,
      abi: reputationRegistryAbi,
      functionName: 'giveFeedback',
      // input.agentId is now a decimal string (JSON-serializable). Convert at
      // the EVM boundary — uint256 args need bigint.
      args: [
        BigInt(input.agentId),
        1n,
        0,
        'concierge.action',
        input.providerSchema,
        '',
        '',
        feedbackHash,
      ],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Walk the viem error chain to find the decoded revert. ContractFunctionRevertedError.data
    // carries the ABI-decoded errorName — stable across viem formatting changes, unlike .message.
    // ERC721NonexistentToken bubbles from IdentityRegistry.ownerOf when the agentId NFT is absent.
    const revertedErr =
      err instanceof ContractFunctionRevertedError
        ? err
        : (err as { walk?: (fn: (e: unknown) => boolean) => unknown } | null)?.walk?.(
            (e) => e instanceof ContractFunctionRevertedError,
          );
    const errorName = (revertedErr as ContractFunctionRevertedError | null)?.data?.errorName;
    const reason =
      errorName === 'AgentNotFound' || errorName === 'ERC721NonexistentToken'
        ? 'AgentNotFound'
        : 'TxFailed';
    throw new ConciergeError(
      'AttestationFailed',
      `[@mpilot/erc8004] attestAction: giveFeedback reverted — ${msg}`,
      err,
      { reason, agentId: input.agentId },
    );
  }

  const receipt = await ctx.publicClient
    .waitForTransactionReceipt({ hash: txHash })
    .catch((err: unknown) => {
      throw new ConciergeError(
        'RpcError',
        `[@mpilot/erc8004] attestAction: waitForTransactionReceipt failed for ${txHash}`,
        err,
      );
    });

  if (receipt.status === 'reverted') {
    throw new ConciergeError(
      'AttestationFailed',
      `[@mpilot/erc8004] attestAction: transaction reverted — ${txHash}`,
      undefined,
      { agentId: input.agentId },
    );
  }

  const feedbackIndex = scanForFeedbackIndex(receipt.logs, ctx.reputationRegistry);
  if (feedbackIndex === undefined) {
    throw new ConciergeError(
      'RpcError',
      `[@mpilot/erc8004] attestAction: no NewFeedback event found in receipt ${txHash}`,
    );
  }
  return { txHash, feedbackIndex: feedbackIndex.toString(), feedbackHash };
}

export function createAttestActionTool(ctx: ActionContext) {
  return tool({
    name: 'attestAction',
    description:
      'Records an on-chain reputation attestation for a completed agent action by calling ' +
      'ReputationRegistry.giveFeedback(). The feedbackHash is keccak256(canonical-JSON) over the canonical FeedbackEnvelope (matches writeAttestation IPFS-pinned bytes per ADR-004). ' +
      'action payload. Per ADR-004: every Mainnet execute() MUST be followed by this call.',
    inputSchema: AttestActionInput,
    outputSchema: AttestActionOutput,
    supportsNetwork: () => true,
    invoke: (input) => executeAttestAction(ctx, input),
  });
}
