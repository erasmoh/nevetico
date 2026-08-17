-- ===== Fase 4a — Entitlements sin pago =====
-- Plan por perfil (community/pro/business) + flag de admin + overrides
-- manuales de asistentes por evento y por perfil. Feature flag global de
-- pricing en `app_settings`. Sin Stripe: el plan se asigna a mano desde la
-- admin UI. El límite efectivo de un recurso de comunidad = plan del owner
-- del calendario; el de un evento personal = plan del created_by.

-- ---------------------------------------------------------------------------
-- profiles: plan + is_admin + override de asistentes
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists plan text not null default 'community'
    check (plan in ('community','pro','business')),
  add column if not exists is_admin boolean not null default false,
  add column if not exists max_attendees_override int
    check (max_attendees_override is null or max_attendees_override > 0);

-- El owner de un perfil solo puede setear su display_name/avatar (RLS ya lo
-- cubre). plan/is_admin/override solo los muta un admin (server action con
-- admin client) o el service_role. La policy de update existente permite
-- `id = auth.uid()` para todo, así que la reforzamos con un check restrictivo:
-- el usuario puede tocar display_name/avatar_url, pero no plan/is_admin/override.
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    -- No permitir auto-escalarse de plan ni darse is_admin ni tocarse overrides.
    and plan = (select p.plan from public.profiles p where p.id = profiles.id)
    and is_admin = (select p.is_admin from public.profiles p where p.id = profiles.id)
    and max_attendees_override is not distinct from (
      select p.max_attendees_override from public.profiles p where p.id = profiles.id
    )
  );

-- ---------------------------------------------------------------------------
-- events: override de asistentes (límite efectivo por evento)
-- ---------------------------------------------------------------------------
alter table public.events
  add column if not exists max_attendees_override int
    check (max_attendees_override is null or max_attendees_override > 0);

-- ---------------------------------------------------------------------------
-- app_settings: feature flags globales (clave/valor jsonb). Fila única por
-- clave. La usamos para `pricing_enabled` (bool): cuando está en false, la
-- app se comporta como todo-free (sin gating por plan) — útil para prender
-- el pricing/pro tiers cuando se quiera empezar a cobrar.
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- Valor inicial: pricing apagado (todo fluye como free). La admin UI lo prende.
insert into public.app_settings (key, value)
values ('pricing_enabled', 'false'::jsonb)
on conflict (key) do nothing;

-- RLS: lectura pública (los componentes leen el flag para mostrar/ocultar
-- nudges y el gating client-side es solo cosmético); escritura solo admin.
alter table public.app_settings enable row level security;
drop policy if exists app_settings_select on public.app_settings;
create policy app_settings_select on public.app_settings
  for select using (true);

-- ---------------------------------------------------------------------------
-- Helper: plan efectivo de un usuario. Si pricing_enabled = false, devuelve
-- 'pro' para todos (así el gating server-side se relaja sin tocar filas).
-- Security definer para poder leer app_settings sin grant extra.
-- ---------------------------------------------------------------------------
create or replace function public.user_plan(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when coalesce(
      (select (value->>'pricing_enabled')::boolean from public.app_settings where key = 'pricing_enabled'),
      false
    ) then
      coalesce(
        (select plan from public.profiles where id = p_user_id),
        'community'
      )
    else
      'pro'
  end
$$;

-- Plan efectivo del owner de un calendario (para límites por comunidad).
create or replace function public.calendar_owner_plan(p_cal_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.user_plan(
    (select owner_id from public.calendars where id = p_cal_id)
  )
$$;

-- Plan efectivo del organizador de un evento (owner del calendario, o
-- created_by si es evento personal).
create or replace function public.event_organizer_plan(p_ev_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when e.calendar_id is not null then public.calendar_owner_plan(e.calendar_id)
    else public.user_plan(e.created_by)
  end
  from public.events e
  where e.id = p_ev_id
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
-- app_settings: lectura pública, escritura solo service_role / admin client.
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT SELECT, UPDATE, INSERT, DELETE ON public.app_settings TO service_role;

-- profiles: el SELECT ya está granted en 0010; el plan es legible por todos
-- (necesario para que los componentes decidan gating client-side). El UPDATE
-- ya está granted; la policy nueva restringe qué columnas puede tocar el
-- usuario. service_role hereda todo en 0011.
-- Ningún grant nuevo necesario para anon/authenticated sobre profiles.

-- Las funciones helper son security definer; ejecutarlas puede cualquiera.
GRANT EXECUTE
  ON FUNCTION public.user_plan,
               public.calendar_owner_plan,
               public.event_organizer_plan
  TO anon, authenticated;

-- service_role: las funciones ya están cubiertas por el grant global de 0011,
-- pero por consistencia con migraciones posteriores lo dejamos explícito.
GRANT EXECUTE
  ON FUNCTION public.user_plan,
               public.calendar_owner_plan,
               public.event_organizer_plan
  TO service_role;
