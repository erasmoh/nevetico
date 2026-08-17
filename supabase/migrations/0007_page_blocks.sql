-- Bloques de la página del evento (page builder). config es JSONB por tipo.
create table if not exists public.page_blocks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  type text not null check (type in (
    'hero','agenda','speakers','sponsors','gallery','video',
    'faq','map','cta','countdown','custom','form'
  )),
  order_idx int not null default 0,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists page_blocks_event_order_idx on public.page_blocks(event_id, order_idx);

alter table public.page_blocks enable row level security;
drop policy if exists page_blocks_select on public.page_blocks;
create policy page_blocks_select on public.page_blocks
  for select using (public.event_visible_to_current_user(event_id));

drop policy if exists page_blocks_insert on public.page_blocks;
create policy page_blocks_insert on public.page_blocks
  for insert with check (public.is_event_organizer(event_id));

drop policy if exists page_blocks_update on public.page_blocks;
create policy page_blocks_update on public.page_blocks
  for update using (public.is_event_organizer(event_id))
  with check (public.is_event_organizer(event_id));

drop policy if exists page_blocks_delete on public.page_blocks;
create policy page_blocks_delete on public.page_blocks
  for delete using (public.is_event_organizer(event_id));
