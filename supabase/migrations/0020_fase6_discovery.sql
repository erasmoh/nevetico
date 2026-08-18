-- ===== Fase 6 — Descubrimiento, referrals e importador =====
-- Columnas nuevas en events para filtrado en /explore (city, topic), tabla
-- referrals para atribuir registros, y tabla import_jobs para el importador
-- de eventos desde Luma/Eventbrite (CSV o URL).
--
-- city se puede derivar del address, pero tenerla como columna permite
-- filtrado indexado y que el organizador la setee explícitamente. topic es
-- una categoría libre (tech, design, business, music…). Ambas nullable para
-- no romper eventos existentes.

-- ---------------------------------------------------------------------------
-- events: city + topic para /explore
-- ---------------------------------------------------------------------------
alter table public.events
  add column if not exists city text,
  add column if not exists topic text;

create index if not exists events_city_idx on public.events(city) where city is not null and status = 'published';
create index if not exists events_topic_idx on public.events(topic) where topic is not null and status = 'published';
create index if not exists events_published_starts_at_idx
  on public.events(starts_at) where status = 'published';

-- ---------------------------------------------------------------------------
-- referrals: atribuir registros a quien compartió el link. El ref_code es
-- un slug corto único por perfil (para URLs limpias: /e/<id>?ref=juandi).
-- referral_attributions registra qué registro vino de qué referrer.
-- ---------------------------------------------------------------------------
create table if not exists public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now(),
  unique (profile_id)
);

create index if not exists referral_codes_profile_id_idx on public.referral_codes(profile_id);
create index if not exists referral_codes_code_idx on public.referral_codes(code);

create table if not exists public.referral_attributions (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  ref_code text not null,
  created_at timestamptz not null default now(),
  unique (registration_id)
);

create index if not exists referral_attributions_event_id_idx on public.referral_attributions(event_id);
create index if not exists referral_attributions_referrer_id_idx on public.referral_attributions(referrer_id);

-- ---------------------------------------------------------------------------
-- import_jobs: log de importaciones de eventos (CSV o URL de Luma/Eventbrite).
-- El organizador sube un CSV o pega una URL; el job procesa y crea eventos.
-- payload guarda el CSV completo o la URL; result guarda los eventos creados.
-- ---------------------------------------------------------------------------
create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid references public.calendars(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  source text not null check (source in ('csv','luma_url','eventbrite_url')),
  status text not null default 'pending'
    check (status in ('pending','processing','completed','failed')),
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists import_jobs_calendar_id_idx on public.import_jobs(calendar_id);
create index if not exists import_jobs_profile_id_idx on public.import_jobs(profile_id);
create trigger import_jobs_set_updated_at
  before update on public.import_jobs
  for each row execute function public.set_updated_at();

-- ============ RLS ============

-- referral_codes: lectura propia (el usuario ve su código). Escritura solo
-- service_role (la action lo crea/upserta con admin client).
alter table public.referral_codes enable row level security;
drop policy if exists referral_codes_select on public.referral_codes;
create policy referral_codes_select on public.referral_codes
  for select using (profile_id = auth.uid());

-- referral_attributions: lectura para el organizador del evento (para ver
-- top referrers) y para el propio referrer (para ver sus atribuciones).
-- Escritura solo service_role (la action de registro la inserta).
alter table public.referral_attributions enable row level security;
drop policy if exists referral_attributions_select on public.referral_attributions;
create policy referral_attributions_select on public.referral_attributions
  for select using (
    public.is_event_organizer(event_id) or referrer_id = auth.uid()
  );

-- import_jobs: lectura/escritura para el organizador del calendario.
alter table public.import_jobs enable row level security;
drop policy if exists import_jobs_select on public.import_jobs;
create policy import_jobs_select on public.import_jobs
  for select using (
    profile_id = auth.uid()
    or (calendar_id is not null and public.is_calendar_member(calendar_id, array['owner','host']))
  );
drop policy if exists import_jobs_insert on public.import_jobs;
create policy import_jobs_insert on public.import_jobs
  for insert with check (profile_id = auth.uid());
drop policy if exists import_jobs_update on public.import_jobs;
create policy import_jobs_update on public.import_jobs
  for update using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ============ Grants ============
GRANT SELECT ON public.referral_codes TO authenticated;
GRANT SELECT ON public.referral_attributions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.import_jobs TO authenticated;

-- service_role: acceso total a las tablas nuevas.
GRANT ALL PRIVILEGES
  ON public.referral_codes,
     public.referral_attributions,
     public.import_jobs
  TO service_role;
