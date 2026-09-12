-- Instagram-style verification tiers for profiles. Multiple badge tiers,
-- stacked from lightest to heaviest, plus one singular top tier reserved
-- for the ledger's own namesake/creator account — enforced as literally
-- unique at the database level, not just by convention.

create type public.verification_tier as enum (
  'none',
  'meme',            -- lighthearted/community "verified" tier — grey tick
  'govt',             -- verified government-affiliated account — blue tick
  'govt_authority',   -- verified government AUTHORITY (issuing/oversight body) — gold tick
  'cosmic'            -- singular top tier: "creator of cosmos, Mishrin" — prismatic tick
);

alter table public.profiles
  add column if not exists verification_tier public.verification_tier not null default 'none';

-- Only one profile may ever hold the cosmic tier at a time. This is what
-- actually enforces "there is exactly one creator-of-cosmos badge" rather
-- than just asking nicely in application code.
create unique index if not exists profiles_single_cosmic_tier
  on public.profiles ((verification_tier))
  where verification_tier = 'cosmic';

-- Admin-gated, single-purpose writer: touches ONLY verification_tier, not
-- the rest of a profile (unlike a blanket "admins can update any profile"
-- RLS policy would), and atomically demotes whoever currently holds
-- 'cosmic' before promoting a new holder, so the partial unique index
-- above never has to reject a legitimate re-grant.
create or replace function public.set_verification_tier(
  p_target_id uuid,
  p_tier public.verification_tier
)
returns public.profiles
language plpgsql
security definer set search_path = public
as $$
declare
  v_row public.profiles;
  v_admin_id uuid := auth.uid();
begin
  if not public.is_admin(v_admin_id) then
    raise exception 'set_verification_tier: % is not an admin', v_admin_id;
  end if;

  if p_tier = 'cosmic' then
    update public.profiles set verification_tier = 'none'
    where verification_tier = 'cosmic' and id <> p_target_id;
  end if;

  update public.profiles
  set verification_tier = p_tier, updated_at = now()
  where id = p_target_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'set_verification_tier: no profile with id %', p_target_id;
  end if;

  perform public.append_mishrin_entry(
    v_admin_id,
    'admin_override',
    format('Verification badge set to "%s" for profile %s.', p_tier, p_target_id),
    null, null,
    jsonb_build_object('target_profile_id', p_target_id, 'tier', p_tier)
  );

  return v_row;
end;
$$;

grant execute on function public.set_verification_tier(uuid, public.verification_tier) to authenticated;
