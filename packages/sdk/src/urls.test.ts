import { describe, expect, it } from 'vitest';
import {
  agentShareUrl,
  attestationIpfsUrl,
  attestationMantleScanUrl,
  mantleScanAddressUrl,
  mantleScanTxUrl,
} from './urls.ts';

const SEPOLIA = 5003;
const MAINNET = 5000;
const TX: `0x${string}` = `0x${'ab'.repeat(32)}`;
const ADDR: `0x${string}` = '0x0000000000000000000000000000000000000001';

describe('mantleScanTxUrl', () => {
  it('routes Sepolia to sepolia.mantlescan.xyz', () => {
    expect(mantleScanTxUrl(TX, SEPOLIA)).toBe(`https://sepolia.mantlescan.xyz/tx/${TX}`);
  });
  it('routes Mainnet to mantlescan.xyz', () => {
    expect(mantleScanTxUrl(TX, MAINNET)).toBe(`https://mantlescan.xyz/tx/${TX}`);
  });
  it('throws on unsupported chain', () => {
    expect(() => mantleScanTxUrl(TX, 1)).toThrow(/Unsupported chainId/);
  });
  it('throws on malformed tx hash (defense vs. path-segment injection)', () => {
    expect(() => mantleScanTxUrl('0xdeadbeef/../etc' as `0x${string}`, SEPOLIA)).toThrow(
      /tx\/feedback hash/,
    );
  });
});

describe('mantleScanAddressUrl', () => {
  it('routes address to the right host', () => {
    expect(mantleScanAddressUrl(ADDR, MAINNET)).toBe(`https://mantlescan.xyz/address/${ADDR}`);
  });
  it('throws on malformed address', () => {
    expect(() => mantleScanAddressUrl('0xnotanaddress' as `0x${string}`, MAINNET)).toThrow(
      /Expected 20-byte/,
    );
  });
});

describe('attestationMantleScanUrl', () => {
  it('links to the attestation tx by feedback hash', () => {
    expect(attestationMantleScanUrl(TX, SEPOLIA)).toBe(`https://sepolia.mantlescan.xyz/tx/${TX}`);
  });
});

describe('attestationIpfsUrl', () => {
  const CIDV0 = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
  const CIDV1 = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
  it('accepts CIDv0 Qm…', () => {
    expect(attestationIpfsUrl(CIDV0)).toBe(`https://ipfs.io/ipfs/${CIDV0}`);
  });
  it('accepts CIDv1 base32 b…', () => {
    expect(attestationIpfsUrl(CIDV1)).toBe(`https://ipfs.io/ipfs/${CIDV1}`);
  });
  it('rejects path traversal', () => {
    expect(() => attestationIpfsUrl('../etc/passwd')).toThrow(/shape check/);
  });
  it('rejects short non-CID strings', () => {
    expect(() => attestationIpfsUrl('bafy123')).toThrow(/shape check/);
  });
});

describe('agentShareUrl', () => {
  it('serializes bigint agent ids', () => {
    expect(agentShareUrl(42n, 'https://mpilot.xyz')).toBe('https://mpilot.xyz/agent/42');
  });
  it('strips trailing slash from origin', () => {
    expect(agentShareUrl('99', 'https://mpilot.xyz/')).toBe('https://mpilot.xyz/agent/99');
  });
});
