-- ===== Fase 4b — Tickets pagos con Stripe Connect =====
-- Orders + cupones + cuentas Connect + verificación Community. Reutiliza
-- `app_settings.pricing_enabled` como toggle ÚNICO: cuando está en false
-- (default), no se pueden crear tickets pagos ni hacer checkout (todo el
-- flujo de pagos está apagado). Cuando está en true, el gating por plan se
-- activa y los tickets pagos se permiten con fee según plan (community=5%,
-- pro=2.5%, business=1%). Sin STRIPE_SECRET_KEY el checkout se stub-ea (mock)
-- para poder probar todo el flujo en local sin cuenta de Stripe.
--
-- Modelo de orders: 1 order puede tener N registrations (quantity tickets).
-- `registrations.order_id` apunta a la order (nullable, solo para pagos).
-- Al confirmar el pago, todas las registrations pending de la order pasan a
-- 'going' (respetando cupo; el excedente va a 'waitlist').
--
-- Orden por dependencias de FK: coupons → orders → alter registrations →
-- stripe_accounts → community_verifications → alter email_queue → RPCs → RLS.

-- ---------------------------------------------------------------------------
-- ticket_types: campos para venta (ventana, min/max per order, active, desc).
-- price_cents/currency/capacity/order_idx ya existen desde 0003.
-- ---------------------------------------------------------------------------
alter table public.ticket_types
  add column if not exists description text,
  add column if not exists sale_start timestamptz,
  add column if not exists sale_end timestamptz,
  add column if not exists min_per_order int not null default 1
    check (min_per_order > 0),
  add column if not exists max_per_order int
    check (max_per_order is null or max_per_order >= min_per_order),
  add column if not exists active boolean not null default true;

-- ---------------------------------------------------------------------------
-- coupons: cupones de descuento por evento. `code` único por evento.
-- `kind`: 'percent' (value_cents = 1-100) o 'fixed' (value_cents = cents a
-- descontar por ticket). `max_uses` (null = ilimitado), `max_uses_per_user`
-- (null = ilimitado). `uses_count` se incrementa al confirmar el pago.
-- ---------------------------------------------------------------------------
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  code text not null,
  kind text not null check (kind in ('percent','fixed')),
  value_cents int not null check (value_cents > 0),
  max_uses int check (max_uses is null or max_uses > 0),
  uses_count int not null default 0 check (uses_count >= 0),
  max_uses_per_user int check (max_uses_per_user is null or max_uses_per_user > 0),
  valid_from timestamptz,
  valid_until timestamptz,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, code),
  check (kind <> 'percent' or value_cents <= 100)
);

create index if not exists coupons_event_id_idx on public.coupons(event_id);
create trigger coupons_set_updated_at
  before update on public.coupons
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- orders: órdenes de compra de tickets pagos. Una order tiene N
-- registrations (quantity). Solo el service_role la crea/muta (vía RPC
-- create_order + confirm_order_payment). El comprador la ve por user_id o
-- por enlace firmado (admin client en la página de la order).
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types(id) on delete restrict,
  user_id uuid references public.profiles(id) on delete set null,
  email text not null,
  name text,
  quantity int not null default 1 check (quantity > 0),
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  fee_cents bigint not null default 0 check (fee_cents >= 0),
  net_cents bigint not null default 0 check (net_cents >= 0),
  currency text not null default 'USD',
  coupon_id uuid references public.coupons(id) on delete set null,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  status text not null default 'pending'
    check (status in ('pending','paid','expired','refunded','canceled')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_event_id_idx on public.orders(event_id);
create index if not exists orders_ticket_type_id_idx on public.orders(ticket_type_id);
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_email_idx on public.orders(email);
create index if not exists orders_status_idx on public.orders(status);
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- registrations: order_id (solo para registros pagos) + status 'pending'
-- (registro pago no confirmado hasta que se complete el checkout).
-- ---------------------------------------------------------------------------
alter table public.registrations
  add column if not exists order_id uuid references public.orders(id) on delete set null;

-- Drop + recreate del CHECK de status para añadir 'pending'. El constraint
-- se nombra automáticamente `registrations_status_check` por Postgres.
alter table public.registrations drop constraint if exists registrations_status_check;
alter table public.registrations
  add constraint registrations_status_check
  check (status in ('going','waitlist','pending','declined','checked_in','canceled'));

create index if not exists registrations_order_id_idx on public.registrations(order_id);

-- ---------------------------------------------------------------------------
-- stripe_accounts: conexión Connect Express del organizador. Un organizador
-- (profile) tiene una cuenta Stripe; la reutiliza para todos sus
-- eventos/calendarios. `details_submitted`/`charges_enabled`/`payouts_enabled`
-- se sincronizan desde Stripe (retrieveAccount).
-- ---------------------------------------------------------------------------
create table if not exists public.stripe_accounts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  stripe_account_id text not null unique,
  details_submitted boolean not null default false,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id)
);

