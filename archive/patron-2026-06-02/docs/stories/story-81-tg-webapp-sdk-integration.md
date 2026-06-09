# Story 81 — Telegram WebApp SDK integration (@twa-dev/sdk)

**Epic:** Epic 5 — Telegram Mini App
**Estimated:** ~1.5h
**Depends on:** story-80-mini-nextjs-scaffold

## BDD Acceptance Criteria

```
Given the Mini App boots inside a Telegram WebView
When apps/mini/app/layout.tsx hydrates on the client
Then `WebApp.ready()` is called
And `WebApp.expand()` is called to use the full viewport
And the user's TG colorScheme (light/dark) is applied to `document.documentElement.dataset.theme`

Given the user navigates to any non-root route (e.g., /agent)
When the page mounts
Then `WebApp.BackButton.show()` is called
And clicking the TG back button (or pressing Esc in test) calls `router.back()`

Given a route declares a primary CTA via the useMainButton hook
When the page mounts with config { text: 'Confirm', onClick: fn }
Then `WebApp.MainButton.setText('Confirm')` runs
And `WebApp.MainButton.show()` and `WebApp.MainButton.onClick(fn)` are wired
And on unmount the handler is detached and the button is hidden

Given a user performs a haptic-worthy action (confirm, freeze, copy)
When the action handler runs
Then `WebApp.HapticFeedback.impactOccurred('medium')` (or appropriate variant) fires

Given the app runs outside Telegram (no window.Telegram)
When TgProvider mounts
Then it logs a structured warning via the logger wrapper
And renders children without crashing
And the NonTelegramBanner from story-80 remains visible

Given Vitest runs apps/mini/lib/telegram/__tests__/useMainButton.test.ts
When the spec executes against a mocked WebApp
Then setText, show, onClick, off are asserted to be called in the right order
```

## File modification map

- `apps/mini/package.json` — UPDATE — add `@twa-dev/sdk@latest`, `@twa-dev/types@latest` (devDependency).
- `apps/mini/lib/telegram/TgProvider.tsx` — NEW — `"use client"` context provider; calls `WebApp.ready()`, `WebApp.expand()`, applies theme; exposes `{ webApp, colorScheme, viewportHeight, isInsideTelegram }` via React context.
- `apps/mini/lib/telegram/useTelegram.ts` — NEW — `useTelegram()` hook returning the context value; throws (in dev) if used outside `<TgProvider>`.
- `apps/mini/lib/telegram/useMainButton.ts` — NEW — `useMainButton({ text, onClick, isVisible?, isActive?, color? })`; effect wires the handler on mount, cleans up on unmount.
- `apps/mini/lib/telegram/useBackButton.ts` — NEW — `useBackButton(handler?)`; if no handler provided, defaults to `router.back()` via `next/navigation`.
- `apps/mini/lib/telegram/useHaptics.ts` — NEW — wraps `WebApp.HapticFeedback`; exports `{ impact, notification, selectionChanged }` with no-op fallbacks outside TG.
- `apps/mini/lib/telegram/useTheme.ts` — NEW — subscribes to `themeChanged` event; updates `data-theme` attribute + CSS variables.
- `apps/mini/lib/telegram/__tests__/useMainButton.test.ts` — NEW — Vitest with a mocked `window.Telegram.WebApp` global.
- `apps/mini/lib/telegram/__tests__/useBackButton.test.ts` — NEW — Vitest with mocked SDK + `next/navigation`.
- `apps/mini/app/layout.tsx` — UPDATE — wrap children in `<TgProvider>`; load `@twa-dev/sdk` only client-side (dynamic import with `ssr: false`).
- `apps/mini/components/shell/AppShell.tsx` — NEW — composes BackButton wiring + theme + viewport-aware padding (`pb-[var(--tg-viewport-stable-height)]`).

## Shell verification

```bash
pnpm --filter mini install
pnpm --filter mini build
test $? -eq 0

# Hooks exist
test -f apps/mini/lib/telegram/useMainButton.ts
test -f apps/mini/lib/telegram/useBackButton.ts
test -f apps/mini/lib/telegram/useTelegram.ts
test -f apps/mini/lib/telegram/useHaptics.ts
test -f apps/mini/lib/telegram/TgProvider.tsx

# SDK installed
grep -q "@twa-dev/sdk" apps/mini/package.json

# Provider wired
grep -q "TgProvider" apps/mini/app/layout.tsx

# Vitest
pnpm --filter mini test --run lib/telegram
test $? -eq 0

# 400-LOC
for f in $(find apps/mini/lib/telegram -type f \( -name "*.ts" -o -name "*.tsx" \)); do
  wc -l "$f" | awk '{ if ($1 > 400) exit 1 }'
done
```

## Notes

- **Context7 first**: query `@twa-dev/sdk` and Telegram WebApp official docs. The SDK API has been stable but theme params change occasionally.
- TG WebView is the assumed home; outside-TG mode must NOT crash. All hooks must no-op gracefully when `window.Telegram?.WebApp` is undefined.
- `WebApp.MainButton` is the primary CTA pattern in the Mini App (per ux-spec § Telegram Mini App specifics). Avoid in-app "big buttons" that compete with it.
- Use `WebApp.BackButton` instead of an in-app back button. TG users expect the native chrome.
- `WebApp.expand()` is essential — without it the Mini App opens at half-height in many TG clients.
- Theme: read `WebApp.colorScheme` for initial mode, subscribe to `themeChanged` for live updates. Apply to `data-theme` so Tailwind v4 `data-[theme=dark]:` variants work.
- Haptics: use `impactOccurred('medium')` for confirms, `notificationOccurred('success'|'error')` for outcomes. Adds polish for UI/UX prize.
- File size < 400 LOC enforced.
- This story is consumed by every route in Epic 5 (84, 85, 86, 87) — ship before page work.
