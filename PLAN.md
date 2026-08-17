# Nevetico — Plan: plataforma de eventos tipo Luma (con plan gratuito para comunidades)

## 1. Tesis del producto

Luma es excelente para el evento individual, pero es débil en tres cosas que sí le importan a las comunidades tech/locales:

1. **Customización de la página del evento** (sponsors, galerías, videos, agenda, speakers) — en Luma casi todo es una plantilla fija.
2. **Comunicación con asistentes** — emails transaccionales sí, pero campañas segmentadas, recordatorios personalizados y post-evento son limitados.
3. **Continuidad de la comunidad** — Luma cobra por features de "Luma Plus" a nivel de calendario; las comunidades sin presupuesto quedan fuera.

Estrategia de precios propuesta: **el organizador de comunidad no paga nunca por lo básico** (plan Community gratis, con límites generosos pero reales), y monetizamos a quien vende tickets, a empresas/conferencias y a sponsors. Así el volumen de comunidades gratis se convierte en el canal de adquisición del plan pago.

## 2. Paridad con Luma (base obligatoria)

| Área | Alcance mínimo para paridad |
|---|---|
| Eventos | crear/editar, drafts, eventos recurrentes, multi-sesión, timezone, presencial/online/híbrido |
| Registro | RSVP, aprobación manual, waitlist, cupos, preguntas custom, invitados +1 |
| Tickets | gratis y pagos, tiers, cupones, códigos de descuento, capacidad por tier |
| Calendarios | página de comunidad/calendario, suscripción, follow, feed de próximos eventos |
| Check-in | QR por asistente, app/página de check-in, lista offline |
| Emails | confirmación, recordatorios (24h/1h), cambios de evento, agradecimiento post-evento |
| Descubrimiento | página pública, SEO, explorar por ciudad/tema |
| Integraciones | Google/Apple/Outlook calendar, Zoom/Meet, Stripe, webhooks, API |
| Analytics | vistas, conversión, fuentes de registro, asistencia real |
| Equipo | multi-host, roles, transferencia de propiedad |
| Import/export | CSV de asistentes, importar eventos desde Luma/Eventbrite |

## 3. Donde ganamos ("mejor que Luma")

### 3.1 Page Builder por bloques
Página del evento como lista ordenable de bloques, cada uno con tema propio:
`hero` · `agenda` · `speakers` · `sponsors` (tiers con logos, links, tracking de clicks) · `gallery` (albums, lightbox) · `video` (YouTube/Vimeo/mux embed o hosted) · `faq` · `map` · `sponsor CTA` · `testimonials` · `countdown` · `custom HTML/embed` · `formulario extra`.
Temas: paleta, tipografía, dark/light, CSS variables, dominio propio (`eventos.midominio.com`) y logo. Plantillas prehechas por tipo (meetup, conferencia, workshop, hackathon).

### 3.2 Sponsors como ciudadano de primera clase
- Tiers (Platinum/Gold/…) configurables, logos, copy, links con UTM y conteo de impresiones/clicks.
- **Sponsor portal**: link privado donde el sponsor ve alcance, clicks, y (si el asistente opta-in) leads.
- Paquetes de sponsorship publicables con checkout: el sponsor paga directo desde la página → nueva fuente de ingreso para la comunidad y para nosotros (fee).

### 3.3 Email marketing real (no solo transaccional)
- Editor visual de campañas con las mismas piezas del page builder.
- Segmentos: registrados, asistieron, no asistieron, waitlist, tier de ticket, asistentes de eventos anteriores, miembros del calendario.
- Automatizaciones: bienvenida, secuencia de recordatorios, "te extrañamos", encuesta post-evento, anuncio del próximo evento.
- Dominio verificado del organizador (DKIM/SPF vía Resend/SES), métricas de apertura/click, unsubscribe granular y doble opt-in donde aplique (GDPR).

### 3.4 Comunidad, no solo evento
Perfil de miembro, historial de asistencia, badges/racha, directorio opcional del calendario, matchmaking simple entre asistentes, y "membresías" (gratis o pagas) para la comunidad.

### 3.5 Extras diferenciadores
- Galería post-evento con subida colaborativa de fotos y grabaciones de las charlas.
- Certificados/badges de asistencia con QR verificable.
- CFP (call for papers) y votación de propuestas.
- Widget embebible del calendario para el sitio de la comunidad.
- Multi-idioma (ES/EN/PT) real, incluidos emails.
- API pública + webhooks + MCP/AI: "crea el evento del meetup de septiembre igual al de agosto".

## 4. Planes y precios

| | **Community (gratis)** | **Pro** | **Business** |
|---|---|---|---|
| Precio | $0 | ~$25–39/mes | ~$99–199/mes |
| Para | meetups, comunidades no comerciales | organizadores que venden tickets | empresas, conferencias, agencias |
| Eventos | ilimitados | ilimitados | ilimitados |
| Asistentes por evento | hasta 300 | ilimitado | ilimitado |
| Emails/mes | 3.000 | 25.000 | 150.000 |
| Page builder | todos los bloques | + custom HTML/CSS, A/B de landing | + white-label total |
| Sponsors | hasta 6 logos + 1 tier | tiers ilimitados + portal + tracking | + checkout de paquetes, facturación |
| Tickets pagos | permitido con fee 5% + Stripe | fee 2.5% | fee 1% o 0% con contrato |
| Dominio propio | subdominio nuestro | dominio propio | múltiples dominios |
| Branding | "Powered by" discreto | removible | sin branding |
| Equipo | 3 hosts | 10 | ilimitado + SSO |
| Soporte | comunidad | email | prioritario + onboarding |

