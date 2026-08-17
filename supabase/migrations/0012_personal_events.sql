-- Eventos personales: calendar_id ahora es nullable.
-- Un evento con calendar_id = null es "personal": su organizador es created_by.
alter table public.events alter column calendar_id drop not null;

-- is_event_organizer: organiza por comunidad (owner/host) O es el creador
-- (eventos personales). event_visible_to_current_user ya delega en esta.
create or replace function public.is_event_organizer(ev_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.events e
    where e.id = ev_id
      and (
        (e.calendar_id is not null and public.is_calendar_member(e.calendar_id))
        or (e.calendar_id is null and e.created_by = auth.uid())
      )
  );
$$;

-- RLS events: actualizar policies para incluir eventos personales.
drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select using (
    status = 'published'
    or (calendar_id is not null and public.is_calendar_member(calendar_id))
    or (calendar_id is null and created_by = auth.uid())
  );

drop policy if exists events_insert on public.events;
create policy events_insert on public.events
  for insert with check (
    (calendar_id is not null and public.is_calendar_member(calendar_id))
    or (calendar_id is null and created_by = auth.uid())
  );

drop policy if exists events_update on public.events;
create policy events_update on public.events
  for update using (public.is_event_organizer(id))
  with check (public.is_event_organizer(id));

drop policy if exists events_delete on public.events;
create policy events_delete on public.events
  for delete using (public.is_event_organizer(id));

-- create_event: soportar p_calendar_id = null (evento personal).
-- Si es null: no valida membresía de comunidad y el organizador es created_by.
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
declare ev public.events%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if p_calendar_id is not null and not public.is_calendar_member(p_calendar_id) then
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

  insert into public.ticket_types (event_id, name, price_cents, currency, order_idx)
  values (ev.id, 'RSVP', 0, 'USD', 0);

  insert into public.page_blocks (event_id, type, order_idx, config)
  values (ev.id, 'hero', 0, jsonb_build_object(
    'subtitle', coalesce(p_description, ''),
    'cta_label', 'Reservar lugar'
  ));

  return ev;
end;
$$;
