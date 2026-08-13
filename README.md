# Cafeteria Management System — Frontend (Step 7)

React + Vite frontend for the Supabase schema built in Steps 1–6. Bilingual
(Amharic / English) from the ground up, role-based navigation, and every
screen talks straight to Supabase — no separate backend to run.

## What's in here

```
src/
  i18n/                  am.json + en.json — every UI string lives here
  lib/supabaseClient.js  Supabase client (reads .env)
  context/AuthContext.jsx Session, profile, role, language — one source of truth
  components/
    layout/               Sidebar, Topbar, language switcher, role-filtered nav
    common/                Button, Card, DataTable, Modal, StatCard, etc.
  pages/
    Login.jsx
    Dashboard.jsx          Role-aware summary (stock alerts, sales, wallet…)
    warehouse/             Items, stock-in, suppliers, low stock, stock count
    kitchen/                Menu & recipes (BOM), requisitions, production, waste
    pos/POSPage.jsx         Order entry, staff/guest pricing, payment, receipt
    customer/                Order history, wallet & top-up requests
    audit/                  Audit log, reconciliation & closing reports
```

Every page reads/writes the tables and views from `step1`–`step6` SQL files
directly through `@supabase/supabase-js` — no extra API layer. Row Level
Security in the database is what actually enforces permissions; the
role-based nav/routes here are for a good *experience*, not the security
boundary itself.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Point it at your Supabase project**
   ```bash
   cp .env.example .env
   ```
   Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from
   Supabase Dashboard → Project Settings → API.

3. **Make sure the database is set up**
   Run `step1` through `step6` SQL files (in order) in the Supabase SQL
   Editor, then create your test users and run `seed_test_data.sql` as
   described in that file.

4. **Run it**
   ```bash
   npm run dev
   ```
   Opens at `http://localhost:5173`. Sign in with one of the test accounts
   you created (e.g. `cashier@test.com`).

5. **Build for production**
   ```bash
   npm run build
   ```
   Outputs static files to `dist/` — deploy anywhere that serves static
   sites (Vercel, Netlify, Cloudflare Pages, or your own Nginx box).

## How the bilingual system works

- All copy lives in `src/i18n/locales/en.json` and `am.json`, loaded through
  `react-i18next`. Nothing is hard-coded in components.
- The language toggle in the top bar switches instantly and — once signed
  in — writes the choice to `profiles.preferred_language`, so it follows
  the person to their next device/session.
- Any table with bilingual data (items, menu items, categories, suppliers)
  shows `name_am` when Amharic is active and falls back to `name_en` if the
  Amharic label hasn't been filled in yet.
- Amharic text renders in **Noto Sans Ethiopic** (loaded in `index.html`);
  Latin text uses **Inter**. Both are loaded together so mixed bilingual
  labels render cleanly.

## Role-based navigation

`src/components/layout/navConfig.js` declares which roles see which nav
sections. `super_admin` always sees everything. This keeps staff — often
not very tech-literate, per the requirements doc — looking at a short,
relevant menu instead of the whole system. The actual data access is
still governed by the RLS policies from the SQL files, so a role restricted
in the UI is restricted at the database too.

## What's now wired up

- **Printable receipts** — the POS receipt renders inside `#receipt-print-area`
  with a dedicated `@media print` stylesheet (`src/index.css`). The receipt
  screen has a 58mm/80mm toggle, since a shop's printer is fixed to one
  width; that choice is written to `<html data-receipt-width>` right before
  `window.print()` fires.
- **Live kitchen queue** — `src/pages/kitchen/KitchenDisplayPage.jsx`
  subscribes to Supabase Realtime on `orders` and `order_items` and boards
  active orders by status (placed / preparing / ready). Kitchen staff (and
  cashiers, via a standalone nav link) click through
  placed → preparing → ready → completed; marking an order **completed** is
  what fires the existing made-to-order stock-deduction trigger from Step 4.
  **Run `step7_kitchen_queue_and_realtime.sql`** before using this — it adds
  the RLS policy letting kitchen staff update order status (previously only
  cashiers could) and adds `orders`/`order_items` to the Realtime
  publication.
- **Offline POS** — `src/lib/offlineQueue.js` is a small localStorage outbox.
  If a sale can't reach Supabase (offline, or the write fails with a network
  error), it's queued locally instead of lost, the receipt shows a
  "pending sync" badge, and the queue auto-flushes the moment the browser
  fires an `online` event (with a manual "Sync now" button too). Separately,
  `public/sw.js` is a minimal service worker that caches the app shell so the
  POS page itself still opens with no signal — it never touches Supabase
  traffic, only the app's own static files.

## What's intentionally still left for you to wire up

- **Telebirr / CBE Birr / HelloCash live integration** — the POS records a
  `reference_number` for these methods today, but no live payment API call
  happens yet. That requires the actual business agreements with each
  provider (see the requirements doc, §5).
- **Note on the order lifecycle change**: orders created at the POS now stay
  `placed` (sent to kitchen) instead of jumping straight to `completed`. The
  kitchen display — or a cashier, for simple counter service — is what
  marks an order `completed`. `daily_sales_summary` and the dish
  reconciliation report both key off `completed_at`, so this is more
  accurate to when food actually goes out, not just when it's paid for —
  but it's worth confirming that matches how your cafeteria actually runs
  before the pilot.

## Design notes

Palette and type were chosen deliberately for a staff-facing operations
tool, not a marketing site: a deep forest green (`#22463A`) for structure
and trust, warm gold (`#C79A3B`) for the one interactive accent, and a soft
parchment background rather than pure white, so long shifts on a tablet
screen are easier on the eyes. Fraunces carries page titles; Inter and
Noto Sans Ethiopic carry everything people actually read and type.
