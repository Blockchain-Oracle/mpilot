/**
 * @concierge-mantle/ui — brand tokens + brand marks (story-099).
 *
 * CSS tokens at `@concierge-mantle/ui/tokens.css`. Import once at the app
 * root and every component (including the iframe-side MCP cards, which
 * inline a subset) references the same `var(--paper)` / `var(--ink)` /
 * `var(--primary)` etc.
 *
 * Spec: `docs/FRONTEND-BRIEF-ADDENDUM.md` §15 (tokens), §19 (brand assets).
 */
export type { BrandMarkProps, BrandName, BrandToken } from './brandMarks';
export { BRANDS, BrandMark } from './brandMarks';
