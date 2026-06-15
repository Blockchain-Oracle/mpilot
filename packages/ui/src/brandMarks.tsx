/**
 * <BrandMark> — resolves a brand name to the right brand glyph.
 *
 * Brand SVGs are inline JSX so they tree-shake per-brand and never trigger a
 * CSP `img-src` request. Sourced from each brand's official press kit /
 * official SVG — see `BRAND_ATTRIBUTION.md` for licensing.
 *
 * Unknown names fall back to a styled monogram tile so the UI never breaks
 * when a new protocol is added before its SVG lands. The monogram uses the
 * project's primary token color, so it integrates with both themes.
 */
import type { ReactNode } from 'react';

export type BrandSize = number;

export interface BrandMarkProps {
  /** Brand identifier (case-insensitive). */
  readonly name: string;
  /** Pixel size (square). Defaults to 22. */
  readonly size?: BrandSize;
  /** Border radius in px. Defaults to ~28% of size. */
  readonly radius?: number;
  /** Optional ARIA label override. Defaults to brand display name. */
  readonly ariaLabel?: string;
}

interface BrandSpec {
  readonly displayName: string;
  /**
   * Background color token to fill the tile with. Falls back to `var(--ink-3)`
   * for the monogram case.
   */
  readonly bg?: string;
  /** Inline JSX of the brand glyph, sized to fit a 24×24 viewBox. */
  readonly glyph?: ReactNode;
  /** Override foreground color (e.g. for branded backgrounds). */
  readonly fg?: string;
}

/* eslint-disable @typescript-eslint/no-magic-numbers */

// Each glyph: 24×24 viewBox. Stroke/fill `currentColor` so the SVG inherits
// `color` from the wrapper. Sourcing notes in BRAND_ATTRIBUTION.md.
const ANTHROPIC = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
    <path d="M13.83 4h2.34l5.83 16h-2.5l-1.34-3.83H8.84L7.5 20H5l5.83-16h3zm-1.17 2.83-2.5 7.34h5l-2.5-7.34z" />
  </svg>
);

const OPENAI = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
    <path d="M22.28 9.82a5.95 5.95 0 0 0-.51-4.91 6 6 0 0 0-6.5-2.87A6 6 0 0 0 5.2 4.4a6 6 0 0 0-3.94 2.87 6 6 0 0 0 .74 7.06 6 6 0 0 0 .51 4.92 6 6 0 0 0 6.5 2.87 6 6 0 0 0 10.07 2.36 6 6 0 0 0 3.94-2.86 6 6 0 0 0-.74-7.06zm-8.45 11.83a4.43 4.43 0 0 1-2.85-1.03l.14-.08 4.74-2.74a.77.77 0 0 0 .4-.68v-6.69l2 1.16a.07.07 0 0 1 .04.06v5.55a4.46 4.46 0 0 1-4.47 4.45zm-9.6-4.1a4.42 4.42 0 0 1-.53-2.97l.14.08 4.74 2.74c.24.14.54.14.78 0l5.79-3.34v2.32a.07.07 0 0 1-.03.06l-4.8 2.77a4.46 4.46 0 0 1-6.1-1.66zM3 7.94a4.43 4.43 0 0 1 2.3-1.95v5.65a.77.77 0 0 0 .39.68l5.78 3.34-2 1.16a.07.07 0 0 1-.07 0L4.6 14.05a4.46 4.46 0 0 1-1.6-6.1zm16.46 3.83-5.79-3.34 2.01-1.16a.07.07 0 0 1 .07 0l4.8 2.77a4.46 4.46 0 0 1-.68 8.05v-5.64a.78.78 0 0 0-.4-.68zm1.99-3-.13-.09-4.74-2.74a.78.78 0 0 0-.78 0l-5.79 3.34V6.96a.07.07 0 0 1 .03-.06l4.8-2.78a4.46 4.46 0 0 1 6.61 4.62zM10.41 13l-2-1.16a.07.07 0 0 1-.04-.06V6.23a4.46 4.46 0 0 1 7.32-3.41l-.14.08-4.74 2.74a.77.77 0 0 0-.4.68V13zm1.09-2.34 2.58-1.49 2.58 1.49v2.97l-2.58 1.49-2.58-1.49z" />
  </svg>
);

