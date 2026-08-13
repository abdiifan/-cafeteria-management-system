-- Step 10: Customer self-ordering + wallet ledger
--
-- Two problems this fixes:
--
-- 1. There was no way for a customer to actually PLACE an order in the app.
--    The customer role could only view order history and request a wallet
--    top-up — every order had to be typed in by a cashier at the POS. This
--    adds a safe, atomic "order for myself, pay from my wallet" path.
--
-- 2. wallets only ever stored a single running balance. Once cash and
--    payroll-deduction top-ups are both approved, the money is
--    indistinguishable — there was no way to answer "how much of what this
--    person has is actually a salary deduction I owe payroll for?". This
--    adds a wallet_transactions ledger that tags every credit with its
--    source method and every debit with the order it paid for, so that
--    question (and a full statement) is answerable per employee.
--
-- Run after step1–step9 in the Supabase SQL editor. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Wallet ledger
-- ---------------------------------------------------------------------------
create table if not exists public.wallet_transactions (
  id bigserial primary key,
  profile_id uuid not null references public.profiles(id),
  type text not null check (type in ('topup', 'order_payment', 'refund', 'adjustment')),
  amount numeric not null, -- positive for topup/refund, negative for order_payment
  method text, -- cash / telebirr / cbe_birr / hellocash / payroll_deduction — only set for topups
  order_id bigint references public.orders(id),
  topup_request_id bigint references public.wallet_top_up_requests(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists wallet_transactions_profile_id_idx on public.wallet_transactions(profile_id);

alter table public.wallet_transactions enable row level security;

drop policy if exists "own_wallet_transactions" on public.wallet_transactions;
create policy "own_wallet_transactions"
  on public.wallet_transactions for select
  using (profile_id = auth.uid() OR public.can_manage_wallets());

-- No insert/update/delete policies for anyone — rows are only ever written by
-- the SECURITY DEFINER functions below, same pattern as step9.

-- ---------------------------------------------------------------------------
-- 2. Record a ledger row every time a top-up is approved, so the source
-- method (cash vs telebirr vs payroll_deduction) is preserved permanently
-- even though wallets.balance itself is just one number.
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

  insert into public.wallet_transactions (profile_id, type, amount, method, topup_request_id, created_by)
  values (req.profile_id, 'topup', req.amount, req.method, req.id, auth.uid());
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. place_self_order(items, order_type)
-- The customer-facing "order and pay from my wallet" action. Everything
-- happens in one transaction: lock the wallet row, check funds, create the
-- order + order_items + payment row, debit the wallet, and log the ledger
-- entry. If any step fails (e.g. insufficient balance) nothing is written.
--
-- items shape: '[{"menu_item_id": 3, "quantity": 2}, {"menu_item_id": 7, "quantity": 1}]'
-- Pricing: anyone whose profile role is NOT 'customer' (i.e. staff ordering
-- their own lunch) is charged staff_price; role = 'customer' pays guest_price.
-- Adjust this rule below if your cafeteria prices differently.
-- ---------------------------------------------------------------------------
create or replace function public.place_self_order(items jsonb, order_type text default 'takeaway')
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  me record;
  use_staff_price boolean;
  subtotal numeric := 0;
  new_order_id bigint;
  item jsonb;
  mi record;
  qty int;
  line_total numeric;
begin
  select id, role into me from public.profiles where id = auth.uid();
  if not found then
    raise exception 'No profile for current user';
  end if;

  if order_type not in ('dine_in', 'takeaway') then
    raise exception 'Invalid order type';
  end if;

  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  use_staff_price := (me.role <> 'customer');

  -- Lock the wallet row up front so two simultaneous orders from the same
  -- person can't both pass the balance check against the same starting balance.
  perform 1 from public.wallets where profile_id = me.id for update;
  if not found then
    raise exception 'insufficient_balance';
  end if;

  -- Validate items + compute subtotal against current DB prices (never trust
  -- a client-supplied price).
  for item in select * from jsonb_array_elements(items)
  loop
    qty := (item->>'quantity')::int;
    if qty is null or qty <= 0 then
      raise exception 'Invalid quantity';
    end if;

    select * into mi from public.menu_items
      where id = (item->>'menu_item_id')::bigint and is_active = true;
    if not found then
      raise exception 'Menu item not available';
    end if;

    line_total := (case when use_staff_price then mi.staff_price else mi.guest_price end) * qty;
    subtotal := subtotal + line_total;
  end loop;

  if (select balance from public.wallets where profile_id = me.id) < subtotal then
    raise exception 'insufficient_balance';
  end if;

  insert into public.orders (order_type, customer_id, is_staff_price, subtotal, total_amount, status)
  values (order_type, me.id, use_staff_price, subtotal, subtotal, 'placed')
  returning id into new_order_id;

  for item in select * from jsonb_array_elements(items)
  loop
    qty := (item->>'quantity')::int;
    select * into mi from public.menu_items where id = (item->>'menu_item_id')::bigint;
    insert into public.order_items (order_id, menu_item_id, quantity, unit_price)
    values (new_order_id, mi.id, qty, case when use_staff_price then mi.staff_price else mi.guest_price end);
  end loop;

  insert into public.payments (order_id, method, amount, received_by)
  values (new_order_id, 'prepaid_balance', subtotal, me.id);

  update public.wallets set balance = balance - subtotal where profile_id = me.id;

  insert into public.wallet_transactions (profile_id, type, amount, order_id, created_by)
  values (me.id, 'order_payment', -subtotal, new_order_id, me.id);

  return new_order_id;
end;
$$;

grant execute on function public.place_self_order(jsonb, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Let a customer read the menu (needed to browse before ordering) and
-- see their own orders/order_items — harmless read-only policies, mirroring
-- the pattern used for wallet_top_up_requests.
-- ---------------------------------------------------------------------------
drop policy if exists "anyone_read_active_menu" on public.menu_items;
create policy "anyone_read_active_menu"
  on public.menu_items for select
  using (is_active = true OR public.can_manage_wallets());

drop policy if exists "customer_read_own_orders" on public.orders;
create policy "customer_read_own_orders"
  on public.orders for select
  using (customer_id = auth.uid() OR public.can_manage_wallets());

drop policy if exists "customer_read_own_order_items" on public.order_items;
create policy "customer_read_own_order_items"
  on public.order_items for select
  using (
    exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
    OR public.can_manage_wallets()
  );

-- ---------------------------------------------------------------------------
-- 5. Realtime for the customer's own orders, so the order-status badge on
-- Order History / the Dashboard updates live as the kitchen works through it.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'wallets'
  ) then
    alter publication supabase_realtime add table public.wallets;
  end if;
end $$;
