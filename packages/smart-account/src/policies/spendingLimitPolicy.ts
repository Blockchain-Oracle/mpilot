import { ConciergeError } from '@concierge/sdk';
import {
  type CallPolicyParams,
  CallPolicyVersion,
  ParamCondition,
  toCallPolicy,
} from '@zerodev/permissions/policies';
import type { Address, Hex } from 'viem';
import { isAddress, pad, toHex } from 'viem';

/**
 * Enforces a per-tx cap on the ERC-20 `transfer(to, amount)` amount parameter via
 * ZeroDev's CallPolicy + ParamCondition.LESS_THAN_OR_EQUAL.
 *
 * IMPORTANT — spec drift documented in PR description:
 *   Story-52 originally described a "24h rolling daily limit". ZeroDev's session-key
 *   primitive does NOT support rolling-window value caps — only per-tx caps via
 *   CallPolicy rules, or per-interval *count* caps via RateLimitPolicy. "Daily"
 *   semantics live off-chain at session-key issuance time: tomorrow's issuance
 *   creates a new session key with a fresh per-tx allowance.
 */
export interface CreateSpendingLimitPolicyConfig {
  /** ERC-20 token contract the cap applies to. */
  readonly token: Address;
  /** Maximum amount (in token's smallest unit) any single transfer may carry. */
  readonly maxAmountPerTx: bigint;
}

/** keccak256("transfer(address,uint256)")[:4] */
const ERC20_TRANSFER_SELECTOR = '0xa9059cbb' as Hex;

export function createSpendingLimitPolicy(
  config: CreateSpendingLimitPolicyConfig,
): ReturnType<typeof toCallPolicy> {
  if (!isAddress(config.token)) {
    throw new ConciergeError(
      'ConfigError',
      `[@concierge/smart-account] createSpendingLimitPolicy: InvalidPolicy: token is not a valid address: '${config.token}'`,
    );
  }
  if (config.maxAmountPerTx <= 0n) {
    throw new ConciergeError(
      'ConfigError',
      `[@concierge/smart-account] createSpendingLimitPolicy: InvalidPolicy: maxAmountPerTx must be > 0, got ${config.maxAmountPerTx}`,
    );
  }
  // ERC-20 transfer(to, amount) layout: selector (4) + to (32) + amount (32).
  // Rules apply to calldata AFTER the selector → amount lives at offset 32.
  const params: CallPolicyParams = {
    policyVersion: CallPolicyVersion.V0_0_5,
    permissions: [
      {
        target: config.token,
        selector: ERC20_TRANSFER_SELECTOR,
        rules: [
          {
            condition: ParamCondition.LESS_THAN_OR_EQUAL,
            offset: 32,
            params: [pad(toHex(config.maxAmountPerTx), { size: 32 })],
          },
        ],
      },
    ],
  };
  return toCallPolicy(params);
}
