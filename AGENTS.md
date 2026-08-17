<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Nevetico — notas del proyecto

Plataforma de eventos tipo Luma, plan Community gratis para comunidades. Stack:
Next.js 16 (App Router, RSC, Server Actions, Turbopack) + Tailwind v4 +
shadcn/ui (estilo `base-nova` sobre `@base-ui/react`) + Supabase (Postgres,
Auth, RLS, Storage) local para desarrollo. Ver `PLAN.md` para el producto
completo y el roadmap por fases.

## Comandos

- `npm run dev` — Next dev (Turbopack). Si el puerto 3000 está ocupado usa
  otro (p.ej. 3002).
- `npm run build` / `npm run typecheck` — build y typecheck. **Antes de
  `tsc --noEmit`**: borrar `tsconfig.tsbuildinfo` y `.next/cache/.tsbuildinfo`
  si se añadieron rutas nuevas (el cache incremental se queda con un
  `AppRoutes` stale y falla aunque `next build` pase).
- `npm run supabase:start` / `supabase:stop` / `supabase:reset` — ciclo de
  vida del stack local. `reset` recrea la DB, aplica migraciones y el seed.
- `npm run db:types` — regenera `src/lib/database.types.ts` desde el schema
  local. Correrlo tras cualquier cambio en migraciones.

## Flujo de trabajo (Git)

Cada **fase** del roadmap (`PLAN.md` §6) va en su propia rama y se mergea vía
PR, no directo a `main`:

1. Crear rama desde `main` con nombre descriptivo, p.ej.
   `devin/faseN-<slug-corto>` (siguiendo el patrón `devin/1786935087-fase2-page-builder`
   ya usado) o `feat/faseN-<slug>`.
2. Trabajar, commitear por sub-pasos significativos (esquema, librerías,
   actions, UI, verificación).
3. Verificar: `rm -f tsconfig.tsbuildinfo && npm run typecheck && npm run build`,
   y si toca migraciones: `npm run supabase:reset && npm run db:types`.
4. `git push -u origin <rama>`.
5. Abrir PR con `gh pr create` (título `Fase N: <tema>` y body con resumen +
   plan de pruebas). **No mergear sin confirmación del usuario.**

`main` solo recibe merges de estos PRs. Excepción: cambios triviales
(docs, fix mínimo) pueden ir directo a `main` con permiso explícito.

Notas:
- Antes de empezar una fase, `git fetch --all --prune` y revisar si ya hay
  ramas remotas (`origin/devin/...`) con trabajo previo que mergear a `main`
  antes de arrancar la nueva.
- El usuario decide cuándo pushear/mergear; no hacerlo sin pedirlo.

## Supabase local

- URL: http://127.0.0.1:54321 · Studio: http://127.0.0.1:54323 ·
  Mailpit: http://127.0.0.1:54324
- Las claves están en `.env.local` (no se commitea). Se regeneran con
  `supabase stop && supabase start`.
