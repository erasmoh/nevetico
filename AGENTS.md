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
- `npm run build` / `npm run typecheck` — build y typecheck.
- `npm run supabase:start` / `supabase:stop` / `supabase:reset` — ciclo de
  vida del stack local. `reset` recrea la DB, aplica migraciones y el seed.
- `npm run db:types` — regenera `src/lib/database.types.ts` desde el schema
  local. Correrlo tras cualquier cambio en migraciones.

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
- **Emails**: `enqueueEmail` (admin) inserta en `email_queue`; el worker
  `/api/email/process?secret=$CRON_SECRET` procesa la cola. Sin
  `RESEND_API_KEY` marca como `sent` (stub); con ella envía de verdad.

## Estructura

- `src/app/(auth)` — login/signup. `src/app/(app)` — dashboard protegido.
  `src/app/c/[calendarSlug]` y `/c/[calendarSlug]/[eventSlug]` — páginas
  públicas. `src/app/api/email/process` — worker.
- `src/app/actions` — server actions (auth, calendars, events,
  registrations, checkin).
- `src/lib/supabase` — clientes server/client/admin/proxy.
- `supabase/migrations` — esquema + RLS + RPCs + grants.

