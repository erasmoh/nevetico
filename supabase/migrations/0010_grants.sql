-- Supabase (desde 2026) no expone automáticamente las tablas nuevas a los
-- roles de datos (anon/authenticated). Concedemos privilegios a nivel de
-- tabla; el acceso real a filas lo sigue controlando RLS.
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Tablas con RLS (el acceso a filas lo decide RLS):
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.profiles,
     public.calendars,
     public.calendar_members,
     public.events,
     public.ticket_types,
     public.registrations,
     public.checkins,
     public.page_blocks
  TO anon, authenticated;

-- email_queue: solo service_role. Sin grant a anon/authenticated.

-- Secuencias (por si se usan serial; gen_random_uuid no las requiere).
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Funciones invocables desde la API (RLS bypass vía security definer).
GRANT EXECUTE
  ON FUNCTION public.is_calendar_member,
               public.is_event_organizer,
               public.event_visible_to_current_user,
               public.register_for_event,
               public.create_calendar,
               public.create_event
  TO anon, authenticated;