Reglas de la "beca comunidad": el plan Community se otorga a calendarios sin fines comerciales y con eventos gratuitos o casi gratuitos; si el calendario factura más de X al año, se le invita a Pro. Verificación ligera (formulario + revisión) para evitar abuso, y sello público "Community Plan" que también sirve de marketing.

Ingresos: suscripciones + fee de ticketing + fee de sponsorship + add-ons (SMS/WhatsApp, video hosting, verificación de certificados, paquete de emails extra).

## 5. Arquitectura propuesta

- **Frontend/Backend**: Next.js 15 (App Router, RSC) + TypeScript + Tailwind + shadcn/ui. Server Actions para mutaciones y rutas API para webhooks/API pública.
- **DB/Auth/Storage**: Supabase (Postgres + RLS + Auth + Storage + Realtime). RLS desde el día 1: todo scoping por `calendar_id` / `event_id`.
- **Pagos**: Stripe (Checkout + Connect para pagar a organizadores, Billing para suscripciones, Tax).
- **Email**: Resend (transaccional + campañas) con React Email; dominios verificados por organizador. Cola de envío con workers.
- **Jobs/colas**: Inngest o Supabase cron + queue table (recordatorios, campañas, digests, reintentos).
- **Media**: Supabase Storage + transformaciones de imagen; Mux (o solo embeds) para video en el plan pago.
- **Analytics**: eventos propios en Postgres + PostHog para producto.
- **Infra**: Vercel + Supabase; Sentry; feature flags por plan (entitlements en DB, no if's dispersos).
- **Mobile**: PWA primero (check-in con cámara, wallet passes); app nativa solo si hay demanda.

Modelo de datos núcleo (resumen):
`users` · `calendars` (comunidad) · `calendar_members(role)` · `events` · `event_sessions` · `ticket_types` · `orders` · `tickets` · `registrations(status: going|waitlist|pending|declined)` · `checkins` · `page_blocks(event_id, type, order, config jsonb)` · `themes` · `sponsors` · `sponsor_tiers` · `sponsor_placements(+impressions, clicks)` · `media_assets` · `galleries` · `email_campaigns` · `email_sends` · `segments` · `automations` · `subscriptions` · `entitlements` · `webhooks` · `audit_log`.

## 6. Roadmap por fases

**Fase 0 — Fundaciones (1 sesión)**
Repo, Next.js + Supabase, auth, esquema base con RLS, deploy, CI.

**Fase 1 — MVP usable (1–2 sesiones)**
Crear evento, página pública, RSVP, calendario de comunidad, emails de confirmación y recordatorio, check-in QR, export CSV. *Criterio de salida: correr un meetup real de punta a punta.*

**Fase 2 — Diferenciador visual (1–2 sesiones)**
Page builder por bloques + temas + bloques de sponsors, galería, video, agenda, speakers. Plantillas. Dominio propio.

**Fase 3 — Emails y comunidad (1 sesión)**
Editor de campañas, segmentos, automatizaciones, dominio verificado por organizador, métricas.

**Fase 4 — Monetización (1–2 sesiones)**
Tickets pagos con Stripe Connect, cupones, planes/entitlements, billing portal, fees, verificación del plan Community.

**Fase 5 — Sponsors avanzado + extras (1–2 sesiones)**
Portal de sponsors, checkout de paquetes, tracking, certificados, CFP, widget embebible, API pública + webhooks.

**Fase 6 — Crecimiento**
Descubrimiento/SEO, importador desde Luma/Eventbrite, referrals, i18n completo, PWA de check-in.

Total estimado: **~8–10 sesiones de trabajo** hasta un producto que compita de verdad; el MVP de Fase 1 se puede tener en la primera o segunda.

## 7. Riesgos y mitigaciones

- **Entregabilidad de email**: el mayor riesgo técnico. Dominios verificados obligatorios para campañas, límites por plan, warmup, monitoreo de bounce/complaint, y suspensión automática ante abuso.
- **Abuso del plan gratis**: límites duros + verificación + rate limits + detección de spam en eventos públicos.
- **Efecto de red de Luma**: no competimos en descubrimiento al inicio; competimos en customización y emails. Importador desde Luma para bajar el costo de cambio.
- **Alcance excesivo**: cada fase debe ser lanzable sola; no empezar Fase 2 sin un meetup real corrido en Fase 1.
- **Pagos/impuestos**: Stripe Connect + Stripe Tax desde el inicio; no construir dinero propio.
- **Privacidad**: consentimiento explícito para compartir datos con sponsors; GDPR/LFPDPPP, borrado de cuenta, DPA.

## 8. Decisiones que necesito de ti

1. ¿Arranco por el MVP de Fase 1 en un repo nuevo (`erasmoh/nevetico`) con Next.js + Supabase, o primero quieres definir marca/nombre y diseño?
2. Nombre y dominio del producto.
3. Prioridad del diferenciador: ¿page builder/sponsors primero, o email marketing primero?
4. ¿Los precios de la tabla te sirven como punto de partida o quieres otro rango?
