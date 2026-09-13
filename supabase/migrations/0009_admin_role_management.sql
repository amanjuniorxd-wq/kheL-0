-- Admin role management, exposed as a real UI panel instead of the
-- one-line SQL update the README asks operators to run by hand today.
--
-- Mirrors the shape of set_verification_tier() (migration 0008): a
-- single-purpose, is_admin()-gated SECURITY DEFINER function that
-- touches only the `role` column, not the rest of the profile, and
-- writes its own attributed ledger entry so every promotion/demotion is
-- itself a public, auditable fact — the same guarantee the README
-- already promises for badge grants and status overrides.

-- Prevents the one failure mode a same-column-only function can't catch
-- on its own: an admin demoting themselves (or the last remaining admin)
-- and locking every admin route behind a SQL console again.
create or replace function public.set_user_role(
  p_target_id uuid,
  p_role text
)
returns public.profiles
language plpgsql
security definer set search_path = public
as $$
declare
  v_row public.profiles;
  v_admin_id uuid := auth.uid();
  v_admin_count int;
begin
  if not public.is_admin(v_admin_id) then
    raise exception 'set_user_role: % is not an admin', v_admin_id;
  end if;

  if p_role not in ('user', 'admin') then
    raise exception 'set_user_role: invalid role %', p_role;
  end if;

  if p_role = 'user' then
    select count(*) into v_admin_count from public.profiles where role = 'admin';
    if v_admin_count <= 1 then
      raise exception 'set_user_role: cannot demote the last remaining admin';
    end if;
  end if;

  update public.profiles
  set role = p_role, updated_at = now()
  where id = p_target_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'set_user_role: no profile with id %', p_target_id;
  end if;

  perform public.append_mishrin_entry(
    v_admin_id,
    'admin_override',
    format('Role set to "%s" for profile %s by admin.', p_role, p_target_id),
    null, null,
    jsonb_build_object('target_profile_id', p_target_id, 'new_role', p_role)
  );

  return v_row;
end;
$$;

grant execute on function public.set_user_role(uuid, text) to authenticated;