create index if not exists stripe_accounts_profile_id_idx on public.stripe_accounts(profile_id);
create trigger stripe_accounts_set_updated_at
  before update on public.stripe_accounts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- community_verifications: verificación ligera del plan Community. El owner
-- del calendario envía un formulario (url, descripción, declaración sin
-- fines comerciales, acepta términos). El admin revisa (approve/reject/
-- needs_info). Unique partial index: solo una pendiente/needs_info por
-- calendar a la vez (pueden quedar filas históricas approved/rejected).
-- ---------------------------------------------------------------------------
create table if not exists public.community_verifications (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  submitted_by uuid references public.profiles(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','needs_info')),
  form_data jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  notes text
);

create index if not exists community_verifications_calendar_id_idx
  on public.community_verifications(calendar_id);
-- Solo una fila activa (pending/needs_info) por calendar.
create unique index if not exists community_verifications_calendar_active_uniq
  on public.community_verifications(calendar_id)
  where status in ('pending','needs_info');

-- ---------------------------------------------------------------------------
-- email_queue: ampliar el CHECK de template con 'ticket_confirmation' y
-- 'refund'. El constraint se nombra `email_queue_template_check`.
-- ---------------------------------------------------------------------------
alter table public.email_queue drop constraint if exists email_queue_template_check;
alter table public.email_queue
  add constraint email_queue_template_check
  check (template in (
    'confirmation','reminder_24h','reminder_1h','changed','thankyou','welcome',
    'campaign','automation','ticket_confirmation','refund'
  ));

-- ===========================================================================
-- RPC: create_order
-- Crea una order pending + N registrations pending para un ticket pago.
-- Valida: pricing_enabled, ticket del evento con price_cents > 0, ventana de
-- venta, active, cupo (ticket capacity + evento capacity + plan-cap), cupón
-- (aplicable, vigente, no excedido, límite por usuario). Calcula discount,
-- fee (según plan del organizador) y net. Security definer para bypass RLS.
-- Devuelve la order row (el caller crea la Checkout Session aparte).
-- ===========================================================================
create or replace function public.create_order(
  p_event_id uuid,
  p_ticket_type_id uuid,
  p_email text,
  p_name text default null,
  p_quantity int default 1,
  p_user_id uuid default null,
  p_coupon_code text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  ev public.events%rowtype;
  tt public.ticket_types%rowtype;
  v_plan text;
  v_profile_override int;
  v_plan_cap int;
  v_effective_cap int;
  going_count int;
  available int;
  v_coupon public.coupons%rowtype;
  v_coupon_found boolean := false;
  v_subtotal bigint;
  v_discount bigint := 0;
  v_fee_bps int;
  v_fee bigint;
  v_net bigint;
  v_order public.orders%rowtype;
  v_reg public.registrations%rowtype;
  v_user_coupon_uses int;
begin
  -- Toggle global: si pricing_enabled = false, no hay pagos.
  if not coalesce(
    (select (value->>'pricing_enabled')::boolean from public.app_settings where key = 'pricing_enabled'),
    false
  ) then
    raise exception 'payments_disabled';
  end if;

  -- Validar evento publicado.
  select * into ev from public.events where id = p_event_id for update;
  if not found or ev.status <> 'published' then
    raise exception 'event_not_found_or_not_published';
  end if;

  -- Validar ticket: del evento, pago, activo, en ventana de venta.
  select * into tt from public.ticket_types
    where id = p_ticket_type_id and event_id = p_event_id
    for update;
  if not found then
    raise exception 'ticket_not_found';
  end if;
  if tt.price_cents <= 0 then
    raise exception 'ticket_not_paid';
  end if;
  if not tt.active then
    raise exception 'ticket_not_active';
  end if;
  if tt.sale_start is not null and now() < tt.sale_start then
    raise exception 'sale_not_started';
  end if;
  if tt.sale_end is not null and now() > tt.sale_end then
    raise exception 'sale_ended';
  end if;
  if tt.min_per_order is not null and p_quantity < tt.min_per_order then
    raise exception 'below_min_per_order';
  end if;
  if tt.max_per_order is not null and p_quantity > tt.max_per_order then
    raise exception 'above_max_per_order';
  end if;

  -- Plan del organizador (respeta pricing_enabled implícito).
  v_plan := public.event_organizer_plan(p_event_id);

  -- Override del perfil del organizador (owner del calendar o created_by).
  if ev.calendar_id is not null then
    select p.max_attendees_override into v_profile_override
      from public.profiles p
      join public.calendars c on c.owner_id = p.id
      where c.id = ev.calendar_id;
  else
    select p.max_attendees_override into v_profile_override
      from public.profiles p
      where p.id = ev.created_by;
  end if;

  -- Plan-cap de asistentes (espejo de entitlements.ts).
  v_plan_cap := case v_plan
    when 'community' then 100
    else null
  end;

  -- Cap efectivo = menor de (capacity, override-evento, override-perfil, plan-cap).
  v_effective_cap := null;
  if ev.capacity is not null then
    v_effective_cap := ev.capacity;
  end if;
  if ev.max_attendees_override is not null then
    v_effective_cap := case when v_effective_cap is null then ev.max_attendees_override
                           else least(v_effective_cap, ev.max_attendees_override) end;
  end if;
  if v_profile_override is not null then
    v_effective_cap := case when v_effective_cap is null then v_profile_override
                           else least(v_effective_cap, v_profile_override) end;
  end if;
  if v_plan_cap is not null then
    v_effective_cap := case when v_effective_cap is null then v_plan_cap
                           else least(v_effective_cap, v_plan_cap) end;
  end if;

  -- Cupo disponible (going + pending cuentan como ocupados para tickets pagos).
  select count(*) into going_count
    from public.registrations
    where event_id = p_event_id and status in ('going','pending');

  if v_effective_cap is not null then
    available := v_effective_cap - going_count;
    if available <= 0 then
      raise exception 'event_sold_out';
    end if;
    if p_quantity > available then
      raise exception 'not_enough_seats';
    end if;
  end if;

  -- Cupo por tier (ticket capacity).
  if tt.capacity is not null then
    select count(*) into going_count
      from public.registrations
      where event_id = p_event_id and ticket_type_id = tt.id
        and status in ('going','pending');
    available := tt.capacity - going_count;
    if available <= 0 then
      raise exception 'tier_sold_out';
    end if;
    if p_quantity > available then
      raise exception 'not_enough_tier_seats';
    end if;
  end if;

  -- Cupón (opcional).
  if p_coupon_code is not null then
    select * into v_coupon from public.coupons
      where event_id = p_event_id and upper(code) = upper(p_coupon_code)
      for update;
    if not found then
      raise exception 'coupon_not_found';
    end if;
    if not v_coupon.active then
      raise exception 'coupon_inactive';
    end if;
    if v_coupon.valid_from is not null and now() < v_coupon.valid_from then
      raise exception 'coupon_not_yet_valid';
    end if;
    if v_coupon.valid_until is not null and now() > v_coupon.valid_until then
      raise exception 'coupon_expired';
    end if;
    if v_coupon.max_uses is not null and v_coupon.uses_count >= v_coupon.max_uses then
      raise exception 'coupon_max_uses_reached';
    end if;
    -- Límite por usuario: cuenta orders paid con ese cupón del mismo user/email.
    if v_coupon.max_uses_per_user is not null then
      select count(*) into v_user_coupon_uses
        from public.orders
        where coupon_id = v_coupon.id and status = 'paid'
          and (
            (p_user_id is not null and user_id = p_user_id)
            or email = lower(p_email)
          );
      if v_user_coupon_uses >= v_coupon.max_uses_per_user then
        raise exception 'coupon_user_limit_reached';
      end if;
    end if;
    v_coupon_found := true;
  end if;

  -- Cálculos de precio. Subtotal = unit_price * quantity.
  v_subtotal := tt.price_cents * p_quantity;
  if v_coupon_found then
    if v_coupon.kind = 'percent' then
      v_discount := v_subtotal * v_coupon.value_cents / 100;
    else -- fixed: descuenta value_cents por ticket, capped al subtotal.
      v_discount := least(v_coupon.value_cents * p_quantity, v_subtotal);
    end if;
  end if;

  -- Net al organizador = subtotal - discount.
  -- Fee = net * fee_bps / 10000 (community=500, pro=250, business=100).
  -- Net final al organizador = net - fee.
  v_fee_bps := case v_plan
    when 'community' then 500
    when 'pro' then 250
    when 'business' then 100
    else 500
  end;
  v_fee := (v_subtotal - v_discount) * v_fee_bps / 10000;
  v_net := (v_subtotal - v_discount) - v_fee;

  -- Crear la order pending.
  insert into public.orders (
    event_id, ticket_type_id, user_id, email, name, quantity,
    unit_price_cents, discount_cents, fee_cents, net_cents, currency,
    coupon_id, status
  )
  values (
    p_event_id, tt.id, p_user_id, lower(p_email), p_name, p_quantity,
    tt.price_cents, v_discount, v_fee, v_net, tt.currency,
    case when v_coupon_found then v_coupon.id else null end,
    'pending'
  )
  returning * into v_order;

  -- Crear N registrations pending (una por ticket).
  for i in 1..p_quantity loop
    insert into public.registrations (
      event_id, ticket_type_id, user_id, email, name, status, order_id
    )
    values (
      p_event_id, tt.id, p_user_id, lower(p_email), p_name, 'pending', v_order.id
    )
    returning * into v_reg;
  end loop;

  return v_order;
end;
$$;

-- ===========================================================================
-- RPC: confirm_order_payment (solo service_role / admin client)
-- Marca la order como paid, promueve sus registrations pending → going (o
-- waitlist si se llenó el cupo), incrementa uses_count del cupón. Devuelve
-- datos para que el caller encole emails. Seguridad: se llama solo desde el
-- webhook de Stripe o el mock, siempre con admin client.
-- ===========================================================================
create or replace function public.confirm_order_payment(
  p_order_id uuid,
  p_stripe_session_id text default null,
  p_stripe_pi_id text default null
)
returns table (
  order_id uuid,
  event_id uuid,
  event_title text,
  event_slug text,
  calendar_id uuid,
  email text,
  name text,
  registration_ids uuid[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_ev public.events%rowtype;
  v_plan text;
  v_profile_override int;
  v_plan_cap int;
  v_effective_cap int;
  v_going_count int;
  v_new_status text;
  v_reg_ids uuid[] := '{}';
  r record;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found';
  end if;
  if v_order.status <> 'pending' then
    raise exception 'order_not_pending';
  end if;

  select * into v_ev from public.events where id = v_order.event_id for update;

  -- Cap efectivo (mismo cálculo que create_order/register_for_event).
  v_plan := public.event_organizer_plan(v_order.event_id);
  if v_ev.calendar_id is not null then
    select p.max_attendees_override into v_profile_override
      from public.profiles p
      join public.calendars c on c.owner_id = p.id
      where c.id = v_ev.calendar_id;
  else
    select p.max_attendees_override into v_profile_override
      from public.profiles p
      where p.id = v_ev.created_by;
  end if;
  v_plan_cap := case v_plan when 'community' then 100 else null end;
  v_effective_cap := null;
  if v_ev.capacity is not null then v_effective_cap := v_ev.capacity; end if;
  if v_ev.max_attendees_override is not null then
    v_effective_cap := case when v_effective_cap is null then v_ev.max_attendees_override
                           else least(v_effective_cap, v_ev.max_attendees_override) end;
  end if;
  if v_profile_override is not null then
    v_effective_cap := case when v_effective_cap is null then v_profile_override
                           else least(v_effective_cap, v_profile_override) end;
  end if;
  if v_plan_cap is not null then
    v_effective_cap := case when v_effective_cap is null then v_plan_cap
                           else least(v_effective_cap, v_plan_cap) end;
  end if;

  -- Marcar order como paid.
  update public.orders
    set status = 'paid',
        paid_at = now(),
        stripe_checkout_session_id = coalesce(p_stripe_session_id, stripe_checkout_session_id),
        stripe_payment_intent_id = coalesce(p_stripe_pi_id, stripe_payment_intent_id)
    where id = p_order_id;

  -- Incrementar uses_count del cupón (1 uso por order, sin importar quantity).
  if v_order.coupon_id is not null then
    update public.coupons set uses_count = uses_count + 1 where id = v_order.coupon_id;
  end if;

  -- Promover registrations pending → going/waitlist respetando cupo.
  for r in
    select id from public.registrations
      where order_id = p_order_id and status = 'pending'
      order by created_at
  loop
    select count(*) into v_going_count
      from public.registrations
      where event_id = v_order.event_id and status = 'going';

    if v_effective_cap is null or v_going_count < v_effective_cap then
      v_new_status := 'going';
    else
      v_new_status := 'waitlist';
    end if;

    update public.registrations
      set status = v_new_status
      where id = r.id;
    v_reg_ids := array_append(v_reg_ids, r.id);
  end loop;

  return query
    select
      v_order.id as order_id,
      v_ev.id as event_id,
      v_ev.title as event_title,
      v_ev.slug as event_slug,
      v_ev.calendar_id as calendar_id,
      v_order.email as email,
      v_order.name as name,
      v_reg_ids as registration_ids;
end;
$$;

-- ===========================================================================
-- RPC: cancel_order (solo service_role). Para orders expired (checkout no
-- completado) o refunded. Pasa sus registrations pending → canceled.
-- ===========================================================================
create or replace function public.cancel_order(
  p_order_id uuid,
  p_new_status text default 'canceled'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_new_status not in ('expired','canceled','refunded') then
    raise exception 'invalid_new_status';
  end if;
  update public.orders set status = p_new_status where id = p_order_id;
  update public.registrations
    set status = 'canceled'
    where order_id = p_order_id and status in ('pending','going','waitlist');
end;
$$;

-- ===========================================================================
-- register_for_event: reescribir con p_ticket_type_id opcional + bloqueo de
-- tickets pagos. Si el ticket tiene price_cents > 0 → raise
-- 'paid_ticket_requires_checkout' (el flujo pago va por create_order).
-- Defensa en profundidad: si !pricing_enabled y price_cents > 0 → también
-- raise 'payments_disabled'.
--
-- NOTA: la versión de 0016 tenía 4 params (sin p_ticket_type_id). Al añadir
-- el 5º param, `create or replace` crea un overload en vez de reemplazar.
-- Dropeamos la firma antigua explícitamente para evitar ambigüedad en los
-- GRANTs y llamadas RPC.
-- ===========================================================================
drop function if exists public.register_for_event(uuid, text, text, uuid);
create or replace function public.register_for_event(
  p_event_id uuid,
  p_email text,
  p_name text default null,
  p_user_id uuid default null,
  p_ticket_type_id uuid default null
)
returns public.registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  ev public.events%rowtype;
  tt public.ticket_types%rowtype;
  going_count int;
  new_status text;
  reg public.registrations;
  v_plan text;
  v_profile_override int;
  v_plan_cap int;
  v_effective_cap int;
  v_pricing_enabled boolean;
begin
  select * into ev from public.events where id = p_event_id for update;
  if not found or ev.status <> 'published' then
    raise exception 'event_not_found_or_not_published';
  end if;

  -- Toggle global de pagos.
  v_pricing_enabled := coalesce(
    (select (value->>'pricing_enabled')::boolean from public.app_settings where key = 'pricing_enabled'),
    false
  );

  -- Seleccionar ticket: el indicado o el primero gratis del evento (MVP).
  if p_ticket_type_id is not null then
    select * into tt from public.ticket_types
      where id = p_ticket_type_id and event_id = p_event_id
      for update;
  else
    select * into tt
      from public.ticket_types
      where event_id = p_event_id and price_cents = 0
      order by order_idx, created_at
      limit 1
      for update;
  end if;
  if not found then
    raise exception 'no_ticket_type';
  end if;

  -- Bloqueo de tickets pagos: el flujo pago va por create_order.
  if tt.price_cents > 0 then
    if not v_pricing_enabled then
      raise exception 'payments_disabled';
    end if;
    raise exception 'paid_ticket_requires_checkout';
  end if;

  -- Plan efectivo del organizador (respeta pricing_enabled).
  v_plan := public.event_organizer_plan(p_event_id);

  -- Override del perfil del organizador.
  if ev.calendar_id is not null then
    select p.max_attendees_override into v_profile_override
      from public.profiles p
      join public.calendars c on c.owner_id = p.id
      where c.id = ev.calendar_id;
  else
    select p.max_attendees_override into v_profile_override
      from public.profiles p
      where p.id = ev.created_by;
  end if;

  v_plan_cap := case v_plan when 'community' then 100 else null end;

  v_effective_cap := null;
  if ev.capacity is not null then v_effective_cap := ev.capacity; end if;
  if ev.max_attendees_override is not null then
    v_effective_cap := case when v_effective_cap is null then ev.max_attendees_override
                           else least(v_effective_cap, ev.max_attendees_override) end;
  end if;
  if v_profile_override is not null then
    v_effective_cap := case when v_effective_cap is null then v_profile_override
                           else least(v_effective_cap, v_profile_override) end;
  end if;
  if v_plan_cap is not null then
    v_effective_cap := case when v_effective_cap is null then v_plan_cap
                           else least(v_effective_cap, v_plan_cap) end;
  end if;

  -- Sin duplicados activos (por usuario o por email).
  if exists (
    select 1 from public.registrations r
    where r.event_id = p_event_id
      and r.status <> 'canceled'
      and (r.email = lower(p_email) or (p_user_id is not null and r.user_id = p_user_id))
  ) then
    raise exception 'already_registered';
  end if;

  select count(*) into going_count
    from public.registrations
    where event_id = p_event_id and status = 'going';

  if v_effective_cap is null or going_count < v_effective_cap then
    new_status := 'going';
  else
    new_status := 'waitlist';
  end if;

  insert into public.registrations (event_id, ticket_type_id, user_id, email, name, status)
  values (p_event_id, tt.id, p_user_id, lower(p_email), p_name, new_status)
  returning * into reg;

  return reg;
end;
$$;

-- ============ RLS ============

-- orders: lectura para organizadores del evento + el propio comprador
-- (user_id). Escritura solo service_role (RPCs). Los guest buyers (no
-- logueados) ven su order vía enlace firmado con admin client.
alter table public.orders enable row level security;
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
  for select using (
    public.is_event_organizer(event_id) or user_id = auth.uid()
  );
-- Sin policies de insert/update/delete: solo service_role (RPCs).

-- coupons: CRUD solo organizador del evento.
alter table public.coupons enable row level security;
drop policy if exists coupons_select on public.coupons;
create policy coupons_select on public.coupons
  for select using (public.is_event_organizer(event_id));
drop policy if exists coupons_insert on public.coupons;
create policy coupons_insert on public.coupons
  for insert with check (public.is_event_organizer(event_id));
drop policy if exists coupons_update on public.coupons;
create policy coupons_update on public.coupons
  for update using (public.is_event_organizer(event_id))
  with check (public.is_event_organizer(event_id));
drop policy if exists coupons_delete on public.coupons;
create policy coupons_delete on public.coupons
  for delete using (public.is_event_organizer(event_id));

-- stripe_accounts: lectura propia (el organizador ve su cuenta) + admin.
-- Escritura solo service_role (las actions usan admin client).
alter table public.stripe_accounts enable row level security;
drop policy if exists stripe_accounts_select on public.stripe_accounts;
create policy stripe_accounts_select on public.stripe_accounts
  for select using (profile_id = auth.uid());
-- Sin policies de insert/update/delete: service_role + admin client.

-- community_verifications: owner del calendar lee/inserta/update su fila;
-- admin lee/escribe todo. El owner no puede cambiar status (lo hace el
-- admin); puede update form_data/notes solo si status in ('pending',
-- 'needs_info').
alter table public.community_verifications enable row level security;
drop policy if exists community_verifications_select on public.community_verifications;
create policy community_verifications_select on public.community_verifications
  for select using (
    public.is_calendar_member(calendar_id, array['owner']) or (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
    )
  );
drop policy if exists community_verifications_insert on public.community_verifications;
create policy community_verifications_insert on public.community_verifications
  for insert with check (public.is_calendar_member(calendar_id, array['owner']));
drop policy if exists community_verifications_update on public.community_verifications;
create policy community_verifications_update on public.community_verifications
  for update using (public.is_calendar_member(calendar_id, array['owner']))
  with check (
    public.is_calendar_member(calendar_id, array['owner'])
    -- El owner no puede cambiar status (lo hace el admin vía admin action).
    and status = (select cv.status from public.community_verifications cv where cv.id = community_verifications.id)
  );
-- Sin policy de delete: el admin borra vía admin client si hace falta.

-- ============ Grants ============
-- orders: lectura para organizadores + comprador autenticado. El service_role
-- hace las mutaciones vía RPCs.
GRANT SELECT ON public.orders TO authenticated;

-- coupons: CRUD para organizadores.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;

-- stripe_accounts: solo lectura propia. service_role muta.
GRANT SELECT ON public.stripe_accounts TO authenticated;

-- community_verifications: select para owner del calendar + admin; insert/
-- update para owner del calendar.
GRANT SELECT, INSERT, UPDATE ON public.community_verifications TO authenticated;

-- ticket_types: ya tiene grants desde 0010 (SELECT/INSERT/UPDATE/DELETE a
-- authenticated). Las nuevas columnas las heredan automáticamente.

-- service_role: acceso total a las tablas nuevas (no hereda los grants de
-- 0011 para tablas creadas después).
GRANT ALL PRIVILEGES
  ON public.orders,
     public.coupons,
     public.stripe_accounts,
     public.community_verifications
  TO service_role;

-- Ejecutar las RPCs: create_order y register_for_event pueden los
-- authenticated (el comprador invoca create_order desde la página pública,
-- que puede ser anónima — pero la action valida por user/email).
GRANT EXECUTE
  ON FUNCTION public.create_order,
               public.register_for_event
  TO anon, authenticated;

-- confirm_order_payment y cancel_order: solo service_role (webhook/mock).
-- No se grantean a anon/authenticated.

-- service_role: las funciones ya están cubiertas por el grant global de 0011,
-- pero por consistencia lo dejamos explícito.
GRANT EXECUTE
  ON FUNCTION public.create_order,
               public.confirm_order_payment,
               public.cancel_order,
               public.register_for_event
  TO service_role;