- Usuario demo (seed): `demo@nevetico.local`, owner del calendario
  `tech-meetup-cdmx` con un evento publicado. Se accede por **magic link**
  (sin contraseña): en `/login` mete ese correo → revisa Mailpit
  (http://127.0.0.1:54324) → clic en "Your sign-in link" → entra a `/dashboard`.
- Auth es solo **magic link** (email + enlace, flujo PKCE). No hay
  contraseña ni formulario de registro: el primer enlace crea la cuenta.
  El `display_name` se infiere de la parte local del email (trigger
  `handle_new_user`). Config de redirects en `supabase/config.toml`
  (`site_url` + `additional_redirect_urls` con localhost:3000/3002 y
  `/auth/callback`); al cambiarla hay que `supabase stop && supabase start`.

## Notas clave (gotchas)

- **GRANTs explícitos obligatorios**: las versiones nuevas de Supabase no
  auto-exponen tablas a `anon`/`authenticated`/`service_role`
  (`auto_expose_new_tables = false` por defecto). Toda tabla nueva necesita
  `GRANT ... TO anon, authenticated` (y RLS controla filas). El
  `service_role` necesita grants para el admin client (cola de emails,
  etc.). Ver `supabase/migrations/0010_grants.sql` y `0011`.
- **Next 16 — proxy, no middleware**: el refresh de sesión va en
  `src/proxy.ts` (`export function proxy`). `cookies()`, `headers()`,
  `params` y `searchParams` son async (`await`).
- **shadcn/base-ui — `render`, no `asChild`**: la composición polimórfica
  usa `render={<Link href="..." />}` (no `asChild`).
- **RPCs atómicas**: `create_calendar`, `create_event` y
  `register_for_event` son `security definer` para evitar chicken-and-egg
  de RLS y condiciones de carrera en el cupo/waitlist. Los inserts directos
  en `registrations` están denegados por RLS (solo vía RPC).
- **Eventos personales vs de comunidad**: `events.calendar_id` es nullable.
  Si es null → evento personal (organizador = `created_by`, URL `/e/[id]`).
  Si no es null → evento de comunidad (organizador = miembro owner/host,
  URL `/c/[calendarSlug]/[eventSlug]`). El helper `is_event_organizer`
  cubre ambos casos; la RLS de events y la vista pública también.
- **Emails**: `enqueueEmail` (admin) inserta en `email_queue`; el worker
  `/api/email/process?secret=$CRON_SECRET` procesa la cola. Sin
  `RESEND_API_KEY` marca como `sent` (stub); con ella envía de verdad.
- **SMTP con Resend (magic links reales)**: `supabase/config.toml` tiene
  `[auth.email.smtp]` apuntando a `smtp.resend.com:465`, user `resend`,
  pass `env(RESEND_API_KEY)`. La key vive en `.env` (raíz, gitignored) que
  el CLI de Supabase carga al arrancar. Al cambiar la config SMTP hay que
  `supabase stop && supabase start` (no basta `db reset`). Sin dominio
  verificado en Resend, `admin_email = onboarding@resend.dev` SOLO entrega
  al correo del dueño de la cuenta de Resend; para enviar a cualquier
  asistente, verifica un dominio en Resend y cambia `admin_email` y
  `EMAIL_FROM` a `Nevetico <no-reply@tudominio.com>`.

## Page builder y temas (Fase 2)

- **Catálogo de bloques**: `src/lib/blocks.ts` define, por tipo de bloque, sus
  campos (`FieldDef`) y defaults. El editor pinta el formulario desde ahí
  (`src/components/builder/fields-editor.tsx`) y las server actions validan
  el `config` contra esos campos (allowlist de claves). Para agregar un
  bloque: entrada en `BLOCK_DEFS` + componente en
  `src/components/event/blocks/` + case en el dispatcher `blocks/index.tsx` +
  el tipo en el CHECK de `page_blocks.type` (migración).
- **Temas**: `src/lib/theme.ts` (presets, fuentes, `parseTheme`, `themeCss`).
  El tema vive en `events.theme` / `calendars.theme` (jsonb) y se aplica por
  scope: la página pública envuelve todo en `data-nvt="<scope>"` e inyecta
  `<style>{themeCss(scope, theme)}</style>`, así no contamina el resto de la
  app. Las fuentes se cargan en `src/app/layout.tsx` como CSS vars
  (`--font-sans-base`, `--font-grotesk`, `--font-display`, `--font-rounded`).
- **Plantillas**: `src/lib/templates.ts` (meetup, conferencia, workshop,
  hackathon). Se aplican con la RPC `apply_event_template` (borra y reinserta
  bloques en orden). El reordenado usa `reorder_page_blocks`. Ambas son
  `security definer` y validan `is_event_organizer`.
- **HTML custom**: el bloque `custom` pasa por `src/lib/sanitize.ts`
  (allowlist de etiquetas, sin scripts/estilos) y los embeds solo aceptan
  URLs https en un iframe con sandbox.
- **Dominio propio**: `calendars.custom_domain` + `src/lib/custom-domain.ts`.
  El proxy reescribe `midominio.com/*` → `/c/<slug>/*` (cache en memoria de
  60s). Las rutas de app (`/api`, `/auth`, `/email`, `/login`, `/dashboard`,
  `/c`, `/e`) no se reescriben.

## Email marketing (Fase 3)

Campañas, segmentos, automatizaciones, dominios verificados y métricas — todo
al alcance del organizador de la comunidad desde
`/dashboard/calendars/[slug]/{emails,segments,automations,domains}`.

- **Esquema** (migración `0014_email_marketing.sql`): `email_campaigns`,
  `segments`, `automations`, `verified_domains`, `email_events`,
  `email_unsubscribes`, + columnas en `email_queue` (`campaign_id`,
  `automation_id`, `calendar_id`, `message_id`, `context`) y CHECK de
  `template` ampliado con `'campaign'` y `'automation'`. RLS: owner/host del
  calendario hace CRUD; `email_events`/`email_unsubscribes` son lectura para
  organizadores y escritura solo `service_role`. Grants explícitos en la misma
  migración (incluido `service_role`, que no hereda los de `0011`).
- **Campañas**: cuerpo = array jsonb de bloques del page builder (mismo
  `BLOCK_DEFS`). `enqueueCampaignRecipients` (`src/lib/email/send-campaign.ts`)
  resuelve el segmento, filtra bajas y encola en `email_queue` con
  `template='campaign'`. El cron `/api/campaigns/process?secret=$CRON_SECRET`
  encola las programadas vencidas; "Enviar ahora" va por la action
  `sendCampaignNow`. Vista previa real vía POST `/api/email/preview`.
- **Segmentos**: catálogo client-safe en `src/lib/email/segment-types.ts`
  (¡no importar de `segments.ts`, que es server-only por el admin client!).
  El resolver (`src/lib/email/segments.ts`) usa el admin client para leer
  registros cruzando eventos. Kinds: `event_going`, `event_registered`,
  `event_waitlist`, `event_attended`, `event_no_show`, `calendar_members`,
  `past_attendees`.
- **Automatizaciones**: pipeline trigger + pasos (`send_email` con bloques,
  `wait`). Motor en `src/lib/email/automation-engine.ts`. Triggers de evento
  (`registration_created`, `event_published`) los disparan las actions de
  RSVP/publish; los temporales (`reminder_24h`, `reminder_1h`, `event_ended`,
  `no_show`) los evalúa el cron `/api/automations/run?secret=$CRON_SECRET`
  (dedupe por `email_queue` existente). El cuerpo de cada paso se renderiza en
  el worker (no se guarda el HTML en la fila).
- **Render de email**: `src/lib/email/render.ts` convierte bloques a HTML de
  email (tablas + estilos inline) + texto plano. Recibe `wrapLink`/`openPixelUrl`
  por destinatario, así los tokens de tracking se generan fuera. Variables
  `{first_name}`, `{event_title}`, `{rsvp_url}`, `{unsubscribe_url}`…
  (`src/lib/email/variables.ts`).
- **Tracking**: tokens firmados (HMAC de `queue_id`) en
  `src/lib/email/tracking.ts` (secreto `TRACKING_SECRET` o fallback
  `CRON_SECRET`). `/api/email/track/open` → GIF 1x1 + `email_events('opened')`
  (dedup por queue); `/api/email/track/click?u=` → `email_events('clicked')` +
  302 a la URL (solo http/https/mailto). `/email/unsubscribe` es pública, usa
  admin client, inserta `email_unsubscribes` (única por calendar+email) + el
  evento `'unsubscribed'`. El worker salta envíos a direcciones dadas de baja.
- **Dominios verificados**: `src/lib/email/resend-domains.ts` llama a la API
  de Resend (create/get/verify/delete). El worker usa el dominio verificado del
  calendario como `from` (fallback `EMAIL_FROM`). Requiere `RESEND_API_KEY`;
  sin dominio verificado, Resend solo entrega al dueño de la cuenta (ver nota
  SMTP arriba).
- **Crons** (todos con `x-cron-secret` o `?secret=`): `/api/email/process`
  (cola), `/api/campaigns/process` (programadas), `/api/automations/run`
  (triggers temporales). En local se pegan a mano; en prod irían en Vercel
  Cron / Supabase cron cada ~5-10 min.

## Estructura

- `src/app/(auth)` — login/signup. `src/app/(app)` — dashboard protegido.
  `src/app/c/[calendarSlug]` y `/c/[calendarSlug]/[eventSlug]` — páginas
  públicas. `src/app/email/unsubscribe` — baja pública.
  `src/app/api/{email/process,email/track/*,email/preview,campaigns/process,automations/run}`
  — worker + tracking + crons.
- `src/app/actions` — server actions (auth, calendars, events, registrations,
  checkin, page-blocks, campaigns, segments, automations, email-domains).
- `src/lib/email` — cola, render, segmentos (resolver + tipos), motor de
  automatizaciones, tracking, variables, dominios Resend, envío de campañas.
- `src/components/{builder,email}` — page builder + builder de email/bloques,
  segmentos, automatizaciones, dominios.
- `src/lib/supabase` — clientes server/client/admin/proxy.
- `supabase/migrations` — esquema + RLS + RPCs + grants.

