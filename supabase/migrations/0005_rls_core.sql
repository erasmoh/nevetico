-- ============ RLS ============

-- profiles
alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (true);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- calendars
alter table public.calendars enable row level security;
drop policy if exists calendars_select on public.calendars;
create policy calendars_select on public.calendars
  for select using (true);

drop policy if exists calendars_insert on public.calendars;
create policy calendars_insert on public.calendars
  for insert with check (owner_id = auth.uid());

drop policy if exists calendars_update on public.calendars;
create policy calendars_update on public.calendars
  for update using (public.is_calendar_member(id, array['owner','host']))
  with check (public.is_calendar_member(id, array['owner','host']));

drop policy if exists calendars_delete on public.calendars;
create policy calendars_delete on public.calendars
  for delete using (public.is_calendar_member(id, array['owner']));

-- calendar_members
alter table public.calendar_members enable row level security;
drop policy if exists calendar_members_select on public.calendar_members;
create policy calendar_members_select on public.calendar_members
  for select using (true);

drop policy if exists calendar_members_insert on public.calendar_members;
create policy calendar_members_insert on public.calendar_members
  for insert with check (public.is_calendar_member(calendar_id, array['owner','host']));

drop policy if exists calendar_members_update on public.calendar_members;
create policy calendar_members_update on public.calendar_members
  for update using (public.is_calendar_member(calendar_id, array['owner','host']))
  with check (public.is_calendar_member(calendar_id, array['owner','host']));

drop policy if exists calendar_members_delete on public.calendar_members;
create policy calendar_members_delete on public.calendar_members
  for delete using (public.is_calendar_member(calendar_id, array['owner','host']) or user_id = auth.uid());

-- events
alter table public.events enable row level security;
drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select using (status = 'published' or public.is_calendar_member(calendar_id));

drop policy if exists events_insert on public.events;
create policy events_insert on public.events
  for insert with check (public.is_calendar_member(calendar_id));

drop policy if exists events_update on public.events;
create policy events_update on public.events
  for update using (public.is_calendar_member(calendar_id, array['owner','host']))
  with check (public.is_calendar_member(calendar_id, array['owner','host']));

drop policy if exists events_delete on public.events;
create policy events_delete on public.events
  for delete using (public.is_calendar_member(calendar_id, array['owner']));

-- ticket_types
alter table public.ticket_types enable row level security;
drop policy if exists ticket_types_select on public.ticket_types;
create policy ticket_types_select on public.ticket_types
  for select using (public.event_visible_to_current_user(event_id));

drop policy if exists ticket_types_write on public.ticket_types;
create policy ticket_types_write on public.ticket_types
  for all using (public.is_event_organizer(event_id))
  with check (public.is_event_organizer(event_id));
