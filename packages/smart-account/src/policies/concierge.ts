import { ConciergeError } from '@concierge/sdk';
import type { toCallPolicy, toTimestampPolicy } from '@zerodev/permissions/policies';
import type { Address } from 'viem';
import { type CallPermission, createCallPolicy } from './callPolicy.ts';
import {
  type CreateSpendingLimitPolicyConfig,
  createSpendingLimitPolicy,
} from './spendingLimitPolicy.ts';
import { createTimeFramePolicy } from './timeFramePolicy.ts';

/**
 * Shape contract providers (story-32, story-40, …) export under
 * `provider.sessionKey.callPolicy`. Source of truth for which contracts +
 * functions the provider's tools touch — composed here into the agent's
 * session-key policy bundle.
 */
export interface ProviderSessionKeyShape {
  readonly sessionKey: { readonly callPolicy: { readonly permissions: readonly CallPermission[] } };
}

export interface CreateConciergePolicyConfig {
  /** Providers whose sessionKey.callPolicy.permissions get unioned. */
  readonly providers: readonly ProviderSessionKeyShape[];
  /** One entry per ERC-20 token the agent may move funds in. */
  readonly spendingLimits: readonly CreateSpendingLimitPolicyConfig[];
  /** Unix seconds. Defaults to now + 7 days via createTimeFramePolicy. */
  readonly validUntil?: number;
  /** Unix seconds. Defaults to now via createTimeFramePolicy. */
  readonly validAfter?: number;
}

type Policy = ReturnType<typeof toCallPolicy> | ReturnType<typeof toTimestampPolicy>;

function dedupePermissions(perms: readonly CallPermission[]): CallPermission[] {
  const seen = new Set<string>();
  const out: CallPermission[] = [];
  for (const p of perms) {
    const key = `${(p.target as Address).toLowerCase()}::${p.selector ?? '*'}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

/**
 * Composes per-provider call policies + per-token spending caps + a time-frame
 * window into a single Policy[] suitable for `toPermissionValidator({ policies })`.
 *
 * Single public face for clients (web app, agent runtime). Bad inputs throw
 * `ConciergeError('ConfigError', 'InvalidPolicy: ...')` — never silently
 * produces a permissive policy.
 */
export function createConciergePolicy(config: CreateConciergePolicyConfig): readonly Policy[] {
  if (config.providers.length === 0) {
    throw new ConciergeError(
      'ConfigError',
      '[@concierge/smart-account] createConciergePolicy: InvalidPolicy: at least one provider required — empty policy bundle would issue an unconstrained session key.',
    );
  }
  const merged = dedupePermissions(
    config.providers.flatMap((p) => p.sessionKey.callPolicy.permissions),
  );
  const policies: Policy[] = [createCallPolicy({ permissions: merged })];
  for (const limit of config.spendingLimits) {
    policies.push(createSpendingLimitPolicy(limit));
  }
  policies.push(
    createTimeFramePolicy({
      ...(config.validUntil !== undefined && { validUntil: config.validUntil }),
      ...(config.validAfter !== undefined && { validAfter: config.validAfter }),
    }),
  );
  return policies;
}
