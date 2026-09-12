-- Read-only summary of the central redistribution pool, exposed as an RPC
-- so the dashboard can fetch one row instead of aggregating client-side.
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
    coalesce((select sum(amount) from public.pool_transactions where status = 'succeeded'), 0) as total_contributed,
    coalesce((select sum(amount) from public.allocations), 0) as total_allocated,
    coalesce((select sum(amount) from public.pool_transactions where status = 'succeeded'), 0)
      - coalesce((select sum(amount) from public.allocations), 0) as available_balance;
$$;

grant execute on function public.get_pool_summary() to anon, authenticated;
