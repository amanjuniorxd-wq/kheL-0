-- Consolidates the schema onto the names used by the platform spec:
-- profiles, assistance_requests, transactions, mishrin_ledger.
--
-- `requests` becomes `assistance_requests` (straight rename — Postgres
-- carries foreign keys, RLS policies, and indexes over automatically).
-- `contributions`, `pool_transactions`, and `allocations` collapse into
-- one `transactions` table distinguished by `kind`, since all three were
-- "money moving somewhere" and the spec calls for a single table. Original
-- primary keys are preserved during the copy so existing mishrin_ledger
-- `related_transaction_id` values keep pointing at the right row.

alter table public.requests rename to assistance_requests;

create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  kind text not null check (kind in ('direct_contribution', 'pool_contribution', 'pool_allocation')),
  request_id uuid references public.assistance_requests (id) on delete cascade,
  donor_id uuid references public.profiles (id) on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'INR',
  -- 'system_pool' marks an internal pool -> request allocation, which has
  -- no external payment gateway attached.
  provider text not null check (provider in ('stripe', 'razorpay', 'cashfree', 'paypal', 'system_pool')),
  provider_payment_id text not null unique,
  status text not null default 'succeeded' check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  priority_score numeric(6, 4), -- only set for kind = 'pool_allocation'
  created_at timestamptz not null default now()
);

insert into public.transactions
  (id, kind, request_id, donor_id, amount, currency, provider, provider_payment_id, status, created_at)
select id, 'direct_contribution', request_id, donor_id, amount, 'INR', provider, provider_payment_id, 'succeeded', created_at
from public.contributions;

insert into public.transactions
  (id, kind, request_id, donor_id, amount, currency, provider, provider_payment_id, status, created_at)
select id, 'pool_contribution', null, donor_id, amount, currency, provider, provider_payment_id, status, created_at
from public.pool_transactions;

insert into public.transactions
  (id, kind, request_id, donor_id, amount, currency, provider, provider_payment_id, status, priority_score, created_at)
select id, 'pool_allocation', request_id, null, amount, 'INR', 'system_pool', 'alloc_' || id::text, 'succeeded', priority_score, created_at
from public.allocations;

create index transactions_request_idx on public.transactions (request_id);
create index transactions_donor_idx on public.transactions (donor_id);
create index transactions_kind_idx on public.transactions (kind);

alter table public.transactions enable row level security;

create policy "Transactions are publicly viewable"
  on public.transactions for select
  using (true);

-- No insert/update/delete policies for anon/authenticated: every write
-- goes through the service-role key from a verified payment webhook, the
-- request-creation server action, or the redistribute-pool Edge Function.

-- Point mishrin_ledger.related_transaction_id at the consolidated table
-- (ids were preserved above, so existing references stay valid).
alter table public.mishrin_ledger
  add constraint mishrin_ledger_related_transaction_fk
  foreign key (related_transaction_id) references public.transactions (id) on delete set null;

-- Re-point the raised_amount trigger at the new table.
drop trigger if exists on_contribution_insert on public.contributions;
drop trigger if exists on_allocation_insert on public.allocations;

create or replace function public.bump_raised_amount()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.request_id is null then
    return new;
  end if;

  update public.assistance_requests
  set raised_amount = raised_amount + new.amount,
      status = case
        when raised_amount + new.amount >= target_amount then 'funded'
        else status
      end,
      updated_at = now()
  where id = new.request_id;
  return new;
end;
$$;

create trigger on_transaction_insert
  after insert on public.transactions
  for each row execute procedure public.bump_raised_amount();

drop table public.contributions;
drop table public.pool_transactions;
drop table public.allocations;

alter publication supabase_realtime add table public.transactions;

-- get_pool_summary() now reads from the consolidated table.
create or replace function public.get_pool_summary()
returns table (
  total_contributed numeric,
  total_allocated numeric,
  available_balance numeric
)
language sql
security definer set search_path = public
stable
as $$
  select
    coalesce((select sum(amount) from public.transactions where kind = 'pool_contribution' and status = 'succeeded'), 0) as total_contributed,
    coalesce((select sum(amount) from public.transactions where kind = 'pool_allocation'), 0) as total_allocated,
    coalesce((select sum(amount) from public.transactions where kind = 'pool_contribution' and status = 'succeeded'), 0)
      - coalesce((select sum(amount) from public.transactions where kind = 'pool_allocation'), 0) as available_balance;
$$;
