-- Registros / RSVP
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  ticket_type_id uuid references public.ticket_types(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  email text not null,
  name text,
  status text not null default 'going' check (status in ('going','waitlist','pending','declined','checked_in','canceled')),
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists registrations_event_id_idx on public.registrations(event_id);
create index if not exists registrations_event_status_idx on public.registrations(event_id, status);
create index if not exists registrations_user_id_idx on public.registrations(user_id);
create index if not exists registrations_email_idx on public.registrations(email);
create trigger registrations_set_updated_at
  before update on public.registrations
  for each row execute function public.set_updated_at();

-- Check-ins
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  checked_by uuid references public.profiles(id) on delete set null,
  checked_in_at timestamptz not null default now(),
  unique (registration_id)
);

create index if not exists checkins_event_id_idx on public.checkins(event_id);

-- RPC atómica de registro: valida cupo, evita duplicados y maneja waitlist.
-- Se ejecuta como service definer (bypass RLS) para evitar condiciones de carrera.
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
begin
  select * into ev from public.events where id = p_event_id for update;
  if not found or ev.status <> 'published' then
    raise exception 'event_not_found_or_not_published';
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

  if ev.capacity is null or going_count < ev.capacity then
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

-- RLS registrations
alter table public.registrations enable row level security;
drop policy if exists registrations_select on public.registrations;
create policy registrations_select on public.registrations
  for select using (
    public.is_event_organizer(event_id) or user_id = auth.uid()
  );

drop policy if exists registrations_insert on public.registrations;
-- Los inserts se hacen vía RPC (security definer). No se permite insert directo desde el cliente.
create policy registrations_insert on public.registrations
  for insert with check (false);

drop policy if exists registrations_update on public.registrations;
create policy registrations_update on public.registrations
  for update using (public.is_event_organizer(event_id) or user_id = auth.uid())
  with check (public.is_event_organizer(event_id) or user_id = auth.uid());

drop policy if exists registrations_delete on public.registrations;
create policy registrations_delete on public.registrations
  for delete using (public.is_event_organizer(event_id) or user_id = auth.uid());

-- RLS checkins (solo organizador)
alter table public.checkins enable row level security;
drop policy if exists checkins_select on public.checkins;
create policy checkins_select on public.checkins
  for select using (public.is_event_organizer(event_id));

drop policy if exists checkins_insert on public.checkins;
create policy checkins_insert on public.checkins
  for insert with check (public.is_event_organizer(event_id));

drop policy if exists checkins_update on public.checkins;
create policy checkins_update on public.checkins
  for update using (public.is_event_organizer(event_id))
  with check (public.is_event_organizer(event_id));

drop policy if exists checkins_delete on public.checkins;
create policy checkins_delete on public.checkins
  for delete using (public.is_event_organizer(event_id));
