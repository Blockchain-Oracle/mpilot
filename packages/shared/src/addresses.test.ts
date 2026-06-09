// ADDRESSES registry tests: shape, pinned values, lockbox, deep-freeze, research-doc cross-check.
//
// Covers reviewer findings I3 (research-doc source-of-truth) + I4 (exact-path lockbox)
// + S8 (SEPOLIA_PENDING lex-sorted) + S9 (flattenAddresses tighter leaf check) +
// pre-merge pinned-value lockbox.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getAddress } from 'viem';
import { describe, expect, it } from 'vitest';
import type { Address } from './index.ts';
import { ADDRESSES, SEPOLIA_PENDING_ADDRESS_SLOTS } from './index.ts';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const ZERO = '0x0000000000000000000000000000000000000000';

// Canonical Mantle WETH vanity per aave-v3-mantle.md:34 — exempt from EIP-55 checksum.
const WETH_VANITY = '0xdEAddEaDdeadDEadDEADDEAddEADDEAddead1111';

const RESEARCH_DIR = resolve(import.meta.dirname, '../../../research/concierge/03-providers');

function flattenAddresses(
  obj: unknown,
  path: string[] = [],
): Array<{ path: string; value: string }> {
  if (typeof obj === 'string') {
    if (!ADDRESS_RE.test(obj)) {
      throw new Error(
        `flattenAddresses: non-address string at ${path.join('.')}: ${JSON.stringify(obj)}`,
      );
    }
    return [{ path: path.join('.'), value: obj }];
  }
  if (obj && typeof obj === 'object') {
    return Object.entries(obj).flatMap(([k, v]) => flattenAddresses(v, [...path, k]));
  }
  throw new Error(`flattenAddresses: unexpected leaf at ${path.join('.')} (${typeof obj})`);
}

const EXPECTED_PATHS = [
  'mantleMainnet.aave.addressesProvider',
  'mantleMainnet.aave.oracle',
  'mantleMainnet.aave.pool',
  'mantleMainnet.aave.protocolDataProvider',
  'mantleMainnet.erc8004.identityRegistry',
  'mantleMainnet.erc8004.reputationRegistry',
  'mantleMainnet.lifi.diamond',
  'mantleMainnet.mantleDex.agni.factory',
  'mantleMainnet.mantleDex.merchantMoe.lbRouter',
  'mantleMainnet.tokens.USDC',
  'mantleMainnet.tokens.USDY',
  'mantleMainnet.tokens.USDe',
  'mantleMainnet.tokens.WETH',
  'mantleMainnet.tokens.WMNT',
  'mantleMainnet.tokens.mETH',
  'mantleMainnet.tokens.sUSDe',
  'mantleSepolia.aave.addressesProvider',
  'mantleSepolia.aave.oracle',
  'mantleSepolia.aave.pool',
  'mantleSepolia.aave.protocolDataProvider',
  'mantleSepolia.erc8004.identityRegistry',
  'mantleSepolia.erc8004.reputationRegistry',
  'mantleSepolia.lifi.diamond',
  'mantleSepolia.mantleDex.agni.factory',
  'mantleSepolia.mantleDex.merchantMoe.lbRouter',
  'mantleSepolia.tokens.USDC',
  'mantleSepolia.tokens.USDY',
  'mantleSepolia.tokens.USDe',
  'mantleSepolia.tokens.WETH',
  'mantleSepolia.tokens.WMNT',
  'mantleSepolia.tokens.mETH',
  'mantleSepolia.tokens.sUSDe',
] as const;

describe('ADDRESSES shape', () => {
  it('has the exact 32-path canonical shape (rename breaks consumers)', () => {
    const paths = flattenAddresses(ADDRESSES)
      .map((x) => x.path)
      .sort();
    expect(paths).toEqual([...EXPECTED_PATHS]);
  });

  it('every entry matches 0x[40-hex] format', () => {
    for (const { path, value } of flattenAddresses(ADDRESSES)) {
      expect(value, `${path} must match 0x[40-hex]`).toMatch(ADDRESS_RE);
    }
  });

  it('Mantle Mainnet has no zero-address placeholders for live contracts', () => {
    for (const { path, value } of flattenAddresses(ADDRESSES.mantleMainnet)) {
      expect(value, `mantleMainnet.${path} must not be the zero address`).not.toBe(ZERO);
    }
  });

  it('Mantle Mainnet addresses satisfy EIP-55 checksum (except canonical WETH vanity)', () => {
    for (const { path, value } of flattenAddresses(ADDRESSES.mantleMainnet)) {
      if (value === WETH_VANITY) continue;
      expect(getAddress(value), `mantleMainnet.${path} EIP-55 mismatch`).toBe(value);
    }
  });

  it('Mantle Sepolia ERC-8004 addresses are populated (real testnet deployment)', () => {
    expect(ADDRESSES.mantleSepolia.erc8004.identityRegistry).not.toBe(ZERO);
    expect(ADDRESSES.mantleSepolia.erc8004.reputationRegistry).not.toBe(ZERO);
  });

  it('ADDRESSES tree is deeply frozen at runtime', () => {
    function assertFrozen(obj: unknown, path = 'ADDRESSES'): void {
      if (obj && typeof obj === 'object') {
        expect(Object.isFrozen(obj), `${path} must be frozen`).toBe(true);
        for (const [k, v] of Object.entries(obj)) assertFrozen(v, `${path}.${k}`);
      }
    }
    assertFrozen(ADDRESSES);
  });
});

