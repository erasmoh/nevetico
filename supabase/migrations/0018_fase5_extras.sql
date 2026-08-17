-- ===== Fase 5 — Sponsors avanzado, certificados, CFP, widget/API/webhooks =====
-- 7 tablas nuevas + RLS + grants. Orden por dependencias de FK.

-- ---------------------------------------------------------------------------
-- sponsor_stats: impresiones y clicks de logos de sponsors en la página
-- pública del evento. Una fila por (event_id, sponsor_name, date). La route
-- /api/s/track la incrementa. El portal del sponsor la lee.
-- ---------------------------------------------------------------------------
create table if not exists public.sponsor_stats (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  calendar_id uuid references public.calendars(id) on delete cascade,
  sponsor_name text not null,
  logo_url text,
  link text,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  stat_date date not null default current_date,
  updated_at timestamptz not null default now(),
  unique (event_id, sponsor_name, stat_date)
);

create index if not exists sponsor_stats_event_id_idx on public.sponsor_stats(event_id);
create index if not exists sponsor_stats_calendar_id_idx on public.sponsor_stats(calendar_id);
create trigger sponsor_stats_set_updated_at
  before update on public.sponsor_stats
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- certificates: certificados de asistencia con QR verificable. El
-- organizador los emite para los asistentes con check-in. El token es único
-- y se valida en /verify/[token].
-- ---------------------------------------------------------------------------
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  registration_id uuid references public.registrations(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  email text not null,
  name text,
  token text not null unique default gen_random_uuid(),
  issued_at timestamptz not null default now(),
  issued_by uuid references public.profiles(id) on delete set null,
  unique (event_id, email)
);

create index if not exists certificates_event_id_idx on public.certificates(event_id);
create index if not exists certificates_token_idx on public.certificates(token);
create index if not exists certificates_email_idx on public.certificates(email);