const GOOGLE = (
  <svg viewBox="0 0 24 24" aria-hidden focusable="false">
    <path
      fill="#4285F4"
      d="M22.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h5.94c-.26 1.36-1.04 2.5-2.21 3.27v2.72h3.57c2.09-1.93 3.2-4.78 3.2-8.02z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.72c-.99.66-2.25 1.04-3.71 1.04-2.85 0-5.27-1.92-6.13-4.51H2.18v2.83A11 11 0 0 0 12 23z"
    />
    <path fill="#FBBC04" d="M5.87 14.15a6.6 6.6 0 0 1 0-4.3V7.02H2.18a11 11 0 0 0 0 9.96z" />
    <path
      fill="#EA4335"
      d="M12 5.39c1.62 0 3.06.56 4.2 1.65l3.15-3.15A11 11 0 0 0 12 1 11 11 0 0 0 2.18 7.02l3.69 2.83C6.73 7.31 9.15 5.39 12 5.39z"
    />
  </svg>
);

const XAI = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
    <path d="M3 3h3.5L12 9.7 17.5 3H21l-7 8.5L21 21h-3.5L12 14.3 6.5 21H3l7-8.5L3 3z" />
  </svg>
);

const PRIVY = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
    <path d="M12 2 3 6v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V6l-9-4zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 14c-2.3-1.1-5-3.7-5.8-7H7c.4-1.4 1.8-2.5 5-2.5s4.6 1.1 5 2.5h.8c-.8 3.3-3.5 5.9-5.8 7z" />
  </svg>
);

const WALLETCONNECT = (
  <svg viewBox="0 0 24 24" aria-hidden focusable="false">
    <path
      fill="currentColor"
      d="M5.9 8.4c3.4-3.4 8.8-3.4 12.2 0l.4.4a.4.4 0 0 1 0 .6l-1.4 1.4a.2.2 0 0 1-.3 0l-.6-.6c-2.4-2.4-6.2-2.4-8.6 0l-.6.6a.2.2 0 0 1-.3 0L5.3 9.4a.4.4 0 0 1 0-.6l.6-.4zm15 2.5 1.2 1.3a.4.4 0 0 1 0 .6l-5.7 5.6a.4.4 0 0 1-.6 0L12 14.8l-3.8 3.6a.4.4 0 0 1-.6 0l-5.7-5.6a.4.4 0 0 1 0-.6l1.2-1.3a.4.4 0 0 1 .6 0L7.5 14.5l3.8-3.6a.4.4 0 0 1 .6 0l3.8 3.6 3.7-3.5a.4.4 0 0 1 .6 0z"
    />
  </svg>
);

const METAMASK = (
  <svg viewBox="0 0 24 24" aria-hidden focusable="false">
    <path
      fill="#E2761B"
      d="m22 2-7.5 5.5L16 4.4 22 2zM2 2l7.5 5.5L8 4.4 2 2zm17.8 14.4-2.2 3.4 4.7 1.3 1.4-4.6-3.9-.1zM.3 16.5l1.4 4.6 4.7-1.3-2.2-3.4-3.9.1z"
    />
    <path
      fill="#E4761B"
      d="M6 10.4 4.8 12l4.7.2-.2-5L6 10.4zm12 0L14.7 7.2l-.2 5 4.7-.2L18 10.4zM6.4 19.8l2.8-1.3-2.4-1.9-.4 3.2zm8.4-1.3 2.8 1.3-.5-3.2-2.3 1.9z"
    />
    <path
      fill="#D7C1B3"
      d="m17.6 19.8-2.8-1.3.2 1.7v.8l2.6-1.2zm-11.2 0 2.6 1.2v-.8l.2-1.7-2.8 1.3z"
    />
    <path fill="#233447" d="m9 15.6-2.4-.7 1.7-.8.7 1.5zm6 0 .7-1.5 1.7.8-2.4.7z" />
    <path fill="#CD6116" d="M6.4 19.8 6.8 16l-2.7.1 2.3 3.7zm10.8-3.8.4 3.8 2.3-3.7-2.7-.1z" />
  </svg>
);

