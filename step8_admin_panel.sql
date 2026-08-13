-- Step 8: Admin panel — user/role management, tax & VAT settings, notification
-- settings. Run after step1–step7 in the Supabase SQL editor. Safe to re-run
-- (uses IF NOT EXISTS / OR REPLACE / ON CONFLICT throughout).

-- ---------------------------------------------------------------------------
-- 1. Helper: is_super_admin()
-- A plain "role = 'super_admin'" check inside a profiles RLS policy would
-- recurse (the policy's own subquery re-triggers the policy). SECURITY DEFINER
-- runs this with the function owner's privileges, bypassing RLS for just this
-- lookup, which breaks the recursion safely.
-- ---------------------------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'super_admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. profiles: active/inactive flag + RLS for admin management
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists is_active boolean not null default true;

-- Super admins can see every profile (needed for the Users & Roles list).
drop policy if exists "super_admin_read_all_profiles" on public.profiles;
create policy "super_admin_read_all_profiles"
  on public.profiles for select
  using (public.is_super_admin() OR id = auth.uid());

-- Super admins can update any profile's role / is_active (and anything else
-- on the row); non-admins still can't touch other people's profiles.
drop policy if exists "super_admin_update_profiles" on public.profiles;
create policy "super_admin_update_profiles"
  on public.profiles for update
  using (public.is_super_admin() OR id = auth.uid())
  with check (public.is_super_admin() OR id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. system_settings: singleton row for Tax/VAT + notification preferences
-- (§4.8 / §5 of the requirements doc). The `id boolean ... check (id)` trick
-- guarantees exactly one row can ever exist.
-- ---------------------------------------------------------------------------
create table if not exists public.system_settings (
  id boolean primary key default true check (id),
  vat_registered boolean not null default false,
  vat_rate numeric(5,2) not null default 15.00,
  business_tin text,
  srm_required boolean not null default false,
  low_stock_alerts_enabled boolean not null default true,
  expiry_alert_days integer not null default 3,
  pending_approval_alerts_enabled boolean not null default true,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

insert into public.system_settings (id) values (true) on conflict (id) do nothing;

alter table public.system_settings enable row level security;

-- Any signed-in user can read settings (e.g. POS/receipt code will want vat_rate)
drop policy if exists "read_system_settings" on public.system_settings;
create policy "read_system_settings"
  on public.system_settings for select
  using (auth.role() = 'authenticated');

-- Only super admins can change them
drop policy if exists "super_admin_write_system_settings" on public.system_settings;
create policy "super_admin_write_system_settings"
  on public.system_settings for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ---------------------------------------------------------------------------
-- 4. Realtime (optional but recommended) so the Users & Roles list and
-- settings pages reflect changes made by another admin without a refresh —
-- same pattern as step7_kitchen_queue_and_realtime.sql.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'system_settings'
  ) then
    alter publication supabase_realtime add table public.system_settings;
  end if;
end $$;