-- ---------------------------------------------------------------------------
-- cfp_proposals: propuestas de charlas para un evento. El organizador las
-- revisa (pending/approved/rejected). Las approved son visibles para votación.
-- ---------------------------------------------------------------------------
create table if not exists public.cfp_proposals (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  abstract text not null,
  format text default 'talk' check (format in ('talk','workshop','lightning','panel')),
  duration_minutes int check (duration_minutes is null or duration_minutes > 0),
  speaker_name text not null,
  speaker_email text not null,
  speaker_bio text,
  speaker_link text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cfp_proposals_event_id_idx on public.cfp_proposals(event_id);
create index if not exists cfp_proposals_status_idx on public.cfp_proposals(status);
create trigger cfp_proposals_set_updated_at
  before update on public.cfp_proposals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- cfp_votes: votos de la comunidad sobre propuestas aprobadas. Un voto por
-- (proposal_id, email) para evitar duplicados (no requiere login).
-- ---------------------------------------------------------------------------
create table if not exists public.cfp_votes (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.cfp_proposals(id) on delete cascade,
  email text not null,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (proposal_id, email)
);

create index if not exists cfp_votes_proposal_id_idx on public.cfp_votes(proposal_id);

-- ---------------------------------------------------------------------------
-- api_keys: claves de API para acceso programático por calendario. El hash
-- se guarda (no la clave en plano); la clave se muestra solo al crearla.
-- ---------------------------------------------------------------------------
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  name text not null,
  key_hash text not null,
  key_prefix text not null,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists api_keys_calendar_id_idx on public.api_keys(calendar_id);
create index if not exists api_keys_key_hash_idx on public.api_keys(key_hash);

-- ---------------------------------------------------------------------------
-- webhooks: endpoints registrados por el organizador para recibir eventos.
-- `events` es un array de nombres de eventos a los que está suscrito.
-- `secret` se usa para firmar el payload (HMAC) en el header X-Nevetico-Signature.
-- ---------------------------------------------------------------------------
create table if not exists public.webhooks (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  url text not null,
  events jsonb not null default '[]'::jsonb,
  secret text not null default gen_random_uuid(),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists webhooks_calendar_id_idx on public.webhooks(calendar_id);
create index if not exists webhooks_enabled_idx on public.webhooks(enabled);

-- ---------------------------------------------------------------------------
-- webhook_deliveries: log de envíos de webhooks (para reintentos y debug).
-- ---------------------------------------------------------------------------
create table if not exists public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  webhook_id uuid not null references public.webhooks(id) on delete cascade,
  event_type text not null,
  payload jsonb not null,
  status_code int,
  response_body text,
  sent_at timestamptz not null default now(),
  success boolean not null default false
);

create index if not exists webhook_deliveries_webhook_id_idx on public.webhook_deliveries(webhook_id);

-- ============ RLS ============

-- sponsor_stats: lectura para organizadores; escritura solo service_role
-- (la route de tracking usa admin client).
alter table public.sponsor_stats enable row level security;
drop policy if exists sponsor_stats_select on public.sponsor_stats;
create policy sponsor_stats_select on public.sponsor_stats
  for select using (public.is_calendar_member(calendar_id, array['owner','host']));

-- certificates: lectura para organizadores y para el propio asistente (por
-- email si está logueado, o por token en la página pública). Escritura solo
-- service_role (el organizador emite vía admin action).
alter table public.certificates enable row level security;
drop policy if exists certificates_select on public.certificates;
create policy certificates_select on public.certificates
  for select using (
    public.is_event_organizer(event_id) or user_id = auth.uid()
  );

-- cfp_proposals: lectura pública si están approved (para votación); todas
-- para el organizador. Insert público (cualquiera puede proponer). Update/
-- delete solo organizador.
alter table public.cfp_proposals enable row level security;
drop policy if exists cfp_proposals_select on public.cfp_proposals;
create policy cfp_proposals_select on public.cfp_proposals
  for select using (
    status = 'approved' or public.is_event_organizer(event_id)
  );
drop policy if exists cfp_proposals_insert on public.cfp_proposals;
create policy cfp_proposals_insert on public.cfp_proposals
  for insert with check (true);
drop policy if exists cfp_proposals_update on public.cfp_proposals;
create policy cfp_proposals_update on public.cfp_proposals
  for update using (public.is_event_organizer(event_id))
  with check (public.is_event_organizer(event_id));
drop policy if exists cfp_proposals_delete on public.cfp_proposals;
create policy cfp_proposals_delete on public.cfp_proposals
  for delete using (public.is_event_organizer(event_id));

-- cfp_votes: insert público (con dedupe por email); lectura pública (para
-- mostrar conteo). No update/delete.
alter table public.cfp_votes enable row level security;
drop policy if exists cfp_votes_select on public.cfp_votes;
create policy cfp_votes_select on public.cfp_votes
  for select using (true);
drop policy if exists cfp_votes_insert on public.cfp_votes;
create policy cfp_votes_insert on public.cfp_votes
  for insert with check (true);

-- api_keys: solo organizador. El key_hash nunca se expone al cliente (la
-- action crea la key y devuelve el valor en plano una sola vez).
alter table public.api_keys enable row level security;
drop policy if exists api_keys_select on public.api_keys;
create policy api_keys_select on public.api_keys
  for select using (public.is_calendar_member(calendar_id, array['owner','host']));
drop policy if exists api_keys_insert on public.api_keys;
create policy api_keys_insert on public.api_keys
  for insert with check (public.is_calendar_member(calendar_id, array['owner','host']));
drop policy if exists api_keys_delete on public.api_keys;
create policy api_keys_delete on public.api_keys
  for delete using (public.is_calendar_member(calendar_id, array['owner']));

-- webhooks: solo organizador.
alter table public.webhooks enable row level security;
drop policy if exists webhooks_select on public.webhooks;
create policy webhooks_select on public.webhooks
  for select using (public.is_calendar_member(calendar_id, array['owner','host']));
drop policy if exists webhooks_insert on public.webhooks;
create policy webhooks_insert on public.webhooks
  for insert with check (public.is_calendar_member(calendar_id, array['owner','host']));
drop policy if exists webhooks_update on public.webhooks;
create policy webhooks_update on public.webhooks
  for update using (public.is_calendar_member(calendar_id, array['owner','host']))
  with check (public.is_calendar_member(calendar_id, array['owner','host']));
drop policy if exists webhooks_delete on public.webhooks;
create policy webhooks_delete on public.webhooks
  for delete using (public.is_calendar_member(calendar_id, array['owner','host']));

-- webhook_deliveries: solo organizador (log de envíos).
alter table public.webhook_deliveries enable row level security;
drop policy if exists webhook_deliveries_select on public.webhook_deliveries;
create policy webhook_deliveries_select on public.webhook_deliveries
  for select using (
    public.is_calendar_member(
      (select w.calendar_id from public.webhooks w where w.id = webhook_deliveries.webhook_id),
      array['owner','host']
    )
  );

-- ============ Grants ============
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.api_keys,
     public.webhooks
  TO anon, authenticated;

GRANT SELECT ON public.webhook_deliveries TO authenticated;
GRANT SELECT ON public.sponsor_stats TO authenticated;
GRANT SELECT ON public.certificates TO authenticated;

-- CFP: insert público, select público (approved), update/delete organizador.
GRANT SELECT, INSERT ON public.cfp_proposals TO anon, authenticated;
GRANT UPDATE, DELETE ON public.cfp_proposals TO authenticated;
GRANT SELECT, INSERT ON public.cfp_votes TO anon, authenticated;

-- service_role: acceso total a las tablas nuevas.
GRANT ALL PRIVILEGES
  ON public.sponsor_stats,
     public.certificates,
     public.cfp_proposals,
     public.cfp_votes,
     public.api_keys,
     public.webhooks,
     public.webhook_deliveries
  TO service_role;