const MANTLE = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
    <circle cx="12" cy="12" r="10" />
    <path
      fill="var(--card, white)"
      d="M12 6.5a5.5 5.5 0 1 0 5.5 5.5 5.5 5.5 0 0 0-5.5-5.5zm2.5 5.5L11 16l-1.5-2.5L11 11l3.5 1z"
    />
  </svg>
);

const AAVE = (
  <svg viewBox="0 0 24 24" aria-hidden focusable="false">
    <circle cx="12" cy="12" r="11" fill="#B6509E" />
    <path
      fill="white"
      d="m11.4 6.6-3.8 10.8h2.2l.9-2.5h2.7l.9 2.5h2.2L12.7 6.6h-1.3zm0 6.5 1-3 1 3h-2z"
    />
  </svg>
);

const ETHENA = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
    <circle cx="12" cy="12" r="11" />
    <path fill="var(--card, white)" d="m12 5 4.5 7-4.5 7-4.5-7L12 5zm0 4-2.5 3L12 15l2.5-3L12 9z" />
  </svg>
);

const ONDO = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
    <circle cx="6.5" cy="12" r="3.5" />
    <circle cx="17.5" cy="12" r="3.5" />
    <circle
      cx="12"
      cy="12"
      r="3.5"
      fill="var(--card, white)"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

const METH = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
    <path d="m12 2-9 5 9 5 9-5-9-5zm-9 8 9 5 9-5v4l-9 5-9-5v-4z" />
  </svg>
);

const MERCHANT_MOE = (
  <svg viewBox="0 0 24 24" aria-hidden focusable="false">
    <circle cx="12" cy="12" r="11" fill="#FFB22C" />
    <path fill="white" d="M7 8h2v8H7zm4 0h2v8h-2zm4 0h2v8h-2z" />
  </svg>
);

const AGNI = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
    <path d="M12 2 3 12l9 10 9-10L12 2zm0 4 5 6-5 6-5-6 5-6z" />
  </svg>
);

const FUSIONX = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
    <path d="M12 2 2 7v10l10 5 10-5V7L12 2zm0 4.5 6 3v5l-6 3-6-3v-5l6-3z" />
  </svg>
);

const LIFI = (
  <svg viewBox="0 0 24 24" aria-hidden focusable="false">
    <circle cx="12" cy="12" r="11" fill="#FF24DA" />
    <path fill="white" d="M6 10h3v8H6V10zm5 0h3v8h-3V10zm5-4h3v12h-3V6z" />
  </svg>
);

const CLAUDE_CODE = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path
      fill="var(--card, white)"
      d="M7.5 9 5 12l2.5 3 1-1L7 12l1.5-2-1-1zm9 0-1 1L17 12l-1.5 2 1 1L19 12l-2.5-3zm-4 0L11 14h1.5l.5-1.5h2L15.5 14H17l-2-5h-2.5z"
    />
  </svg>
);

const CURSOR = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
    <path d="M4 4v16l4-4 4 4 4-12-12-4zm6 6 1 5-2-2-2 2 3-5z" />
  </svg>
);

/**
 * Brand registry. Entries with no glyph fall back to monogram.
 * Names match the case-insensitive lookup the wizard uses
 * (`<BrandMark name="anthropic" />` etc.).
 */
