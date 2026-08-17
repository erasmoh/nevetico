-- ===== Fase 4a — Enforce de límites en register_for_event =====
-- Reescribe la RPC para aplicar el plan-cap de asistentes además del
-- capacity del evento. El plan-cap es independiente del `ev.capacity`:
-- un organizador free con capacity=500 solo admite 100 going; el resto va
-- a waitlist. Overrides: events.max_attendees_override > perfil > plan.

create or replace function public.register_for_event(
  p_event_id uuid,
  p_email text,
  p_name text default null,
  p_user_id uuid default null
)
returns public.registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  ev public.events%rowtype;
  tt public.ticket_types%rowtype;
  going_count int;
  new_status text;
  reg public.registrations;
  v_plan text;
  v_profile_override int;
  v_plan_cap int;  -- null = ilimitado
  v_effective_cap int;  -- menor de (capacity, plan_cap); null si ambos null
begin
  select * into ev from public.events where id = p_event_id for update;
  if not found or ev.status <> 'published' then
    raise exception 'event_not_found_or_not_published';
  end if;

  -- Plan efectivo del organizador (ya respeta pricing_enabled).
  v_plan := public.event_organizer_plan(p_event_id);

  -- Override del perfil del organizador (owner del calendario o created_by).
  if ev.calendar_id is not null then
    select p.max_attendees_override into v_profile_override
      from public.profiles p
      join public.calendars c on c.owner_id = p.id
      where c.id = ev.calendar_id;
  else
    select p.max_attendees_override into v_profile_override
      from public.profiles p
      where p.id = ev.created_by;
  end if;

  -- Plan-cap: community=100, pro/business=null (ilimitado). Hardcodeado aquí
  -- para que la RPC no dependa de TS; el catálogo TS en entitlements.ts es
  -- el espejo. Si cambias uno, cambia el otro.
  v_plan_cap := case v_plan
    when 'community' then 100
    else null
  end;

  -- Cap efectivo = menor de (capacity, override-evento, override-perfil, plan-cap).
  -- null en cualquiera = no limita por esa dimensión.
  v_effective_cap := null;
  if ev.capacity is not null then
    v_effective_cap := ev.capacity;
  end if;
  if ev.max_attendees_override is not null then
    v_effective_cap := case when v_effective_cap is null then ev.max_attendees_override
                           else least(v_effective_cap, ev.max_attendees_override) end;
  end if;
  if v_profile_override is not null then
    v_effective_cap := case when v_effective_cap is null then v_profile_override
                           else least(v_effective_cap, v_profile_override) end;
  end if;
  if v_plan_cap is not null then
    v_effective_cap := case when v_effective_cap is null then v_plan_cap
                           else least(v_effective_cap, v_plan_cap) end;
  end if;

  -- MVP: primer tipo de ticket del evento (gratis)
  select * into tt
    from public.ticket_types
    where event_id = p_event_id
    order by order_idx, created_at
    limit 1
    for update;
  if not found then
    raise exception 'no_ticket_type';
  end if;

  -- Sin duplicados activos (por usuario o por email)
  if exists (
    select 1 from public.registrations r
    where r.event_id = p_event_id
      and r.status <> 'canceled'
      and (r.email = lower(p_email) or (p_user_id is not null and r.user_id = p_user_id))
  ) then
    raise exception 'already_registered';
  end if;

  select count(*) into going_count
    from public.registrations
    where event_id = p_event_id and status = 'going';

  if v_effective_cap is null or going_count < v_effective_cap then
    new_status := 'going';
  else
    new_status := 'waitlist';
  end if;

  insert into public.registrations (event_id, ticket_type_id, user_id, email, name, status)
  values (p_event_id, tt.id, p_user_id, lower(p_email), p_name, new_status)
  returning * into reg;

  return reg;
end;
$$;
