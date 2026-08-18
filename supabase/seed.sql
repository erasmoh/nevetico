-- Seed de desarrollo. Se aplica con `supabase reset` (después de las migraciones).
-- Como RLS está activo y estas tablas requieren auth, usamos el rol service (postgres)
-- saltando RLS mediante la cuenta postgres del CLI.

-- Limpieza (el reset ya recrea el schema, pero por si se corre a mano).
truncate public.checkins, public.registrations, public.page_blocks,
         public.ticket_types, public.events, public.calendar_members,
         public.calendars, public.profiles cascade;

-- Usuario demo (en auth.users). Contraseña: "password123".
-- GoTrue hace Scan de varias columnas a string no-null, así que las seteamos a ''.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, reauthentication_token,
  is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'demo@nevetico.local',
  crypt('password123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Demo Organizador"}'::jsonb,
  now(), now(),
  '', '', '', '',
  '', '', '',
  false, false
) on conflict (id) do nothing;

-- Perfil (el trigger también lo crearía; lo dejamos idempotente).
insert into public.profiles (id, display_name)
values ('00000000-0000-0000-0000-000000000001', 'Demo Organizador')
on conflict (id) do update set display_name = excluded.display_name;

-- Calendario de comunidad
insert into public.calendars (id, slug, name, description, owner_id)
values (
  '00000000-0000-0000-0000-000000000010',
  'tech-meetup-cdmx',
  'Tech Meetup CDMX',
  'Comunidad de developers en Ciudad de México. Meetups mensuales, gratis.',
  '00000000-0000-0000-0000-000000000001'
) on conflict (id) do nothing;

insert into public.calendar_members (calendar_id, user_id, role)
values (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'owner'
) on conflict (calendar_id, user_id) do nothing;

-- Evento publicado
insert into public.events (
  id, calendar_id, slug, title, description, cover_url, starts_at, ends_at, timezone,
  location_type, venue_name, address, capacity, status, created_by
) values (
  '00000000-0000-0000-0000-000000000100',
  '00000000-0000-0000-0000-000000000010',
  'meetup-agosto-2026',
  'Tech Meetup CDMX — Agosto 2026',
  'Una noche de charlas sobre Next.js 16, Supabase y IA. Networking + pizza.',
  'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200&h=1200&fit=crop',
  now() + interval '7 days',
  now() + interval '7 days 3 hours',
  'America/Mexico_City',
  'in_person',
  'Impact Hub CDMX',
  'Av. Reforma 123, CDMX',
  80,
  'published',
  '00000000-0000-0000-0000-000000000001'
) on conflict (id) do nothing;

-- Ticket gratis
insert into public.ticket_types (id, event_id, name, price_cents, currency, order_idx)
values (
  '00000000-0000-0000-0000-000000000200',
  '00000000-0000-0000-0000-000000000100',
  'RSVP General', 0, 'MXN', 0
) on conflict (id) do nothing;

-- Bloques de la página (hero + agenda + map)
insert into public.page_blocks (event_id, type, order_idx, config) values
  ('00000000-0000-0000-0000-000000000100', 'hero', 0,
   '{"subtitle":"Una noche de charlas sobre Next.js 16, Supabase e IA.","cta_label":"Reservar lugar"}'::jsonb),
  ('00000000-0000-0000-0000-000000000100', 'agenda', 1,
   '{"items":[{"time":"18:30","title":"Recepción y networking"},{"time":"19:00","title":"Next.js 16 en producción"},{"time":"19:45","title":"Supabase: RLS en la vida real"},{"time":"20:30","title":"Pizza y networking"}]}'::jsonb),
  ('00000000-0000-0000-0000-000000000100', 'map', 2,
   '{"query":"Impact Hub CDMX Av. Reforma 123"}'::jsonb)
on conflict do nothing;
