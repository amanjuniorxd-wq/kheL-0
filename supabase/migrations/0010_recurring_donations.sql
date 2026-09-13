-- Opt-in recurring (monthly) donations via Stripe subscriptions.
-- A row here is created when a donor completes Stripe Checkout in
-- subscription mode, and is credited to the ledger once per billing
-- cycle by the invoice.payment_succeeded webhook handler (see
-- app/api/webhooks/payments/route.ts) via the same creditContribution()
-- path used for every one-time donation.

create table if not exists public.recurring_donations (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid references public.assistance_requests(id) on delete set null,
  amount numeric not null check (amount > 0),
  currency text not null default 'INR',
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  status text not null default 'active' check (status in ('active', 'past_due', 'canceled')),
  created_at timestamptz not null default now(),
  canceled_at timestamptz
);

alter table public.recurring_donations enable row level security;

-- Donors can see their own recurring gifts; admins can see all of them.
-- No insert/update/delete policy for regular users on purpose -- every
-- write happens server-side via the service-role client (the webhook
-- handler, and the cancel action), exactly like the transactions table.
create policy "Donors view own recurring donations"
  on public.recurring_donations for select
  using (donor_id = auth.uid());

create policy "Admins view all recurring donations"
  on public.recurring_donations for select
  using (is_admin(auth.uid()));
