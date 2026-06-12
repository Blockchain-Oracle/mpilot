import { ConciergeError } from '@concierge/sdk';
import { toTimestampPolicy } from '@zerodev/permissions/policies';

const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

/**
 * IMPORTANT — spec drift documented in PR description:
 *   Story-52 called this "TimeFramePolicy". ZeroDev's actual export is
 *   `toTimestampPolicy`. Behaviour is identical (validAfter + validUntil
 *   uint48 seconds) — we just wrap with friendlier defaults + non-zero
 *   validation. The "TimeFrame" naming is retained on our public surface
 *   to match the story spec.
 */
export interface CreateTimeFramePolicyConfig {
  /** Unix seconds — session key invalid AFTER this. Default = now + 7 days. */
  readonly validUntil?: number;
  /** Unix seconds — session key invalid BEFORE this. Default = now. */
  readonly validAfter?: number;
}

export function createTimeFramePolicy(
  config: CreateTimeFramePolicyConfig,
): ReturnType<typeof toTimestampPolicy> {
  const now = Math.floor(Date.now() / 1000);
  const validAfter = config.validAfter ?? now;
  const validUntil = config.validUntil ?? now + SEVEN_DAYS_SECONDS;
  if (validUntil === 0) {
    throw new ConciergeError(
      'ConfigError',
      '[@concierge/smart-account] createTimeFramePolicy: InvalidPolicy: validUntil=0 means "no expiry" — session keys must have a finite lifetime.',
    );
  }
  if (validUntil <= validAfter) {
    throw new ConciergeError(
      'ConfigError',
      `[@concierge/smart-account] createTimeFramePolicy: InvalidPolicy: validUntil (${validUntil}) must be > validAfter (${validAfter}).`,
    );
  }
  return toTimestampPolicy({ validAfter, validUntil });
}
