-- Admin role + the controlled surface admins get onto the otherwise
-- append-only mishrin ledger and other users' assistance_requests.

alter table public.profiles
  add column if not exists role text not null default 'user' check (role in ('user', 'admin'));

-- SECURITY DEFINER so RLS policies can call it without recursively
-- re-checking RLS on profiles (which would deadlock the policy check).
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select coalesce((select role = 'admin' from public.profiles where id = uid), false);
$$;

grant execute on function public.is_admin(uuid) to authenticated;

-- Admins can see every assistance_request regardless of status (the
-- existing policy only exposes active/funded/closed to the public, plus
-- a user's own).
create policy "Admins can view all requests"
  on public.assistance_requests for select
  using (public.is_admin(auth.uid()));

-- Admins can override any request's status (approve / reject / flag),
-- not just their own.
create policy "Admins can update any request"
  on public.assistance_requests for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- The mishrin ledger stays append-only for EVERYONE, admins included —
-- that immutability is the whole point of a public audit trail; an admin
-- "edit" button would defeat it. What admins get instead is a controlled
-- channel to append attributed oversight entries (audit runs, manual
-- rebalance triggers, status overrides) through the same hash-chained
-- writer, gated by is_admin() rather than by the service-role key.
alter type public.mishrin_event_type add value if not exists 'audit_verification';
alter type public.mishrin_event_type add value if not exists 'manual_rebalance_triggered';
alter type public.mishrin_event_type add value if not exists 'admin_override';

create or replace function public.admin_append_mishrin_entry(
  p_event_type public.mishrin_event_type,
  p_statement_text text,
  p_related_request_id uuid default null,
  p_related_transaction_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.mishrin_ledger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin_append_mishrin_entry: % is not an admin', auth.uid();
  end if;

  return public.append_mishrin_entry(
    auth.uid(), p_event_type, p_statement_text,
    p_related_request_id, p_related_transaction_id, p_metadata
  );
end;
$$;

grant execute on function public.admin_append_mishrin_entry(
  public.mishrin_event_type, text, uuid, uuid, jsonb
) to authenticated;
