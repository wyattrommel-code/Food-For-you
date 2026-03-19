-- ============================================================
-- MIGRATION: Taste Engine Cloud Sync
-- Paste this entire file into Supabase Dashboard → SQL Editor
-- and click "Run".  Safe to run multiple times.
-- ============================================================

-- ── Step 1: Ensure the user_preferences table exists ─────────
-- (Already in schema.sql — this is a safety net for live DBs
--  that were created before this migration.)
create table if not exists public.user_preferences (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null references public.users (id) on delete cascade,
  disliked_ingredients text[] not null default '{}',
  disliked_cuisines    text[] not null default '{}',
  liked_ingredients    text[] not null default '{}',
  liked_cuisines       text[] not null default '{}',
  updated_at           timestamptz not null default now(),
  constraint user_preferences_user_id_key unique (user_id)
);

-- ── Step 2: Enable RLS (idempotent) ──────────────────────────
alter table public.user_preferences enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'user_preferences'
      and policyname = 'prefs: own row'
  ) then
    create policy "prefs: own row" on public.user_preferences
      for all using (auth.uid() = user_id);
  end if;
end $$;

-- ── Step 3: Update the new-user trigger ──────────────────────
-- Now creates BOTH a public.users row AND a user_preferences
-- row when someone signs up, so the app never has to upsert
-- a non-existent row on first write.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Mirror auth.users into public.users
  insert into public.users (id)
  values (new.id)
  on conflict (id) do nothing;

  -- Pre-create a blank preferences row for the new user
  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Re-attach the trigger (drop + create is idempotent here)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Step 4: Backfill existing accounts ───────────────────────
-- Creates a blank user_preferences row for any signed-up user
-- who doesn't already have one.
insert into public.user_preferences (user_id)
select id from public.users
where id not in (select user_id from public.user_preferences)
on conflict (user_id) do nothing;

-- ── Done ──────────────────────────────────────────────────────
-- Verify with:
--   select * from public.user_preferences limit 10;
