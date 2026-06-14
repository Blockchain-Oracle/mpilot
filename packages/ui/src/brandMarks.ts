/**
 * Story-099 — brand-mark tiles for third-party wallets, LLM providers, Mantle
 * protocols, and MCP hosts. Ported from the designer's brand-marks.jsx with
 * the same color/text palette + non-infringing monogram approach (real SVG
 * marks land per brand later; today these are colored monogram tiles).
 *
 * Source: `/Users/abu/Downloads/mentale (2)/concierge/brand-marks.jsx`.
 * Spec: `docs/FRONTEND-BRIEF-ADDENDUM.md` §19 (brand assets).
 */
import { type CSSProperties, createElement, type ReactElement } from 'react';

export interface BrandToken {
  /** Brand color used as the tile background. */
  readonly color: string;
  /** Two-character monogram drawn over the tile in mono-font. */
  readonly text: string;
}

export const BRANDS = Object.freeze({
  // ── Wallets (onboarding step 1)
  privy: { color: '#6E56F8', text: 'Pv' },
  reown: { color: '#3396FF', text: 'Re' },
  browser: { color: '#F6851B', text: 'Mm' },

  // ── LLM providers (BYOK / API keys section)
  anthropic: { color: '#D97757', text: 'An' },
  openai: { color: '#10A37F', text: 'Ai' },
  google: { color: '#4285F4', text: 'Go' },
  xai: { color: '#1A1A1A', text: 'xA' },

  // ── Mantle protocols (portfolio rows, tick cards)
  mantle: { color: '#000000', text: 'Mn' },
  'aave v3': { color: '#B6509E', text: 'Aa' },
  ethena: { color: '#222222', text: 'sU' },
  ondo: { color: '#1B4DFF', text: 'Od' },
  meth: { color: '#0EA3D6', text: 'mE' },
  'merchant moe': { color: '#5B57E0', text: 'Mo' },
  agni: { color: '#00C2B5', text: 'Ag' },
  fusionx: { color: '#6E56CF', text: 'Fx' },
  'li.fi': { color: '#E5489E', text: 'Li' },
  'erc-8004': { color: '#6B7280', text: 'ID' },

  // ── MCP hosts (10-host install snippet)
  'claude code': { color: '#D97757', text: 'Cc' },
  'claude desktop': { color: '#D97757', text: 'Cd' },
  cursor: { color: '#1A1A1A', text: 'Cu' },
  windsurf: { color: '#0AB6A0', text: 'Ws' },
  'vs code copilot': { color: '#007ACC', text: 'Vs' },
  zed: { color: '#1B47C4', text: 'Ze' },
  cline: { color: '#2D2D2D', text: 'Cl' },
  goose: { color: '#00B894', text: 'Gs' },
  opencode: { color: '#111111', text: 'Oc' },
  codex: { color: '#10A37F', text: 'Cx' },
} as const satisfies Record<string, BrandToken>);

export type BrandName = keyof typeof BRANDS;

export interface BrandMarkProps {
  /** Brand identifier (case-insensitive). Unknown names render an ink-3 fallback. */
  readonly name: string;
  /** Tile size in pixels. Default: 22. */
  readonly size?: number;
  /** Optional border-radius override. Default: 28% of size. */
  readonly radius?: number;
}

const INSET_RING = 'inset 0 0 0 1px rgba(255,255,255,0.14)';

/**
 * Monogram tile for a third-party brand. Renders a colored square (or rounded
 * square via `radius`) with a 2-char mono-font monogram in white. Used in
 * portfolio rows, MCP install tabs, onboarding wallet picker, etc.
 *
 * Lookup is case-insensitive. Unknown names render an ink-3 fallback tile
 * with the first 2 chars of the name (or `??` if empty) — defense-in-depth
 * so a downstream consumer typing `"Aave"` instead of `"aave v3"` still gets
 * a tile rather than a layout-breaking empty element.
 */
export function BrandMark({ name, size = 22, radius }: BrandMarkProps): ReactElement {
  const key = (name ?? '').toLowerCase() as BrandName;
  const brand: BrandToken = BRANDS[key] ?? {
    color: 'var(--ink-3)',
    text: (name ?? '').slice(0, 2) || '??',
  };
  const style: CSSProperties = {
    display: 'inline-grid',
    placeItems: 'center',
    width: size,
    height: size,
    flexShrink: 0,
    borderRadius: radius ?? Math.round(size * 0.28),
    background: brand.color,
    color: '#fff',
    fontFamily: 'var(--mono)',
    fontSize: Math.round(size * 0.42),
    fontWeight: 700,
    letterSpacing: '-0.02em',
    boxShadow: INSET_RING,
  };
  return createElement('span', { 'aria-hidden': true, style }, brand.text);
}
