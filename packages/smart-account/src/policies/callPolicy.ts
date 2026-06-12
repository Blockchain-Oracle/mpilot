import { ConciergeError } from '@concierge/sdk';
import {
  type CallPolicyParams,
  CallPolicyVersion,
  toCallPolicy,
} from '@zerodev/permissions/policies';
import type { Address, Hex } from 'viem';
import { isAddress } from 'viem';

/**
 * A single call-policy entry binding a target contract to (optionally) a function
 * selector. Mirrors ZeroDev's manual-permission shape — pass an ABI + functionName
 * to get auto-encoded rules via the upstream toCallPolicy.
 */
export interface CallPermission {
  readonly target: Address;
  readonly selector?: Hex;
}

export interface CreateCallPolicyConfig {
  /** One entry per (contract, function) allowance. Must contain at least one entry. */
  readonly permissions: readonly CallPermission[];
}

const SELECTOR_REGEX = /^0x[0-9a-fA-F]{8}$/;

/**
 * Validates inputs strictly then returns a ZeroDev Policy from `toCallPolicy`.
 * Bad input throws `ConciergeError('ConfigError', 'InvalidPolicy: ...')` at
 * composition time — never silently permissive (CLAUDE.md non-negotiable).
 */
export function createCallPolicy(config: CreateCallPolicyConfig): ReturnType<typeof toCallPolicy> {
  if (config.permissions.length === 0) {
    throw new ConciergeError(
      'ConfigError',
      '[@concierge/smart-account] createCallPolicy: InvalidPolicy: permissions must contain at least one entry — an empty call policy would deny all calls.',
    );
  }
  for (let i = 0; i < config.permissions.length; i++) {
    const perm = config.permissions[i];
    if (!perm) continue;
    if (!isAddress(perm.target)) {
      throw new ConciergeError(
        'ConfigError',
        `[@concierge/smart-account] createCallPolicy: InvalidPolicy: permissions[${i}].target is not a valid address: '${perm.target}'`,
      );
    }
    if (perm.selector !== undefined && !SELECTOR_REGEX.test(perm.selector)) {
      throw new ConciergeError(
        'ConfigError',
        `[@concierge/smart-account] createCallPolicy: InvalidPolicy: permissions[${i}].selector is not a 4-byte hex string (expected 0x-prefixed 8 hex chars): '${perm.selector}'`,
      );
    }
  }
  const params: CallPolicyParams = {
    policyVersion: CallPolicyVersion.V0_0_5,
    permissions: config.permissions.map((p) => ({
      target: p.target,
      ...(p.selector !== undefined && { selector: p.selector }),
    })),
  };
  return toCallPolicy(params);
}
