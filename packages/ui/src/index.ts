/**
 * @mpilot/ui — visual design tokens + brand marks for Concierge.
 *
 * Per ADR-015 this is the single source of truth for visual style.
 *
 * Tokens ship via `import '@mpilot/ui/tokens.css';`.
 * Brand marks ship as tree-shakeable React components via the JS barrel.
 */
export {
  BRANDS,
  BrandMark,
  type BrandMarkProps,
  type BrandName,
  type BrandSize,
} from './brandMarks.js';
