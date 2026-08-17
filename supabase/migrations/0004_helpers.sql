-- Helpers para RLS. Security definer para evitar recursión de policies.
-- ¿El usuario actual es miembro del calendario con uno de los roles indicados?
create or replace function public.is_calendar_member(
  cal_id uuid,
  allowed_roles text[] default array['owner','host']
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.calendar_members cm
    where cm.calendar_id = cal_id
      and cm.user_id = auth.uid()
      and cm.role = any(allowed_roles)
  );
$$;

-- ¿El usuario actual es organizador (owner/host) del calendario al que pertenece el evento?
create or replace function public.is_event_organizer(ev_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.events e
    where e.id = ev_id and public.is_calendar_member(e.calendar_id)
  );
$$;

-- ¿El evento es visible para el usuario actual? (publicado O organizador)
create or replace function public.event_visible_to_current_user(ev_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.events e
    where e.id = ev_id
      and (e.status = 'published' or public.is_event_organizer(ev_id))
  );
$$;
