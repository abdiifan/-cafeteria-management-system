-- Step 9: Wallet top-up approvals
--
-- Customers can already submit a top-up request (WalletPage.jsx inserts into
-- wallet_top_up_requests with status 'pending'), but nothing in the app could
-- move a request past 'pending' or actually credit the wallet. This step adds
-- that missing piece: a review workflow for cashiers/admins, done through two
-- SECURITY DEFINER functions rather than a plain client-side UPDATE, so that
-- "approve" and "credit the wallet" always happen together, atomically, and
-- can't be triggered by anyone other than staff.
--
-- Run after step1–step8 in the Supabase SQL editor. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Bookkeeping columns on wallet_top_up_requests, if not already there.
-- ---------------------------------------------------------------------------
alter table public.wallet_top_up_requests add column if not exists reviewed_by uuid references public.profiles(id);
alter table public.wallet_top_up_requests add column if not exists reviewed_at timestamptz;
alter table public.wallet_top_up_requests add column if not exists review_note text;

-- ---------------------------------------------------------------------------
-- 2. Helper: can_manage_wallets()
-- Same SECURITY DEFINER pattern as is_super_admin() in step8 — cashiers are
-- the ones physically confirming cash/mobile-money receipts, so they (plus
-- super_admin) are allowed to review requests.
-- ---------------------------------------------------------------------------
create or replace function public.can_manage_wallets()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('cashier', 'super_admin')
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. RLS: staff can see every request (customers already have a "my own
-- rows" policy from whenever wallet_top_up_requests was first created; this
-- just adds visibility for the people reviewing them).
-- ---------------------------------------------------------------------------
drop policy if exists "staff_read_all_topup_requests" on public.wallet_top_up_requests;
create policy "staff_read_all_topup_requests"
  on public.wallet_top_up_requests for select
  using (public.can_manage_wallets() OR profile_id = auth.uid());

-- Deliberately no staff UPDATE policy here — review happens only through the
-- two functions below, so "approved" can never happen without the wallet
-- actually being credited in the same transaction.

-- ---------------------------------------------------------------------------
-- 3b. The upsert in approve_topup_request() below needs a unique constraint
-- on wallets.profile_id to resolve "insert or credit existing" in one shot.
-- Added defensively in case it isn't already there from an earlier step.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'wallets_profile_id_key'
  ) then
    alter table public.wallets add constraint wallets_profile_id_key unique (profile_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. approve_topup_request(request_id)
-- Locks the request row, checks it's still pending, credits (or creates) the
-- wallet, then marks the request approved. All in one transaction.
-- ---------------------------------------------------------------------------
create or replace function public.approve_topup_request(request_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req record;
begin
  if not public.can_manage_wallets() then
    raise exception 'Only cashiers or admins can review top-up requests';
  end if;

  select * into req from public.wallet_top_up_requests where id = request_id for update;
  if not found then
    raise exception 'Request not found';
  end if;
  if req.status <> 'pending' then
    raise exception 'This request has already been reviewed';
  end if;

  insert into public.wallets (profile_id, balance)
  values (req.profile_id, req.amount)
  on conflict (profile_id) do update
    set balance = public.wallets.balance + excluded.balance;

  update public.wallet_top_up_requests
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where id = request_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. reject_topup_request(request_id, note)
-- ---------------------------------------------------------------------------
create or replace function public.reject_topup_request(request_id bigint, note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req record;
begin
  if not public.can_manage_wallets() then
    raise exception 'Only cashiers or admins can review top-up requests';
  end if;

  select * into req from public.wallet_top_up_requests where id = request_id for update;
  if not found then
    raise exception 'Request not found';
  end if;
  if req.status <> 'pending' then
    raise exception 'This request has already been reviewed';
  end if;

  update public.wallet_top_up_requests
  set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_note = note
  where id = request_id;
end;
$$;

grant execute on function public.approve_topup_request(bigint) to authenticated;
grant execute on function public.reject_topup_request(bigint, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Realtime, so the approvals screen updates live like the Users & Roles
-- and Kitchen Display pages do.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'wallet_top_up_requests'
  ) then
    alter publication supabase_realtime add table public.wallet_top_up_requests;
  end if;
end $$;