describe('SEPOLIA_PENDING_ADDRESS_SLOTS lockbox', () => {
  it('matches every zero-valued Sepolia path (story-192 regression guard)', () => {
    const actual = flattenAddresses(ADDRESSES.mantleSepolia)
      .filter(({ value }) => value === ZERO)
      .map(({ path }) => path)
      .sort();
    expect(actual).toEqual([...SEPOLIA_PENDING_ADDRESS_SLOTS]);
  });

  it('is lex-sorted (canonical diff-stable order)', () => {
    const sorted = [...SEPOLIA_PENDING_ADDRESS_SLOTS].sort();
    expect([...SEPOLIA_PENDING_ADDRESS_SLOTS]).toEqual(sorted);
  });

  it('every entry resolves to a real ADDRESSES.mantleSepolia leaf at runtime', () => {
    for (const path of SEPOLIA_PENDING_ADDRESS_SLOTS) {
      const value = path
        .split('.')
        .reduce<unknown>(
          (acc, key) => (acc as Record<string, unknown>)[key],
          ADDRESSES.mantleSepolia,
        );
      expect(typeof value, `${path} must resolve to a leaf`).toBe('string');
      expect(value as string).toBe(ZERO);
    }
  });
});

describe('Mainnet pinned values (typo guard)', () => {
  it.each<[string, Address]>([
    ['aave.pool', '0x458F293454fE0d67EC0655f3672301301DD51422'],
    ['aave.oracle', '0x47a063CfDa980532267970d478EC340C0F80E8df'],
    ['aave.addressesProvider', '0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f'],
    ['aave.protocolDataProvider', '0x487c5c669D9eee6057C44973207101276cf73b68'],
    ['tokens.USDC', '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9'],
    ['tokens.USDe', '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34'],
    ['tokens.sUSDe', '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2'],
    ['tokens.WMNT', '0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8'],
    ['tokens.WETH', '0xdEAddEaDdeadDEadDEADDEAddEADDEAddead1111'],
    ['tokens.USDY', '0x5bE26527e817998A7206475496fDE1E68957c5A6'],
    ['tokens.mETH', '0xcDA86A272531e8640cD7F1a92c01839911B90bb0'],
    ['erc8004.identityRegistry', '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432'],
    ['erc8004.reputationRegistry', '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63'],
    ['lifi.diamond', '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE'],
    ['mantleDex.merchantMoe.lbRouter', '0x013e138EF6008ae5FDFDE29700e3f2Bc61d21E3a'],
    ['mantleDex.agni.factory', '0x25780dc8Fc3cfBD75F33bFDAB65e969b603b2035'],
  ])('mainnet %s pins exact value', (path, expected) => {
    const got = path
      .split('.')
      .reduce<Record<string, unknown>>(
        (acc, key) => acc[key] as Record<string, unknown>,
        ADDRESSES.mantleMainnet as unknown as Record<string, unknown>,
      );
    expect(got).toBe(expected);
  });
});

describe('Sepolia pinned values', () => {
  it.each<[string, Address]>([
    ['erc8004.identityRegistry', '0x8004A818BFB912233c491871b3d84c89A494BD9e'],
    ['erc8004.reputationRegistry', '0x8004B663056A597Dffe9eCcC1965A193B7388713'],
  ])('sepolia %s pins exact value', (path, expected) => {
    const got = path
      .split('.')
      .reduce<Record<string, unknown>>(
        (acc, key) => acc[key] as Record<string, unknown>,
        ADDRESSES.mantleSepolia as unknown as Record<string, unknown>,
      );
    expect(got).toBe(expected);
  });
});

describe('research/concierge/ is the source of truth (correlated-typo guard)', () => {
  // Each Mainnet address must appear in its cited research doc — guards against the
  // failure mode where addresses.ts AND the pinned-value test both share a wrong hex.
  it.each<[string, string]>([
    ['aave.pool', 'aave-v3-mantle.md'],
    ['aave.oracle', 'aave-v3-mantle.md'],
    ['aave.addressesProvider', 'aave-v3-mantle.md'],
    ['aave.protocolDataProvider', 'aave-v3-mantle.md'],
    ['tokens.USDC', 'aave-v3-mantle.md'],
    ['tokens.WMNT', 'aave-v3-mantle.md'],
    ['tokens.WETH', 'aave-v3-mantle.md'],
    ['tokens.USDe', 'ethena-susde.md'],
    ['tokens.sUSDe', 'ethena-susde.md'],
    ['tokens.USDY', 'ondo-usdy.md'],
    ['tokens.mETH', 'meth-staking.md'],
    ['erc8004.identityRegistry', 'erc8004.md'],
    ['erc8004.reputationRegistry', 'erc8004.md'],
    ['lifi.diamond', 'lifi-bridge.md'],
    ['mantleDex.merchantMoe.lbRouter', 'mantle-dex.md'],
    ['mantleDex.agni.factory', 'mantle-dex.md'],
  ])('mainnet %s appears in %s', (path, doc) => {
    const expectedAddress = path
      .split('.')
      .reduce<Record<string, unknown>>(
        (acc, key) => acc[key] as Record<string, unknown>,
        ADDRESSES.mantleMainnet as unknown as Record<string, unknown>,
      ) as unknown as string;
    const docBody = readFileSync(resolve(RESEARCH_DIR, doc), 'utf8');
    expect(docBody, `${expectedAddress} not found in ${doc}`).toContain(expectedAddress);
  });
});
