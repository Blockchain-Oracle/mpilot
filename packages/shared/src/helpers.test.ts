// Helper-function tests: addressesFor, chainFor, assertNumericChainId, AgentId constructors.
//
// Covers reviewer findings C1 (multicall3 assertion on Sepolia + Mainnet),
// C2 (input-type validation), C4 (AgentId as branded bigint w/ hex round-trip).

import { describe, expect, it } from 'vitest';
import {
  ADDRESSES,
  addressesFor,
  agentId,
  agentIdFromHex,
  agentIdToHex,
  assertNumericChainId,
  chainFor,
  isAgentId,
  mantleMainnet,
  mantleSepolia,
} from './index.ts';

describe('addressesFor', () => {
  it('returns Mainnet block on 5000', () => {
    expect(addressesFor(5000)).toBe(ADDRESSES.mantleMainnet);
  });

  it('returns Sepolia block on 5003', () => {
    expect(addressesFor(5003)).toBe(ADDRESSES.mantleSepolia);
  });

  it('throws TypeError on string chainId (env / JSON trap)', () => {
    expect(() => addressesFor('5000' as unknown as 5000)).toThrow(TypeError);
    expect(() => addressesFor('5000' as unknown as 5000)).toThrow(/must be number/);
  });

  it('throws TypeError on bigint chainId', () => {
    expect(() => addressesFor(5000n as unknown as 5000)).toThrow(TypeError);
  });

  it('throws on unknown numeric chain id', () => {
    expect(() => addressesFor(9999 as unknown as 5000)).toThrow(/unsupported Mantle chain id 9999/);
    expect(() => addressesFor(0 as unknown as 5000)).toThrow(/unsupported Mantle chain id 0/);
  });
});

describe('chainFor', () => {
  it('returns viem mantle mainnet on 5000', () => {
    expect(chainFor(5000)).toBe(mantleMainnet);
    expect(chainFor(5000).id).toBe(5000);
  });

  it('returns Mantle Sepolia config on 5003 (testnet=true)', () => {
    expect(chainFor(5003)).toBe(mantleSepolia);
    expect(chainFor(5003).id).toBe(5003);
    expect(chainFor(5003).testnet).toBe(true);
  });

  it('throws TypeError on string chainId', () => {
    expect(() => chainFor('5003' as unknown as 5003)).toThrow(TypeError);
  });

  it('throws on unknown chain id', () => {
    expect(() => chainFor(9999 as unknown as 5000)).toThrow(/unsupported Mantle chain id 9999/);
  });

  it('Mantle Sepolia chain has multicall3 contract (C1: silent-failure guard)', () => {
    // Verified live via cast call 2026-06-09; see chains.ts header.
    // Without this, publicClient.multicall() silently degrades on Sepolia only.
    expect(mantleSepolia.contracts?.multicall3?.address).toBe(
      '0xcA11bde05977b3631167028862bE2a173976CA11',
    );
  });

  it('Mantle Mainnet chain has multicall3 contract (symmetric)', () => {
    expect(mantleMainnet.contracts?.multicall3?.address).toBeDefined();
  });
});

describe('assertNumericChainId', () => {
  it('accepts integer numbers', () => {
    expect(() => assertNumericChainId(5000, 'test')).not.toThrow();
    expect(() => assertNumericChainId(5003, 'test')).not.toThrow();
  });

  it('throws on float, string, bigint, null, undefined', () => {
    expect(() => assertNumericChainId(5000.5, 'test')).toThrow(TypeError);
    expect(() => assertNumericChainId('5000', 'test')).toThrow(TypeError);
    expect(() => assertNumericChainId(5000n, 'test')).toThrow(TypeError);
    expect(() => assertNumericChainId(null, 'test')).toThrow(TypeError);
    expect(() => assertNumericChainId(undefined, 'test')).toThrow(TypeError);
  });
});

describe('AgentId (branded bigint per ERC-8004 uint256 tokenId)', () => {
  // Synthetic test fixture — recognizable pattern, low entropy (gitleaks-safe).
  const SAMPLE_TOKEN_ID = 0xdeadbeefn;
  const SAMPLE_HEX = '0x00000000000000000000000000000000000000000000000000000000deadbeef';

  it('agentId() accepts a valid bigint and round-trips', () => {
    expect(agentId(SAMPLE_TOKEN_ID)).toBe(SAMPLE_TOKEN_ID);
  });

  it('agentId() accepts zero (ERC-721 collections may start at 0)', () => {
    expect(() => agentId(0n)).not.toThrow();
  });

  it('agentId() rejects negative bigints', () => {
    expect(() => agentId(-1n)).toThrow(RangeError);
    expect(() => agentId(-1n)).toThrow(/must be non-negative/);
  });

  it('agentId() rejects values >= 2^256 (uint256 overflow)', () => {
    expect(() => agentId(2n ** 256n)).toThrow(RangeError);
    expect(() => agentId(2n ** 256n)).toThrow(/exceeds uint256/);
  });

  it('agentId() rejects non-bigint inputs (number, string)', () => {
    expect(() => agentId(123 as unknown as bigint)).toThrow(TypeError);
    expect(() => agentId('123' as unknown as bigint)).toThrow(TypeError);
  });

  it('agentIdFromHex() parses a 0x-prefixed hex into an AgentId', () => {
    expect(agentIdFromHex(SAMPLE_HEX)).toBe(SAMPLE_TOKEN_ID);
  });

  it('agentIdToHex() emits canonical uint256-padded hex (64 hex chars)', () => {
    const id = agentId(SAMPLE_TOKEN_ID);
    const hex = agentIdToHex(id);
    expect(hex).toBe(SAMPLE_HEX);
    expect(hex).toHaveLength(66);
  });

  it('hex → id → hex is a stable round-trip', () => {
    const id = agentIdFromHex(SAMPLE_HEX);
    expect(agentIdToHex(id)).toBe(SAMPLE_HEX);
  });

  it('isAgentId() returns true for valid + false for out-of-range (no throw)', () => {
    expect(isAgentId(SAMPLE_TOKEN_ID)).toBe(true);
    expect(isAgentId(0n)).toBe(true);
    expect(isAgentId(-1n)).toBe(false);
    expect(isAgentId(2n ** 256n)).toBe(false);
    expect(isAgentId(123 as unknown as bigint)).toBe(false);
  });
});
