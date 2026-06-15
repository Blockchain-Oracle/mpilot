<p align="center">
  <a href="https://github.com/Blockchain-Oracle/mpilot">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner-dark.svg">
      <img alt="mPilot" src="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner.svg" width="100%">
    </picture>
  </a>
</p>

# @mpilot/ui

The mPilot visual design system: OKLCH design tokens (light/dark) + brand marks. The single source of truth for visual style (ADR-015) — no raw color literals anywhere downstream.

## Quickstart

```ts
// 1. Load the tokens once (e.g. in your global stylesheet)
import '@mpilot/ui/tokens.css';

// 2. Use the brand marks (tree-shakeable React components)
import { BrandMark } from '@mpilot/ui';
<BrandMark brand="mpilot" />;
```

## What it ships

- **`tokens.css`** — OKLCH surfaces/ink/primary/semantic colors, the `--status-*` tick-status palette,
  spacing (4px grid), radii, shadows, motion, and the type families (Bricolage Grotesque / Hanken Grotesk
  / JetBrains Mono). Light + dark via `data-theme`.
- **Type-scale utility classes** — `.ds-display`, `.ds-h-card`, `.ds-eyebrow`, `.ds-mono`, `.ds-tnum`, …
- **`BrandMark` / `BRANDS`** — brand logo components.

Part of [mPilot](https://github.com/Blockchain-Oracle/mpilot).