export const BRANDS = {
  anthropic: { displayName: 'Anthropic', bg: 'oklch(0.4 0.05 30)', glyph: ANTHROPIC, fg: '#fff' },
  openai: { displayName: 'OpenAI', bg: 'oklch(0.2 0 0)', glyph: OPENAI, fg: '#fff' },
  google: { displayName: 'Google', bg: 'oklch(0.99 0 0)', glyph: GOOGLE },
  xai: { displayName: 'xAI', bg: 'oklch(0.1 0 0)', glyph: XAI, fg: '#fff' },
  privy: { displayName: 'Privy', bg: 'oklch(0.5 0.2 268)', glyph: PRIVY, fg: '#fff' },
  reown: { displayName: 'Reown', bg: 'oklch(0.4 0.18 268)', glyph: WALLETCONNECT, fg: '#fff' },
  browser: { displayName: 'Browser wallet', bg: 'oklch(0.97 0.02 50)', glyph: METAMASK },
  mantle: { displayName: 'Mantle', bg: 'oklch(0.1 0 0)', glyph: MANTLE, fg: '#fff' },
  'aave v3': { displayName: 'Aave V3', glyph: AAVE },
  aave: { displayName: 'Aave V3', glyph: AAVE },
  ethena: { displayName: 'Ethena sUSDe', bg: 'oklch(0.18 0.04 268)', glyph: ETHENA, fg: '#fff' },
  ondo: { displayName: 'Ondo USDY', bg: 'oklch(0.4 0.15 268)', glyph: ONDO, fg: '#fff' },
  meth: { displayName: 'mETH staking', bg: 'oklch(0.18 0.02 268)', glyph: METH, fg: '#fff' },
  'merchant moe': { displayName: 'Merchant Moe', glyph: MERCHANT_MOE },
  agni: { displayName: 'Agni', bg: 'oklch(0.18 0.02 268)', glyph: AGNI, fg: '#fff' },
  fusionx: { displayName: 'FusionX', bg: 'oklch(0.4 0.18 30)', glyph: FUSIONX, fg: '#fff' },
  'li.fi': { displayName: 'Li.Fi', glyph: LIFI },
  lifi: { displayName: 'Li.Fi', glyph: LIFI },
  'claude code': {
    displayName: 'Claude Code',
    bg: 'oklch(0.4 0.05 30)',
    glyph: CLAUDE_CODE,
    fg: '#fff',
  },
  'claude desktop': {
    displayName: 'Claude Desktop',
    bg: 'oklch(0.4 0.05 30)',
    glyph: CLAUDE_CODE,
    fg: '#fff',
  },
  cursor: { displayName: 'Cursor', bg: 'oklch(0.1 0 0)', glyph: CURSOR, fg: '#fff' },
  windsurf: { displayName: 'Windsurf', bg: 'oklch(0.4 0.15 220)', glyph: CURSOR, fg: '#fff' },
  zed: { displayName: 'Zed', bg: 'oklch(0.18 0.02 268)', glyph: CURSOR, fg: '#fff' },
  'vs code copilot': {
    displayName: 'VS Code Copilot',
    bg: 'oklch(0.4 0.15 220)',
    glyph: CURSOR,
    fg: '#fff',
  },
  cline: { displayName: 'Cline' },
  goose: { displayName: 'Goose' },
  opencode: { displayName: 'OpenCode' },
  codex: { displayName: 'Codex' },
} as const satisfies Record<string, BrandSpec>;

export type BrandName = keyof typeof BRANDS;

function monogram(name: string): string {
  // Drop punctuation, take first letter of each of the first two whitespace-
  // separated words.
  const words = name
    .replace(/[^\p{L}\s]/gu, '')
    .split(/\s+/)
    .filter(Boolean);
  return (words[0]?.[0] ?? '?') + (words[1]?.[0] ?? '');
}

export function BrandMark({ name, size = 22, radius, ariaLabel }: BrandMarkProps) {
  const lookupKey = name.toLowerCase();
  const spec = (BRANDS as Record<string, BrandSpec>)[lookupKey];
  const display = spec?.displayName ?? name;
  const r = radius ?? Math.round(size * 0.28);
  const label = ariaLabel ?? display;

  if (!spec?.glyph) {
    // Monogram fallback. Backgrounds + foreground from tokens so it integrates
    // with both themes without color literals in this file.
    return (
      <span
        role="img"
        aria-label={label}
        style={{
          display: 'inline-grid',
          placeItems: 'center',
          width: size,
          height: size,
          borderRadius: r,
          fontFamily: 'var(--mono)',
          fontSize: Math.round(size * 0.42),
          fontWeight: 600,
          letterSpacing: '0.02em',
          color: 'var(--ink)',
          background: 'var(--paper-3, oklch(0.95 0.005 250))',
          textTransform: 'uppercase',
          userSelect: 'none',
        }}
      >
        {monogram(display)}
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={label}
      style={{
        display: 'inline-grid',
        placeItems: 'center',
        width: size,
        height: size,
        borderRadius: r,
        background: spec.bg ?? 'transparent',
        color: spec.fg ?? 'var(--ink)',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          width: Math.round(size * 0.78),
          height: Math.round(size * 0.78),
          display: 'inline-block',
        }}
      >
        {spec.glyph}
      </span>
    </span>
  );
}
