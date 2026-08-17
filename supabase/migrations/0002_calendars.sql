-- Calendarios de comunidad (la "comunidad" en Nevetico)
create table if not exists public.calendars (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger calendars_set_updated_at
  before update on public.calendars
  for each row execute function public.set_updated_at();

-- Miembros de un calendario con rol
create table if not exists public.calendar_members (
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','host','member')),
  created_at timestamptz not null default now(),
  primary key (calendar_id, user_id)
);

create index if not exists calendar_members_user_id_idx on public.calendar_members(user_id);
