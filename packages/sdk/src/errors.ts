/**
 * Discriminator values for every error the Concierge SDK surfaces, per
 * ADR-019. `EModeNotEnabled` exists because Aave's `Pool.borrow()` returns 0
 * SILENTLY for sUSDe collateral outside E-Mode 1 — the SDK turns that silent
 * failure into a loud, typed one.
 */
export type ConciergeErrorType =
  | 'EModeNotEnabled'
  | 'InsufficientLiquidity'
  | 'OracleUnavailable'
  | 'AttestationFailed'
  | 'UserRejected'
  | 'NetworkUnsupported'
  | 'RpcError';

/**
 * Single error base class with a `type` discriminator (the Stripe
 * `err.type` + Anthropic status-class blend, per ADR-019 / SDK-DX-STUDY §F):
 * `instanceof ConciergeError` to detect, `switch (err.type)` to handle.
 * `cause` carries the underlying error (e.g. the viem revert) untouched.
 */
export class ConciergeError extends Error {
  override readonly name = 'ConciergeError';

  constructor(
    public readonly type: ConciergeErrorType,
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
  }
}
