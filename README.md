# UPBY

A mobile-first social progress tracker for logging wins and losses.

Production: https://getupby.vercel.app

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add your Supabase project URL and publishable key.
3. Run `npm install`.
4. Run `npm run dev`.

## Database

All schema changes live in `supabase/migrations`, named with full timestamps so they run in order.
On a fresh Supabase project, run `supabase db push`, or paste each file into the SQL editor from oldest to newest.

## Checks

- `npm test` runs the unit tests
- `npm run typecheck` checks TypeScript
- `npm run check` runs both
- `npm run lint` runs ESLint
