-- Cola de emails (Resend-ready). Para MVP: se encola y un worker marca como 'sent'
-- sin enviar de verdad (o envía si RESEND_API_KEY está configurado).
create table if not exists public.email_queue (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  registration_id uuid references public.registrations(id) on delete cascade,
  template text not null check (template in ('confirmation','reminder_24h','reminder_1h','changed','thankyou','welcome')),
  to_email text not null,
  to_name text,
  subject text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  attempts int not null default 0,
  last_error text,
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_queue_status_scheduled_idx on public.email_queue(status, scheduled_for);
create index if not exists email_queue_event_id_idx on public.email_queue(event_id);

-- Sin RLS pública: solo service_role accede. Aseguramos RLS sin policies.
alter table public.email_queue enable row level security;
