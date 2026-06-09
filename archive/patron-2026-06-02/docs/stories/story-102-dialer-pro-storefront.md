# Story 102 — Dialer Pro storefront (services vertical demo merchant)

**Epic:** Epic 7 — Demo Merchants
**Estimated:** ~2h
**Depends on:** story-95-sdk-react-patron-button

## BDD Acceptance Criteria

```
Given the demo-merchants/dialer-pro workspace is installed
When `pnpm --filter dialer-pro dev` runs
Then a Next.js 15 dev server boots on port 4103
And the homepage renders a services brand ("Dialer Pro — outbound sales coaching for B2B SaaS founders")
And the homepage lists 3 service tiers (Single 1:1 Call $150, 4-Call Sprint $500, Done-With-You Month $1,800) with real-sounding descriptions
And no lorem ipsum text appears anywhere

Given a visitor clicks "Book a session" on any service
When the /book/:slug page renders
Then a calendar view shows the next 14 days with 5 selectable 30-min slots per weekday (9:00, 10:00, 11:00, 14:00, 15:00 — fixed schedule for demo determinism)
And selecting a slot reveals a booking form (email, brief) and a <PatronButton merchantSlug="dialer-pro" amountUsd={tierPrice} sku={tierSlug} metadata={{slot, email}} />

Given the visitor clicks "Pay with Patron"
When the SDK opens the checkout flow
Then POST /orders/intent fires with the booking metadata
And on success the page navigates to /booking/confirmed?orderId=... showing the booked slot + a calendar (.ics) download link + "We've emailed you Zoom details" copy

Given the same slot was already booked locally (localStorage["dialer-pro:bookings"])
When the calendar renders
Then the previously-booked slot is greyed out and not selectable

Given `pnpm --filter dialer-pro build` runs
Then exit code is 0

Given the lighthouse a11y audit runs
When the score is computed
Then accessibility ≥ 90
```

## File modification map

- `demo-merchants/dialer-pro/package.json` — UPDATE — Next.js 15, React 19, `@patron/react@workspace:*`, Tailwind v4, date-fns, Biome
- `demo-merchants/dialer-pro/next.config.ts` — NEW
- `demo-merchants/dialer-pro/tailwind.config.ts` — NEW — confident services palette (deep charcoal + amber accent — distinct from Threads' cream/olive and Pixelink's slate/magenta)
- `demo-merchants/dialer-pro/app/layout.tsx` — NEW — header (logo + "Book" + "About"), footer
- `demo-merchants/dialer-pro/app/page.tsx` — NEW — homepage: hero ("Stop hating cold outreach. Close deals faster."), founder credibility strip, 3 service tiers, testimonial strip (3 real-sounding quotes from imaginary B2B founders), CTA
- `demo-merchants/dialer-pro/app/book/[slug]/page.tsx` — NEW — calendar UI + slot picker + booking form + `<PatronButton>`
- `demo-merchants/dialer-pro/app/booking/confirmed/page.tsx` — NEW — confirmation: slot summary, .ics download, "Zoom details emailed" copy, "Go back to Dialer Pro" CTA
- `demo-merchants/dialer-pro/lib/services.ts` — NEW — 3 service tiers with copy: single-call ($150), sprint-4 ($500), dwy-month ($1800). Each includes deliverables list, ideal-for blurb.
- `demo-merchants/dialer-pro/lib/calendar.ts` — NEW — `getAvailableSlots(date: Date): Slot[]` returns 5 fixed times/day, filtered through localStorage bookings; `bookSlot(orderId, slot)` persists; `generateIcs(booking): string` returns .ics text
- `demo-merchants/dialer-pro/components/Calendar.tsx` — NEW — 14-day grid with selectable slots
- `demo-merchants/dialer-pro/components/SlotPicker.tsx` — NEW
- `demo-merchants/dialer-pro/components/BookingForm.tsx` — NEW — email + brief textarea + Patron button
- `demo-merchants/dialer-pro/components/TierCard.tsx` — NEW
- `demo-merchants/dialer-pro/components/Hero.tsx` — NEW
- `demo-merchants/dialer-pro/components/Header.tsx` — NEW
- `demo-merchants/dialer-pro/components/Footer.tsx` — NEW
- `demo-merchants/dialer-pro/app/globals.css` — NEW
- `demo-merchants/dialer-pro/.env.local.example` — NEW — `NEXT_PUBLIC_PATRON_API_URL`, `NEXT_PUBLIC_PATRON_MERCHANT_KEY`, `NEXT_PUBLIC_PATRON_MERCHANT_SLUG=dialer-pro`
- `demo-merchants/dialer-pro/lib/env.ts` — NEW — zod env validation
- `demo-merchants/dialer-pro/README.md` — NEW — quickstart + deploy notes
- `demo-merchants/dialer-pro/tsconfig.json` — NEW
- `demo-merchants/dialer-pro/biome.json` — NEW

