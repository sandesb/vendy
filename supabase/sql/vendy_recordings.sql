-- Run in Supabase SQL Editor (Dashboard → SQL).
-- Bucket: klary. Object prefix: vendy/
-- Demo: anon can CRUD — tighten for production (Auth + user-scoped policies).

-- ── Table ─────────────────────────────────────────────────────────
create table if not exists public.vendy_recordings (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  public_url text,
  title text not null default 'Recording',
  duration_sec real,
  mime_type text not null default 'audio/webm',
  created_at timestamptz not null default now()
);

comment on table public.vendy_recordings is 'Vendy uploaded recordings metadata (files live in storage klary/vendy/)';

create index if not exists vendy_recordings_created_at_idx
  on public.vendy_recordings (created_at desc);

-- ── RLS (table) ─────────────────────────────────────────────────
alter table public.vendy_recordings enable row level security;

drop policy if exists "anon_all_vendy_recordings" on public.vendy_recordings;
create policy "anon_all_vendy_recordings"
  on public.vendy_recordings
  for all
  to anon
  using (true)
  with check (true);

-- Optional: allow authenticated role same as demo (remove if you use auth-only later)
drop policy if exists "authenticated_all_vendy_recordings" on public.vendy_recordings;
create policy "authenticated_all_vendy_recordings"
  on public.vendy_recordings
  for all
  to authenticated
  using (true)
  with check (true);

-- ── Storage policies (bucket: klary, path vendy/…) ───────────────
-- Note: If policies already exist for this bucket, adjust names or drop duplicates in Dashboard.

-- INSERT
drop policy if exists "anon_insert_klary_vendy" on storage.objects;
create policy "anon_insert_klary_vendy"
  on storage.objects for insert to anon
  with check (
    bucket_id = 'klary'
    and name like 'vendy/%'
  );

drop policy if exists "authenticated_insert_klary_vendy" on storage.objects;
create policy "authenticated_insert_klary_vendy"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'klary'
    and name like 'vendy/%'
  );

-- SELECT (read / download)
drop policy if exists "anon_select_klary_vendy" on storage.objects;
create policy "anon_select_klary_vendy"
  on storage.objects for select to anon
  using (
    bucket_id = 'klary'
    and name like 'vendy/%'
  );

drop policy if exists "authenticated_select_klary_vendy" on storage.objects;
create policy "authenticated_select_klary_vendy"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'klary'
    and name like 'vendy/%'
  );

-- UPDATE (optional; rarely needed for audio blobs)
drop policy if exists "anon_update_klary_vendy" on storage.objects;
create policy "anon_update_klary_vendy"
  on storage.objects for update to anon
  using (
    bucket_id = 'klary'
    and name like 'vendy/%'
  )
  with check (
    bucket_id = 'klary'
    and name like 'vendy/%'
  );

-- DELETE
drop policy if exists "anon_delete_klary_vendy" on storage.objects;
create policy "anon_delete_klary_vendy"
  on storage.objects for delete to anon
  using (
    bucket_id = 'klary'
    and name like 'vendy/%'
  );

drop policy if exists "authenticated_delete_klary_vendy" on storage.objects;
create policy "authenticated_delete_klary_vendy"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'klary'
    and name like 'vendy/%'
  );
