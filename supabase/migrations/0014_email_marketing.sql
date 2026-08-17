-- ===== Fase 3 — Email marketing =====
-- Campañas (con bloques del page builder), segmentos, automatizaciones,
-- dominios verificados por organizador, eventos de email (métricas) y bajas
-- granulares por calendario. Reutiliza la cola `email_queue` existente.
--
-- Orden por dependencias de FK: segments → email_campaigns → automations →
-- verified_domains → email_events → email_unsubscribes → alter email_queue.

-- ---------------------------------------------------------------------------
-- segments: definición reutilizable de audiencia. `kind` elige el resolvedor
-- (ver src/lib/email/segments.ts); `config` jsonb lleva parámetros (event_id,
-- count, etc.). Solo el organizador del calendario puede CRUD sus segmentos.
-- ---------------------------------------------------------------------------
create table if not exists public.segments (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  name text not null,
  kind text not null check (kind in (
    'event_going','event_registered','event_waitlist','event_attended',
    'event_no_show','calendar_members','past_attendees'
  )),
  config jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists segments_calendar_id_idx on public.segments(calendar_id);
create trigger segments_set_updated_at
  before update on public.segments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- email_campaigns: una campaña va a una comunidad (calendar_id obligatorio).
-- Opcionalmente asociada a un evento (event_id) para campañas de un evento.
-- `blocks` es un jsonb array ordenado de {type, config} (mismo catálogo que
-- el page builder). `status` controla el ciclo de vida.
-- ---------------------------------------------------------------------------
create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  name text not null,
  subject text not null,
  preheader text,
  blocks jsonb not null default '[]'::jsonb,
  segment_id uuid references public.segments(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','scheduled','sending','sent','canceled')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  recipient_count int not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_campaigns_calendar_id_idx on public.email_campaigns(calendar_id);
create index if not exists email_campaigns_status_idx on public.email_campaigns(status);
create trigger email_campaigns_set_updated_at
  before update on public.email_campaigns
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- automations: pipeline de trigger + pasos. `trigger` elige el disparador;
-- `config` lleva params del trigger (p.ej. event_id o ventana de no-show);
-- `steps` es un jsonb array ordenado de pasos:
--   {id, type:'send_email'|'add_to_segment'|'wait', subject, blocks,
--    delay_minutes, segment_id}
-- La ejecución encola emails en `email_queue` con template='automation' y un
-- snapshot del cuerpo renderado en `payload` (para que ediciones posteriores
-- del automation no cambién históricos).
-- ---------------------------------------------------------------------------
create table if not exists public.automations (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  name text not null,
  enabled boolean not null default true,
  trigger text not null check (trigger in (
    'registration_created','event_published','reminder_24h','reminder_1h',
    'event_ended','no_show','new_member'
  )),
  config jsonb not null default '{}'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists automations_calendar_id_idx on public.automations(calendar_id);
create index if not exists automations_enabled_trigger_idx on public.automations(enabled, trigger);
create trigger automations_set_updated_at
  before update on public.automations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- verified_domains: dominio verificado por organizador (vía Resend). El
-- from-address al enviar usa el dominio verificado si lo hay; si no, fallback
-- al EMAIL_FROM por defecto. `records` guarda los DNS que Resend pide setear.
-- ---------------------------------------------------------------------------
create table if not exists public.verified_domains (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  domain text not null,
  status text not null default 'pending' check (status in ('pending','verified','failed')),
  resend_id text,
  records jsonb not null default '[]'::jsonb,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (calendar_id, domain)
);

create index if not exists verified_domains_calendar_id_idx on public.verified_domains(calendar_id);
create index if not exists verified_domains_domain_idx on public.verified_domains(domain);

-- ---------------------------------------------------------------------------
-- email_events: métricas por entrega (sent/delivered/opened/clicked/bounced/
-- complained/unsubscribed). Solo escribe el service_role (tracking routes con
-- admin client). `calendar_id` permite scopear las métricas por organizador.
-- ---------------------------------------------------------------------------
create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid references public.email_queue(id) on delete cascade,
  campaign_id uuid references public.email_campaigns(id) on delete cascade,
  calendar_id uuid references public.calendars(id) on delete cascade,
  event_type text not null check (event_type in (
    'sent','delivered','opened','clicked','bounced','complained','unsubscribed'
  )),
  occurred_at timestamptz not null default now(),
  url text,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists email_events_queue_id_idx on public.email_events(queue_id);
create index if not exists email_events_campaign_id_idx on public.email_events(campaign_id, event_type);
create index if not exists email_events_calendar_id_idx on public.email_events(calendar_id, occurred_at);

-- ---------------------------------------------------------------------------
-- email_unsubscribes: baja granular por calendario. El worker salta envíos a
-- direcciones con registro activo para el calendar_id correspondiente. La
-- inscripción la hace la ruta pública /email/unsubscribe vía admin client.
-- ---------------------------------------------------------------------------
create table if not exists public.email_unsubscribes (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  email text not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (calendar_id, email)
);

create index if not exists email_unsubscribes_calendar_email_idx
  on public.email_unsubscribes(calendar_id, email);

-- ---------------------------------------------------------------------------
-- Extender email_queue: enlazar con campaign/automation, calendar_id para
-- scopear métricas, message_id de Resend (para webhooks) y context jsonb
-- (variables del destinatario, para reusar en reintentos/preview). También
-- ampliamos el CHECK de template para 'campaign' y 'automation'.
-- ---------------------------------------------------------------------------
alter table public.email_queue
  add column if not exists campaign_id uuid references public.email_campaigns(id) on delete set null,
  add column if not exists automation_id uuid references public.automations(id) on delete set null,
  add column if not exists calendar_id uuid references public.calendars(id) on delete cascade,
  add column if not exists message_id text,
  add column if not exists context jsonb not null default '{}'::jsonb;

-- Soltar y recrear el CHECK de template para incluir los nuevos tipos.
alter table public.email_queue drop constraint if exists email_queue_template_check;
alter table public.email_queue
  add constraint email_queue_template_check
  check (template in (
    'confirmation','reminder_24h','reminder_1h','changed','thankyou','welcome',
    'campaign','automation'
  ));

create index if not exists email_queue_campaign_id_idx on public.email_queue(campaign_id);
create index if not exists email_queue_automation_id_idx on public.email_queue(automation_id);
create index if not exists email_queue_calendar_id_idx on public.email_queue(calendar_id);

-- ============ RLS ============

-- email_campaigns: owner/host del calendario.
alter table public.email_campaigns enable row level security;
drop policy if exists email_campaigns_select on public.email_campaigns;
create policy email_campaigns_select on public.email_campaigns
  for select using (public.is_calendar_member(calendar_id, array['owner','host']));
drop policy if exists email_campaigns_insert on public.email_campaigns;
create policy email_campaigns_insert on public.email_campaigns
  for insert with check (public.is_calendar_member(calendar_id, array['owner','host']));
drop policy if exists email_campaigns_update on public.email_campaigns;
create policy email_campaigns_update on public.email_campaigns
  for update using (public.is_calendar_member(calendar_id, array['owner','host']))
  with check (public.is_calendar_member(calendar_id, array['owner','host']));
drop policy if exists email_campaigns_delete on public.email_campaigns;
create policy email_campaigns_delete on public.email_campaigns
  for delete using (public.is_calendar_member(calendar_id, array['owner']));

-- segments: owner/host del calendario.
alter table public.segments enable row level security;
drop policy if exists segments_select on public.segments;
create policy segments_select on public.segments
  for select using (public.is_calendar_member(calendar_id, array['owner','host']));
drop policy if exists segments_insert on public.segments;
create policy segments_insert on public.segments
  for insert with check (public.is_calendar_member(calendar_id, array['owner','host']));
drop policy if exists segments_update on public.segments;
create policy segments_update on public.segments
  for update using (public.is_calendar_member(calendar_id, array['owner','host']))
  with check (public.is_calendar_member(calendar_id, array['owner','host']));
drop policy if exists segments_delete on public.segments;
create policy segments_delete on public.segments
  for delete using (public.is_calendar_member(calendar_id, array['owner','host']));

-- automations: owner/host del calendario.
alter table public.automations enable row level security;
drop policy if exists automations_select on public.automations;
create policy automations_select on public.automations
  for select using (public.is_calendar_member(calendar_id, array['owner','host']));
drop policy if exists automations_insert on public.automations;
create policy automations_insert on public.automations
  for insert with check (public.is_calendar_member(calendar_id, array['owner','host']));
drop policy if exists automations_update on public.automations;
create policy automations_update on public.automations
  for update using (public.is_calendar_member(calendar_id, array['owner','host']))
  with check (public.is_calendar_member(calendar_id, array['owner','host']));
drop policy if exists automations_delete on public.automations;
create policy automations_delete on public.automations
  for delete using (public.is_calendar_member(calendar_id, array['owner','host']));

-- verified_domains: owner/host del calendario.
alter table public.verified_domains enable row level security;
drop policy if exists verified_domains_select on public.verified_domains;
create policy verified_domains_select on public.verified_domains
  for select using (public.is_calendar_member(calendar_id, array['owner','host']));
drop policy if exists verified_domains_insert on public.verified_domains;
create policy verified_domains_insert on public.verified_domains
  for insert with check (public.is_calendar_member(calendar_id, array['owner','host']));
drop policy if exists verified_domains_update on public.verified_domains;
create policy verified_domains_update on public.verified_domains
  for update using (public.is_calendar_member(calendar_id, array['owner','host']))
  with check (public.is_calendar_member(calendar_id, array['owner','host']));
drop policy if exists verified_domains_delete on public.verified_domains;
create policy verified_domains_delete on public.verified_domains
  for delete using (public.is_calendar_member(calendar_id, array['owner','host']));

-- email_events: lectura para organizadores; escritura solo service_role.
alter table public.email_events enable row level security;
drop policy if exists email_events_select on public.email_events;
create policy email_events_select on public.email_events
  for select using (public.is_calendar_member(calendar_id, array['owner','host']));

-- email_unsubscribes: lectura para organizadores; escritura solo service_role.
alter table public.email_unsubscribes enable row level security;
drop policy if exists email_unsubscribes_select on public.email_unsubscribes;
create policy email_unsubscribes_select on public.email_unsubscribes
  for select using (public.is_calendar_member(calendar_id, array['owner','host']));

-- ============ Grants ============
-- Tablas con RLS (el acceso a filas lo decide RLS):
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.email_campaigns,
     public.segments,
     public.automations,
     public.verified_domains
  TO anon, authenticated;

-- Métricas y bajas: solo lectura para authenticated (organizadores vía RLS).
GRANT SELECT ON public.email_events, public.email_unsubscribes TO authenticated;

-- service_role: acceso total a las tablas nuevas (el grant global de 0011
-- solo aplica a tablas existentes en ese momento).
GRANT ALL PRIVILEGES
  ON public.email_campaigns,
     public.segments,
     public.automations,
     public.verified_domains,
     public.email_events,
     public.email_unsubscribes
  TO service_role;
