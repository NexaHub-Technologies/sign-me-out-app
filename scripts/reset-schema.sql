-- ============================================================================
-- Sign Me Out — drop all app tables (public schema)
-- ============================================================================
-- DESTRUCTIVE & IRREVERSIBLE. This permanently deletes the 9 application
-- tables and ALL their data, indexes, RLS policies, triggers, and grants.
-- It does NOT touch Supabase's auth.*, storage.*, or any other schema.
--
-- Review carefully, then run it yourself (this is not run by the app):
--   • Supabase Dashboard -> SQL Editor -> paste -> Run, OR
--   • psql "$DATABASE_URL" -f scripts/reset-schema.sql
--
-- CASCADE removes dependent foreign keys; order is dependency-safe regardless.
-- ============================================================================

begin;

drop table if exists public.payments        cascade;
drop table if exists public.export_jobs      cascade;
drop table if exists public.orders           cascade;
drop table if exists public.canvas_items     cascade;
drop table if exists public.signatures       cascade;
drop table if exists public.space_memberships cascade;
drop table if exists public.sign_spaces      cascade;
drop table if exists public.garments         cascade;
drop table if exists public.profiles         cascade;

commit;
