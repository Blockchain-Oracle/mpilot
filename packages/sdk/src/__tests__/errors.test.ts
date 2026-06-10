import { describe, expect, it } from 'vitest';
import { ConciergeError, type ConciergeErrorType } from '../errors.ts';

describe('ConciergeError (ADR-019)', () => {
  it('is an Error subclass with name "ConciergeError"', () => {
    const err = new ConciergeError('RpcError', 'rpc unreachable');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ConciergeError);
    expect(err.name).toBe('ConciergeError');
    expect(err.message).toBe('rpc unreachable');
  });

  it('carries the type discriminator for switch-based handling', () => {
    const err = new ConciergeError('EModeNotEnabled', 'enable E-Mode 1 before sUSDe borrow');
    expect(err.type).toBe('EModeNotEnabled');
  });

  it('preserves the cause when provided', () => {
    const cause = new Error('ECONNREFUSED');
    const err = new ConciergeError('RpcError', 'rpc unreachable', cause);
    expect(err.cause).toBe(cause);
  });

  it('cause is undefined when omitted', () => {
    expect(new ConciergeError('UserRejected', 'no goal set').cause).toBeUndefined();
  });

  it('constructs for every ADR-019 error type', () => {
    const types: ConciergeErrorType[] = [
      'EModeNotEnabled',
      'InsufficientLiquidity',
      'OracleUnavailable',
      'AttestationFailed',
      'UserRejected',
      'NetworkUnsupported',
      'RpcError',
    ];
    for (const type of types) {
      expect(new ConciergeError(type, type).type).toBe(type);
    }
  });
});
