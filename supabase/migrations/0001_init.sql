-- Sahayata core schema: profiles, requests, pool ledger, contributions.
-- Run with `supabase db push` or paste into the SQL editor.

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- profiles: one row per auth.users, holds public-facing account data
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can delete their own profile"
  on public.profiles for delete
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------
-- requests: a request for financial support raised by a user
-- ---------------------------------------------------------------------
create type public.request_category as enum (
  'medical', 'education', 'housing', 'disaster_relief', 'livelihood', 'other'
);

create type public.request_status as enum (
  'draft', 'pending_review', 'active', 'funded', 'closed', 'rejected'
);

create table if not exists public.requests (
  id uuid primary key default uuid_generate_v4(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 140),
  category public.request_category not null,
  description text not null check (char_length(description) between 20 and 4000),
  target_amount numeric(12, 2) not null check (target_amount > 0),
  raised_amount numeric(12, 2) not null default 0 check (raised_amount >= 0),
  urgency smallint not null check (urgency between 1 and 5),
  status public.request_status not null default 'pending_review',
  document_urls text[] not null default '{}',
  queue_started_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists requests_status_idx on public.requests (status);
create index if not exists requests_requester_idx on public.requests (requester_id);

alter table public.requests enable row level security;

create policy "Active and funded requests are publicly viewable"
  on public.requests for select
  using (status in ('active', 'funded', 'closed') or requester_id = auth.uid());

create policy "Users can create their own requests"
  on public.requests for insert
  with check (auth.uid() = requester_id);

create policy "Users can update their own requests"
  on public.requests for update
  using (auth.uid() = requester_id)
  with check (auth.uid() = requester_id);

create policy "Users can delete their own requests"
  on public.requests for delete
  using (auth.uid() = requester_id);

-- ---------------------------------------------------------------------
-- pool_transactions: money moving into the central redistribution pool
-- ---------------------------------------------------------------------
create table if not exists public.pool_transactions (
  id uuid primary key default uuid_generate_v4(),
  donor_id uuid references public.profiles (id) on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'INR',
  provider text not null check (provider in ('stripe', 'razorpay')),
  provider_payment_id text not null unique,
  status text not null default 'succeeded' check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  created_at timestamptz not null default now()
);

alter table public.pool_transactions enable row level security;

create policy "Users can view their own donations"
  on public.pool_transactions for select
  using (auth.uid() = donor_id);

-- Inserts happen only via the service-role key from a verified payment
-- webhook, so there is intentionally no insert policy for regular users.

-- ---------------------------------------------------------------------
-- allocations: how pool funds were distributed to specific requests
-- ---------------------------------------------------------------------
create table if not exists public.allocations (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid not null references public.requests (id) on delete cascade,
  pool_transaction_id uuid references public.pool_transactions (id) on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  priority_score numeric(6, 4),
  created_at timestamptz not null default now()
);

alter table public.allocations enable row level security;

create policy "Allocations are publicly viewable"
  on public.allocations for select
  using (true);

-- ---------------------------------------------------------------------
-- direct contributions: a donor funding one specific request ("Fund Now")
-- ---------------------------------------------------------------------
create table if not exists public.contributions (
  id uuid primary key default uuid_generate_v4(),
  request_id uuid not null references public.requests (id) on delete cascade,
  donor_id uuid references public.profiles (id) on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  provider text not null check (provider in ('stripe', 'razorpay')),
  provider_payment_id text not null unique,
  created_at timestamptz not null default now()
);

alter table public.contributions enable row level security;

create policy "Contributions are publicly viewable"
  on public.contributions for select
  using (true);

-- Keep raised_amount in sync whenever a contribution or allocation lands.
create or replace function public.bump_raised_amount()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.requests
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

drop trigger if exists on_contribution_insert on public.contributions;
create trigger on_contribution_insert
  after insert on public.contributions
  for each row execute procedure public.bump_raised_amount();

drop trigger if exists on_allocation_insert on public.allocations;
create trigger on_allocation_insert
  after insert on public.allocations
  for each row execute procedure public.bump_raised_amount();

-- Realtime: broadcast row changes on requests so dashboards live-update.
alter publication supabase_realtime add table public.requests;
alter publication supabase_realtime add table public.allocations;
alter publication supabase_realtime add table public.contributions;
