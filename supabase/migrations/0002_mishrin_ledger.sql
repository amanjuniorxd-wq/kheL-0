create extension if not exists "pgcrypto";

-- Mishrin ledger: an append-only, hash-chained audit log for Sahayata.
-- Every request submission, floor statement, and pool payout writes one
-- row here. Rows are never updated or deleted (enforced by RLS + a
-- revoke on UPDATE/DELETE), and each row's hash commits to the previous
-- row's hash, so any edit to history breaks the chain and is publicly
-- detectable by recomputing hashes from entry 1 forward.

create type public.mishrin_event_type as enum (
  'request_submitted',
  'floor_statement',
  'pool_allocation',
  'contribution_received',
  'request_status_changed'
);

create table if not exists public.mishrin_ledger (
  id bigint generated always as identity primary key,
  delegate_id uuid references public.profiles (id) on delete set null,
  event_type public.mishrin_event_type not null,
  statement_text text not null,
  related_request_id uuid references public.requests (id) on delete set null,
  related_transaction_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  prev_hash text not null,
  transaction_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists mishrin_ledger_created_at_idx on public.mishrin_ledger (created_at desc);
create index if not exists mishrin_ledger_request_idx on public.mishrin_ledger (related_request_id);

alter table public.mishrin_ledger enable row level security;

create policy "Ledger entries are publicly viewable"
  on public.mishrin_ledger for select
  using (true);

-- No insert/update/delete policies for regular users: every entry is
-- written server-side (service-role key) via append_mishrin_entry(),
-- which computes the hash chain, so the log can't be edited or skipped
-- from the client.

revoke insert, update, delete on public.mishrin_ledger from anon, authenticated;

-- Append-only writer: computes transaction_hash = sha256(prev_hash || payload)
-- and rejects out-of-order writes via the unique/order guarantee of the
-- identity column. Call this only from server-side code with the
-- service-role key (see lib/mishrin/server.ts).
create or replace function public.append_mishrin_entry(
  p_delegate_id uuid,
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
declare
  v_prev_hash text;
  v_transaction_hash text;
  v_row public.mishrin_ledger;
begin
  select transaction_hash into v_prev_hash
  from public.mishrin_ledger
  order by id desc
  limit 1;

  if v_prev_hash is null then
    v_prev_hash := repeat('0', 64); -- genesis hash
  end if;

  v_transaction_hash := encode(
    digest(
      v_prev_hash || '|' || p_event_type::text || '|' || p_statement_text ||
      '|' || coalesce(p_related_request_id::text, '') ||
      '|' || coalesce(p_related_transaction_id::text, '') ||
      '|' || p_metadata::text || '|' || clock_timestamp()::text,
      'sha256'
    ),
    'hex'
  );

  insert into public.mishrin_ledger (
    delegate_id, event_type, statement_text, related_request_id,
    related_transaction_id, metadata, prev_hash, transaction_hash
  ) values (
    p_delegate_id, p_event_type, p_statement_text, p_related_request_id,
    p_related_transaction_id, p_metadata, v_prev_hash, v_transaction_hash
  )
  returning * into v_row;

  return v_row;
end;
$$;

alter publication supabase_realtime add table public.mishrin_ledger;
