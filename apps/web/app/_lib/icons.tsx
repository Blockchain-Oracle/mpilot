/**
 * Inline SVG icons used across the Concierge web surface. Designer's
 * prototype attached these to `window.X` for fast iteration; engineering
 * port turns each into a typed React component so we get tree-shaking +
 * proper props + TypeScript completion.
 *
 * Source: `/Users/abu/Downloads/mentale (2)/concierge/sections.jsx` +
 * `app-screens.jsx` (referenced via `window.LockboxGlyph` / `window.Sun` /
 * `window.Moon` / `window.Copy` / `window.Check` / `window.ChevDown` /
 * `window.ExternalLink`).
 */
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

// All icons are decorative — they appear alongside text labels (button names,
// brand wordmark) so we explicitly mark them `aria-hidden` and skip the
// biome a11y/noSvgWithoutTitle rule per-component. Adding a `<title>` would
// double-announce the icon to screen readers.
function asProps(p: IconProps, defaultSize = 16): SVGProps<SVGSVGElement> {
  const { size, width, height, ...rest } = p;
  return {
    width: width ?? size ?? defaultSize,
    height: height ?? size ?? defaultSize,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    viewBox: '0 0 24 24',
    'aria-hidden': true,
    role: 'presentation',
    focusable: false,
    ...rest,
  };
}

/** The padlock-with-checkmark Concierge glyph (used in header marks). */
export function LockboxGlyph(props: IconProps) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative icon (aria-hidden + role=presentation set in asProps)
    <svg {...asProps(props, 22)} fill="none">
      <rect x="4" y="10.5" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2.1" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" stroke="currentColor" strokeWidth="2.1" />
      <circle cx="12" cy="15" r="1.3" fill="currentColor" />
    </svg>
  );
}

export function Sun(props: IconProps) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative icon (aria-hidden + role=presentation set in asProps)
    <svg {...asProps(props)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

export function Moon(props: IconProps) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative icon (aria-hidden + role=presentation set in asProps)
    <svg {...asProps(props)}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function ArrowRight(props: IconProps) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative icon (aria-hidden + role=presentation set in asProps)
    <svg {...asProps(props)}>
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

export function ExternalLink(props: IconProps) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative icon (aria-hidden + role=presentation set in asProps)
    <svg {...asProps(props, 12)}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6M10 14L21 3" />
    </svg>
  );
}

export function Copy(props: IconProps) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative icon (aria-hidden + role=presentation set in asProps)
    <svg {...asProps(props, 14)}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function Check(props: IconProps) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative icon (aria-hidden + role=presentation set in asProps)
    <svg {...asProps(props, 14)}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
