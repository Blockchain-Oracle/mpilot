# Story 80 — Telegram Mini App Next.js scaffold

**Epic:** Epic 5 — Telegram Mini App
**Estimated:** ~1.5h
**Depends on:** story-07-privy-tg-spike, story-62-shared-ui-package-bootstrap

## BDD Acceptance Criteria

```
Given the monorepo is installed
When `pnpm --filter mini build` runs
Then exit code is 0
And the Next.js 15 App Router structure is in place at apps/mini/app/

Given a developer runs `pnpm --filter mini dev`
When the dev server boots on port 3002
Then http://localhost:3002 returns HTTP 200
And the rendered HTML imports `@patron/ui` components (no duplication of UI primitives)

Given the mini app loads in a desktop browser (non-Telegram context)
When apps/mini/app/page.tsx renders
Then a banner appears: "Open this page inside Telegram for the full experience"
And clicking the banner deep-links to https://t.me/PatronBot/app?startapp=landing

Given the Tailwind v4 config is applied
When the page renders
Then design tokens from packages/ui (Fraunces + Inter, --bg cream, --accent indigo) are available via CSS variables

Given Biome runs on apps/mini/
When `pnpm --filter mini lint` executes
Then no errors are reported
And no file exceeds 400 lines
```

## File modification map

- `apps/mini/package.json` — UPDATE — pin `next@15`, `react@19`, `@patron/ui@workspace:*`, `@patron/shared@workspace:*`, `tailwindcss@4`, `zod@latest`. Scripts: `dev` (port 3002), `build`, `start`, `lint`, `typecheck`.
- `apps/mini/next.config.ts` — NEW — `transpilePackages: ['@patron/ui', '@patron/shared']`; enable React Server Components default; set `experimental.serverActions.allowedOrigins` to include `t.me`, `web.telegram.org`.
- `apps/mini/tsconfig.json` — NEW — extends `tsconfig.base.json`; `paths: { "@/*": ["./*"] }`.
- `apps/mini/tailwind.config.ts` — NEW — `content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}']`; imports shared theme from `@patron/ui`.
- `apps/mini/app/layout.tsx` — NEW — root layout; loads Fraunces + Inter via `next/font`; `<html lang="en">` with `viewport: { width: 'device-width', initialScale: 1, viewportFit: 'cover' }`.
- `apps/mini/app/globals.css` — NEW — Tailwind directives + design token CSS variables (mirrors apps/web/app/globals.css from story-61).
- `apps/mini/app/page.tsx` — NEW — root `/` route; for v1 redirects to `/onboarding` if no Privy session, else `/` dashboard (placeholder until story-84). Shows the "Open in Telegram" banner if `window.Telegram?.WebApp` is undefined.
- `apps/mini/components/shell/NonTelegramBanner.tsx` — NEW — client component that detects absence of TG WebApp SDK and renders the deep-link banner using `buildTelegramDeepLink` from `@patron/shared/telegram` (story-79).
- `apps/mini/lib/env.ts` — NEW — Zod schema for mini env (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_PRIVY_APP_ID`, `NEXT_PUBLIC_TELEGRAM_BOT_NAME`, `NEXT_PUBLIC_APP_URL_WEB`).
- `apps/mini/lib/utils.ts` — NEW — `cn` (clsx + tailwind-merge) and any mini-specific helpers.
- `apps/mini/.env.local.example` — UPDATE — confirm required vars match story-06 list.
- `apps/mini/README.md` — NEW — one-paragraph dev quickstart + note that the app expects to run inside TG WebView.

## Shell verification

```bash
pnpm --filter mini install
pnpm --filter mini build
test $? -eq 0

# Dev server boots on port 3002
pnpm --filter mini dev &
DEV_PID=$!
sleep 5
curl -sf http://localhost:3002 | grep -qi "telegram"
kill $DEV_PID
wait $DEV_PID 2>/dev/null || true

# Reuses packages/ui (no duplicate copies of shared primitives)
! find apps/mini/components -name "Button.tsx" -path "*/ui/*" 2>/dev/null | grep -q .

# Tailwind config transpiles packages/ui
grep -q "@patron/ui" apps/mini/tailwind.config.ts

# 400-LOC enforcement
for f in $(find apps/mini -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/node_modules/*" -not -path "*/.next/*"); do
  wc -l "$f" | awk '{ if ($1 > 400) { print "LOC FAIL: '"$f"'"; exit 1 } }'
done

pnpm --filter mini lint
test $? -eq 0
```

## Notes

- **Context7 first**: query Next.js 15 App Router, Tailwind v4. Both have shipped breaking changes vs older docs.
- Per ADR-008: Mini App uses Privy (story-82), NOT wagmi/RainbowKit. Do NOT install wagmi here.
- Per ux-spec route shape: mini routes are `/`, `/agent`, `/merchants`, `/checkout/:orderId`, `/onboarding`. No landing page in mini.
- `transpilePackages` is required because `@patron/ui` ships TS source (not pre-built) — keeps the workspace simple.
- The non-Telegram banner is the only friendly fallback when someone opens the URL outside TG. Use the deep link from story-79.
- Port 3002 keeps web (3000) + docs (3001 or 3003) + mini distinct in local dev.
- File size < 400 LOC enforced.
- This story is foundational for stories 81–88; ship it before any TG/Privy work begins.
