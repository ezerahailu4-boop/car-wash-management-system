# WashOS — Car Wash ERP

Next.js 15 + Supabase scaffold for the car wash management system.

## Setup

1. `npm install`
2. Create a Supabase project, then run `supabase/schema.sql` in the SQL editor
   (creates tables, RLS policies, and automation triggers for soap deduction /
   revenue recording).
3. Copy `.env.local.example` to `.env.local` and fill in your project URL + anon key.
4. `npm run dev`

## Status

- Dashboard, Wash Entry, Inventory, Requests, Employees, Reports pages are built
  and styled (dark industrial theme, teal accent).
- Wash Entry and Requests already call Supabase (insert wash, upsert vehicle,
  update request status) — falls back to local demo data if env vars aren't set,
  so the UI works before you connect a database.
- Dashboard/Inventory/Employees currently render from `src/lib/mock.ts`; swap
  these for real Supabase queries once you've seeded data (schema is ready).
- Auth (Supabase Auth + `profiles.role`) and RBAC route guards are not wired
  into the UI yet — schema and RLS policies are in place, login page is a stub.

## Next steps

- `src/app/login` — wire Supabase Auth (email/password or magic link) and
  redirect based on `profiles.role`.
- Add server-side data fetching (`src/lib/supabase/server.ts`) to dashboard/
  inventory/employees pages instead of mock data.
- Photo upload (before/after wash) via Supabase Storage.
- PDF/Excel export for reports.
