-- Eventos
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'UTC',
  location_type text not null default 'in_person' check (location_type in ('in_person','online','hybrid')),
  venue_name text,
  address text,
  online_url text,
  capacity int check (capacity is null or capacity > 0),
  status text not null default 'draft' check (status in ('draft','published','canceled','completed')),
  cover_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (calendar_id, slug)
);

create index if not exists events_calendar_id_idx on public.events(calendar_id);
create index if not exists events_status_starts_at_idx on public.events(status, starts_at);
create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- Tipos de ticket (MVP: tier gratis). price_cents = 0 => gratuito.
create table if not exists public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null default 'RSVP',
  price_cents bigint not null default 0 check (price_cents >= 0),
  currency text not null default 'USD',
  capacity int check (capacity is null or capacity > 0),
  order_idx int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ticket_types_event_id_idx on public.ticket_types(event_id);
