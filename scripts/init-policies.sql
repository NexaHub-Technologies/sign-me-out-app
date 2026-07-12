-- ============================================================================
-- Sign Me Out — RLS policies, Realtime, Storage, and profile trigger
-- ============================================================================
-- Run after the Drizzle migration creates the tables.
-- Idempotent: safe to re-run. Apply via Supabase SQL editor or db.execute.
--
-- Model: writes go through server functions (Drizzle service connection, which
-- BYPASSES RLS), so we only need SELECT policies here — those are what let the
-- browser's anon Supabase client read rows AND receive Realtime changes.
-- ============================================================================

-- ---- Read policies (anon + authenticated) ---------------------------------
drop policy if exists "spaces_select" on public.sign_spaces;
create policy "spaces_select" on public.sign_spaces
  for select to anon, authenticated using (true);

drop policy if exists "marks_select" on public.marks;
create policy "marks_select" on public.marks
  for select to anon, authenticated using (status = 'visible');

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to anon, authenticated using (true);

-- No INSERT/UPDATE/DELETE policies: all writes happen server-side via Drizzle.

-- payments is fully server-only (created/verified via Drizzle). RLS is enabled
-- with NO policies, so anon/authenticated clients can neither read nor write it.
alter table public.payments enable row level security;

-- feedback is fully server-only too (written via the feedback server fn).
-- RLS enabled with NO policies — clients can neither read nor write it.
alter table public.feedback enable row level security;

-- ---- Realtime: stream marks changes to subscribed clients ------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'marks'
  ) then
    alter publication supabase_realtime add table public.marks;
  end if;
end $$;

-- ---- Storage: public bucket for photos ------------------------------------
insert into storage.buckets (id, name, public)
values ('space-media', 'space-media', true)
on conflict (id) do nothing;

-- Authenticated users may upload; public read comes from the bucket being public.
drop policy if exists "space_media_authenticated_insert" on storage.objects;
create policy "space_media_authenticated_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'space-media');

-- ---- Storage: PRIVATE bucket for voice notes ------------------------------
-- Not public: reads go through a server-minted signed URL (see server
-- getVoiceUrl), which re-checks that the requester is the host or the author.
insert into storage.buckets (id, name, public)
values ('space-voice', 'space-voice', false)
on conflict (id) do nothing;

-- Authenticated users may upload. No select policy: only the service role
-- (used server-side to sign URLs) can read, since it bypasses RLS.
drop policy if exists "space_voice_authenticated_insert" on storage.objects;
create policy "space_voice_authenticated_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'space-voice');

-- ---- Mirror auth.users -> public.profiles on signup -----------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
