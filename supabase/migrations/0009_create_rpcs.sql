-- RPCs de creación atómica (evitan problemas de chicken-and-egg con RLS).

-- Crear calendario + membresía owner del creador en un solo paso.
create or replace function public.create_calendar(
  p_slug text,
  p_name text,
  p_description text default null
)
returns public.calendars
language plpgsql
security definer
set search_path = public
as $$
declare cal public.calendars%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.calendars (slug, name, description, owner_id)
  values (p_slug, p_name, p_description, auth.uid())
  returning * into cal;

  insert into public.calendar_members (calendar_id, user_id, role)
  values (cal.id, auth.uid(), 'owner');

  return cal;
end;
$$;

-- Crear evento + ticket gratis + bloque hero por defecto en un solo paso.
-- Solo owner/host del calendario puede crear eventos.
create or replace function public.create_event(
  p_calendar_id uuid,
  p_slug text,
  p_title text,
  p_starts_at timestamptz,
  p_ends_at timestamptz default null,
  p_description text default null,
  p_timezone text default 'UTC',
  p_location_type text default 'in_person',
  p_venue_name text default null,
  p_address text default null,
  p_online_url text default null,
  p_capacity int default null,
  p_status text default 'draft',
  p_cover_url text default null
)
returns public.events
language plpgsql
security definer
set search_path = public
as $$
declare
  ev public.events%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if not public.is_calendar_member(p_calendar_id) then
    raise exception 'not_authorized';
  end if;
  if p_status not in ('draft','published') then
    raise exception 'invalid_status';
  end if;

  insert into public.events (
    calendar_id, slug, title, description, starts_at, ends_at, timezone,
    location_type, venue_name, address, online_url, capacity, status, cover_url, created_by
  )
  values (
    p_calendar_id, p_slug, p_title, p_description, p_starts_at, p_ends_at, p_timezone,
    p_location_type, p_venue_name, p_address, p_online_url, p_capacity, p_status, p_cover_url, auth.uid()
  )
  returning * into ev;

  -- Ticket gratis por defecto
  insert into public.ticket_types (event_id, name, price_cents, currency, order_idx)
  values (ev.id, 'RSVP', 0, 'USD', 0);

  -- Bloque hero por defecto
  insert into public.page_blocks (event_id, type, order_idx, config)
  values (ev.id, 'hero', 0, jsonb_build_object(
    'subtitle', coalesce(p_description, ''),
    'cta_label', 'Reservar lugar'
  ));

  return ev;
end;
$$;
