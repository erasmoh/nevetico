-- Fase 2 — Page builder por bloques, temas y branding.

-- Nuevos tipos de bloque: 'text' (texto libre) y 'testimonials'.
alter table public.page_blocks drop constraint if exists page_blocks_type_check;
alter table public.page_blocks add constraint page_blocks_type_check check (type in (
  'hero','text','agenda','speakers','sponsors','gallery','video',
  'faq','map','cta','countdown','testimonials','custom','form'
));

-- Un bloque puede ocultarse sin borrarlo.
alter table public.page_blocks
  add column if not exists visible boolean not null default true;

-- Tema de la página del evento (paleta, tipografía, radios, modo claro/oscuro).
alter table public.events
  add column if not exists theme jsonb not null default '{}'::jsonb;

-- Branding y dominio propio del calendario. El tema del calendario es el
-- valor por defecto de sus eventos (el evento puede sobreescribirlo).
alter table public.calendars
  add column if not exists theme jsonb not null default '{}'::jsonb,
  add column if not exists logo_url text,
  add column if not exists cover_url text,
  add column if not exists custom_domain text;

create unique index if not exists calendars_custom_domain_key
  on public.calendars (lower(custom_domain))
  where custom_domain is not null;

-- Reordenar bloques de forma atómica: p_ids es el orden final deseado.
create or replace function public.reorder_page_blocks(p_event_id uuid, p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_event_organizer(p_event_id) then
    raise exception 'not_authorized';
  end if;

  update public.page_blocks b
  set order_idx = pos.idx
  from (
    select id, (ordinality - 1) as idx
    from unnest(p_ids) with ordinality as t(id, ordinality)
  ) as pos
  where b.id = pos.id and b.event_id = p_event_id;
end;
$$;

-- Aplicar una plantilla: reemplaza los bloques del evento por los recibidos.
-- p_blocks es un array [{ "type": "hero", "config": {...} }, ...] en orden.
create or replace function public.apply_event_template(p_event_id uuid, p_blocks jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_event_organizer(p_event_id) then
    raise exception 'not_authorized';
  end if;
  if jsonb_typeof(p_blocks) <> 'array' then
    raise exception 'invalid_blocks';
  end if;

  delete from public.page_blocks where event_id = p_event_id;

  insert into public.page_blocks (event_id, type, order_idx, config)
  select
    p_event_id,
    b.value->>'type',
    (b.ordinality - 1)::int,
    coalesce(b.value->'config', '{}'::jsonb)
  from jsonb_array_elements(p_blocks) with ordinality as b(value, ordinality);
end;
$$;

grant execute on function public.reorder_page_blocks, public.apply_event_template
  to authenticated;
