# PostgreSQL SQL

The app now uses the VPS PostgreSQL database as the single source of truth.
Use `.env.local` with the VPS `DATABASE_URL`; do not run the app against a local
database unless you are intentionally creating an isolated development copy.

This folder is kept only as a schema/reference archive. It does not use Supabase,
Supabase Storage, RLS policies, or `auth.uid()`.

## Files

- `schema.sql` creates tables, constraints, indexes, triggers, and helper functions.
- `seed.sql` inserts starter data for local development.
- `reset.sql` drops and recreates the `public` schema. Use only when you want a clean database.

## Current Runtime

Runtime data comes from:

- Database: VPS PostgreSQL via `DATABASE_URL`
- Images: `https://img.prelize.com`

Do not copy storage files into `public/storage` for normal development.
