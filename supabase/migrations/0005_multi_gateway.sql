-- Widen the payment-provider check constraints to support the full
-- multi-gateway lineup (UPI via Razorpay/Cashfree, cards via Stripe,
-- PayPal, and Venmo — Venmo payments arrive as PayPal orders with
-- funding_source "venmo" and are stored with provider = 'paypal';
-- the funding source itself is recorded in the mishrin ledger entry's
-- metadata, not as a separate DB enum value).

alter table public.pool_transactions
  drop constraint if exists pool_transactions_provider_check;
alter table public.pool_transactions
  add constraint pool_transactions_provider_check
  check (provider in ('stripe', 'razorpay', 'cashfree', 'paypal'));

alter table public.contributions
  drop constraint if exists contributions_provider_check;
alter table public.contributions
  add constraint contributions_provider_check
  check (provider in ('stripe', 'razorpay', 'cashfree', 'paypal'));
