-- ===== Fase 4a — Enforce de hosts por plan =====
-- Trigger BEFORE INSERT/UPDATE en calendar_members: limita cuántos miembros
-- con rol 'host' puede tener un calendario según el plan del owner.
--   community = 0 hosts extra (el owner es host por defecto, no cuenta)
--   pro       = 10 hosts extra
--   business  = ilimitado
-- El owner nunca se cuenta (su fila tiene role='owner'). 'member' no se limita.

create or replace function public.enforce_host_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_host_count int;
  v_limit int;
begin
  -- Solo aplica a rol 'host'.
  if new.role <> 'host' then
    return new;
  end if;

  -- Plan del owner del calendario (ya respeta pricing_enabled).
  v_plan := public.calendar_owner_plan(new.calendar_id);

  -- Límite por plan. null = ilimitado. Hardcodeado aquí (espejo de TS).
  v_limit := case v_plan
    when 'community' then 0
    when 'pro' then 10
    else null
  end;

  if v_limit is null then
    return new;
  end if;

  -- Hosts actuales (excluyendo la fila que se inserta/actualiza).
  select count(*) into v_host_count
    from public.calendar_members
    where calendar_id = new.calendar_id
      and role = 'host'
      and (tg_op = 'UPDATE' or user_id <> new.user_id);

  if v_host_count >= v_limit then
    raise exception 'host_limit_exceeded';
  end if;

  return new;
end;
$$;

drop trigger if exists calendar_members_enforce_host_limit on public.calendar_members;
create trigger calendar_members_enforce_host_limit
  before insert or update of role on public.calendar_members
  for each row execute function public.enforce_host_limit();