## Shell verification

```bash
pnpm --filter dialer-pro install
test $? -eq 0

PORT=4103 pnpm --filter dialer-pro dev &
DEV_PID=$!
sleep 8
curl -sf http://localhost:4103 | grep -q "Dialer Pro"
curl -sf http://localhost:4103/book/sprint-4 | grep -qi "calendar\|select"
kill $DEV_PID

pnpm --filter dialer-pro build
test $? -eq 0

grep -RIn "PatronButton" demo-merchants/dialer-pro/app demo-merchants/dialer-pro/components | grep -q "from '@patron/react'"

# 3 service tiers, real copy, no lorem
node -e "const s = require('./demo-merchants/dialer-pro/lib/services.ts'); if (s.SERVICES.length !== 3) process.exit(1); for (const x of s.SERVICES) { if (/lorem/i.test(x.description)) process.exit(1); }"

# Calendar exposes booking + ics
grep -q "generateIcs" demo-merchants/dialer-pro/lib/calendar.ts
grep -q "bookSlot" demo-merchants/dialer-pro/lib/calendar.ts

# 400-LOC
for f in $(find demo-merchants/dialer-pro -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .next); do
  wc -l "$f" | awk '{ if ($1 > 400) exit 1 }'
done

pnpm --filter dialer-pro lint
```

## Notes

- **Services vertical.** Dialer Pro represents the consulting/coaching/calls-as-product segment (SavvyCal / Calendly / Tella shape). This vertical matters because services pricing is bigger ($150–$1,800) than fashion ($75) and digital goods ($29) — proves Patron handles the full range.
- Uses **`@patron/react`** (same as Threads by Mara). Story-101 (Pixelink) is the lone vanilla-SDK consumer.
- **Independent brand identity required** — charcoal + amber, sharp sans, NO Patron blue. Pretend Dialer Pro existed before Patron and just added the integration.
- The fixed 5-slots-per-weekday calendar is intentional: demo determinism > realism. A judge clicking through during the demo should always see open slots.
- localStorage-backed bookings: same pattern as story-101's license persistence. Avoids needing real auth; sufficient for demo.
- Booking metadata flows through `<PatronButton metadata={{slot, email}}>` → POST /orders/intent → indexed in the order's `merchantMetadata` field → surfaced on /booking/confirmed.
- The .ics download is a small but high-credibility detail — judges who download it and open it in their calendar see a real event with the booked time. Use `lib/calendar.ts:generateIcs()` to emit a vCalendar/2.0 string.
- Testimonials: write 3 plausible 2-sentence quotes attributed to imaginary B2B SaaS founders ("Lila Chen, founder @ inboundpipe.io", etc.). These are clearly stylized — not pretending to be real customers — but they make the storefront feel lived-in.
- The "We've emailed you Zoom details" copy is also stub — no email is sent, but the affordance is clear.
- Deploys to `dialer-pro.patron.xyz` per story-104.
- File size < 400 LOC enforced.
