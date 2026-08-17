import "server-only";
import { sanitizeHtml } from "@/lib/sanitize";

/**
 * Render de bloques del page builder a HTML de email. Email = tablas + estilos
 * inline (los clientes de correo ignoran casi todo CSS externo/`<style>`).
 * Se usa en:
 *  - el worker `/api/email/process` (envío real, con tracking por destinatario),
 *  - el preview del editor de campañas (sin tracking),
 *  - el motor de automatizaciones (cuerpo de cada paso `send_email`).
 *
 * El render es puro: recibe `wrapLink`/`openPixelUrl` por destinatario, así la
 * generación de tokens de tracking queda fuera de aquí.
 */

export type EmailBlock = { type: string; config: Record<string, unknown> };

export type RenderOptions = {
  /** Variables para interpolar en campos de texto ({first_name}, {event_title}…). */
  vars: Record<string, string | undefined>;
  /** Envuelve un href de destino en el redirect de tracking de clicks. */
  wrapLink?: (url: string) => string;
  /** URL del pixel de apertura (1x1). Si viene, se pega al final del body. */
  openPixelUrl?: string;
  /** Color de marca (hex) para botones y acentos. */
  brandColor?: string;
  /** Pila tipográfica CSS para el contenedor. */
  fontFamily?: string;
  /** Asunto (para fallback de texto). */
  subject?: string;
};

type Vars = Record<string, string | undefined>;

const DEFAULT_BRAND = "#7c3aed";
const DEFAULT_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const esc = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Interpola {var} en un string. Variables faltantes → cadena vacía. */
function interpolate(input: string, vars: Vars): string {
  return input.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = vars[key];
    return v != null && v !== "" ? v : "";
  });
}

function str(value: unknown, vars: Vars): string {
  const raw = typeof value === "string" ? value : "";
  return interpolate(raw, vars);
}

function arr(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

/** Convierte texto plano en párrafos preservando saltos de línea suaves. */
function paragraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) =>
      `<p style="margin:0 0 12px;line-height:1.6">${esc(block).replace(/\n/g, "<br />")}</p>`,
    )
    .join("");
}

function btn(label: string, href: string, brand: string): string {
  if (!href || !label) return "";
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0"><tr>` +
    `<td style="border-radius:8px;background:${brand}">` +
    `<a href="${esc(href)}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px">${esc(label)}</a>` +
    `</td></tr></table>`
  );
}

function heading(text: string, size = 20): string {
  if (!text) return "";
  return `<h2 style="margin:0 0 12px;font-size:${size}px;line-height:1.3;color:#111827">${esc(text)}</h2>`;
}

function section(children: string, opts: { padding?: string } = {}): string {
  const pad = opts.padding ?? "24px 24px";
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #eef0f3">` +
    `<tr><td style="padding:${pad}">${children}</td></tr></table>`
  );
}

function wrapLink(url: string, opts: RenderOptions): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return opts.wrapLink ? opts.wrapLink(trimmed) : trimmed;
}

// --- Render por tipo de bloque ---

function renderHero(b: EmailBlock, vars: Vars, opts: RenderOptions): string {
  const c = b.config;
  const brand = opts.brandColor ?? DEFAULT_BRAND;
  const eyebrow = str(c.eyebrow, vars);
  const title = str(c.title, vars) || vars.event_title || vars.calendar_name || "";
  const subtitle = str(c.subtitle, vars);
  const ctaLabel = str(c.cta_label, vars);
  const ctaUrl = wrapLink(vars.rsvp_url ?? "", opts);
  const bg =
    str(c.variant, {}) === "image" && c.cover_url
      ? `background:url('${esc(str(c.cover_url, {}))}') center/cover no-repeat; color:#ffffff`
      : `background:linear-gradient(135deg, ${brand}, ${brand}cc); color:#ffffff`;
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">` +
    `<tr><td style="${bg};padding:36px 24px;text-align:center">` +
    (eyebrow ? `<p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:.08em;opacity:.9">${esc(eyebrow)}</p>` : "") +
    (title ? `<h1 style="margin:0 0 12px;font-size:28px;line-height:1.2">${esc(title)}</h1>` : "") +
    (subtitle ? `<p style="margin:0 auto;max-width:480px;font-size:15px;line-height:1.6;opacity:.95">${esc(subtitle)}</p>` : "") +
    (ctaLabel && ctaUrl ? btn(ctaLabel, ctaUrl, "#ffffff") : "") +
    `</td></tr></table>`
  );
}

function renderText(b: EmailBlock, vars: Vars): string {
  const c = b.config;
  const title = str(c.title, vars);
  const body = str(c.body, vars);
  return section(
    (title ? heading(title) : "") +
      (body ? paragraphs(body) : ""),
  );
}

function renderAgenda(b: EmailBlock, vars: Vars): string {
  const c = b.config;
  const title = str(c.title, vars);
  const items = arr(c.items);
  const rows = items
    .map((it) => {
      const time = str(it.time, vars);
      const t = str(it.title, vars);
      const speaker = str(it.speaker, vars);
      return (
        `<tr><td style="padding:8px 0;border-bottom:1px solid #f1f3f5">` +
        (time ? `<span style="font-weight:600;color:#111827">${esc(time)}</span> &nbsp;` : "") +
        `<span style="color:#374151">${esc(t)}</span>` +
        (speaker ? ` <span style="color:#9ca3af">· ${esc(speaker)}</span>` : "") +
        `</td></tr>`
      );
    })
    .join("");
  return section(
    (title ? heading(title) : "") +
      (items.length
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`
        : `<p style="color:#9ca3af">Sin agenda.</p>`),
  );
}

function renderSpeakers(b: EmailBlock, vars: Vars): string {
  const c = b.config;
  const title = str(c.title, vars);
  const items = arr(c.items);
  const cards = items
    .map((it) => {
      const name = str(it.name, vars);
      const role = str(it.role, vars);
      const bio = str(it.bio, vars);
      const photo = str(it.photo_url, {});
      const link = str(it.link, {});
      const img = photo
        ? `<img src="${esc(photo)}" alt="" width="64" height="64" style="border-radius:50%;object-fit:cover" />`
        : "";
      return (
        `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px"><tr>` +
        (img ? `<td width="76" style="vertical-align:top;padding-right:12px">${img}</td>` : "") +
        `<td style="vertical-align:top">` +
        (link
          ? `<a href="${esc(link)}" style="color:#111827;font-weight:600;text-decoration:none">${esc(name)}</a>`
          : `<p style="margin:0;font-weight:600;color:#111827">${esc(name)}</p>`) +
        (role ? `<p style="margin:2px 0 4px;color:#6b7280;font-size:13px">${esc(role)}</p>` : "") +
        (bio ? `<p style="margin:0;color:#374151;font-size:14px;line-height:1.5">${esc(bio)}</p>` : "") +
        `</td></tr></table>`
      );
    })
    .join("");
  return section((title ? heading(title) : "") + cards);
}

function renderSponsors(b: EmailBlock, vars: Vars): string {
  const c = b.config;
  const title = str(c.title, vars);
  const note = str(c.note, vars);
  const contact = str(c.contact_url, {});
  const tiers = arr(c.tiers);
  const blocks = tiers
    .map((tier) => {
      const tierName = str(tier.name, vars);
      const logos = arr(tier.logos);
      const imgs = logos
        .map((l) => {
          const logoUrl = str(l.logo_url, {});
          const link = str(l.link, {});
          const name = str(l.name, vars);
          const img = logoUrl
            ? `<img src="${esc(logoUrl)}" alt="${esc(name)}" height="32" style="height:32px;max-width:160px;object-fit:contain" />`
            : esc(name);
          return link
            ? `<a href="${esc(link)}" style="display:inline-block;margin:4px 12px 4px 0">${img}</a>`
            : `<span style="display:inline-block;margin:4px 12px 4px 0">${img}</span>`;
        })
        .join("");
      return (
        `<p style="margin:12px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af">${esc(tierName)}</p>` +
        imgs
      );
    })
    .join("");
  return section(
    (title ? heading(title) : "") +
      blocks +
      (note
        ? `<p style="margin:12px 0 0;color:#6b7280;font-size:14px">${esc(note)}${
            contact
              ? ` <a href="${esc(contact)}" style="color:${DEFAULT_BRAND}">${esc(contact)}</a>`
              : ""
          }</p>`
        : ""),
  );
}

function renderGallery(b: EmailBlock, vars: Vars): string {
  const c = b.config;
  const title = str(c.title, vars);
  const items = arr(c.items);
  const cols = Number(str(c.columns, {}) || "3") || 3;
  const imgs = items
    .map((it) => {
      const src = str(it.src, {});
      const caption = str(it.caption, vars);
      return src
        ? `<td style="padding:4px;vertical-align:top">` +
            `<img src="${esc(src)}" alt="${esc(caption)}" style="width:100%;border-radius:8px;display:block" />` +
            (caption ? `<p style="margin:4px 0 0;font-size:12px;color:#9ca3af">${esc(caption)}</p>` : "") +
            `</td>`
        : "";
    })
    .join("");
  // Reagrupa en filas de `cols` columnas.
  const cells = items.map((it) => {
    const src = str(it.src, {});
    const caption = str(it.caption, vars);
    return src
      ? `<td style="padding:4px;vertical-align:top;width:${Math.floor(100 / cols)}%">` +
          `<img src="${esc(src)}" alt="${esc(caption)}" style="width:100%;border-radius:8px;display:block" />` +
          (caption ? `<p style="margin:4px 0 0;font-size:12px;color:#9ca3af">${esc(caption)}</p>` : "") +
          `</td>`
      : "<td></td>";
  });
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += cols) {
    rows.push(`<tr>${cells.slice(i, i + cols).join("")}</tr>`);
  }
  void imgs; // (se descarta el primer intento; usamos `rows`)
  return section(
    (title ? heading(title) : "") +
      (items.length
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.join("")}</table>`
        : `<p style="color:#9ca3af">Sin imágenes.</p>`),
  );
}

function renderVideo(b: EmailBlock, vars: Vars, opts: RenderOptions): string {
  const c = b.config;
  const title = str(c.title, vars);
  const src = str(c.src, {});
  const caption = str(c.caption, vars);
  const href = wrapLink(src, opts);
  return section(
    (title ? heading(title) : "") +
      (href
        ? `<a href="${esc(href)}" style="display:block;border-radius:8px;overflow:hidden">` +
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:8px"><tr>` +
          `<td style="padding:48px 0;text-align:center;color:#ffffff;font-size:15px;font-weight:600">▶ Ver video</td></tr></table></a>`
        : `<p style="color:#9ca3af">Sin URL de video.</p>`) +
      (caption ? `<p style="margin:8px 0 0;color:#6b7280;font-size:14px">${esc(caption)}</p>` : ""),
  );
}

function renderFaq(b: EmailBlock, vars: Vars): string {
  const c = b.config;
  const title = str(c.title, vars);
  const items = arr(c.items);
  const rows = items
    .map(
      (it) =>
        `<p style="margin:0 0 4px;font-weight:600;color:#111827">${esc(str(it.q, vars))}</p>` +
        `<p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.5">${esc(str(it.a, vars))}</p>`,
    )
    .join("");
  return section((title ? heading(title) : "") + rows);
}

function renderCta(b: EmailBlock, vars: Vars, opts: RenderOptions): string {
  const c = b.config;
  const brand = opts.brandColor ?? DEFAULT_BRAND;
  const title = str(c.title, vars);
  const body = str(c.body, vars);
  const label = str(c.cta_label, vars);
  const url = wrapLink(str(c.cta_url, {}), opts);
  const soft = str(c.variant, {}) !== "solid";
  const bg = soft ? "#f5f3ff" : brand;
  const fg = soft ? "#111827" : "#ffffff";
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:${bg};color:${fg};padding:28px 24px;border-radius:12px">` +
    (title ? `<h2 style="margin:0 0 8px;font-size:20px">${esc(title)}</h2>` : "") +
    (body ? `<p style="margin:0 0 12px;line-height:1.6">${esc(body)}</p>` : "") +
    (label && url ? btn(label, url, soft ? brand : "#ffffff") : "") +
    `</td></tr></table>`
  );
}

function renderTestimonials(b: EmailBlock, vars: Vars): string {
  const c = b.config;
  const title = str(c.title, vars);
  const items = arr(c.items);
  const rows = items
    .map((it) => {
      const quote = str(it.quote, vars);
      const author = str(it.author, vars);
      const role = str(it.role, vars);
      return (
        `<blockquote style="margin:0 0 16px;padding:12px 16px;border-left:3px solid #e5e7eb;color:#374151;font-size:14px;line-height:1.6">` +
        `“${esc(quote)}”` +
        (author
          ? `<p style="margin:8px 0 0;font-size:13px;color:#6b7280">— ${esc(author)}${
              role ? `, ${esc(role)}` : ""
            }</p>`
          : "") +
        `</blockquote>`
      );
    })
    .join("");
  return section((title ? heading(title) : "") + rows);
}

function renderCountdown(b: EmailBlock, vars: Vars): string {
  const c = b.config;
  const title = str(c.title, vars);
  const date = vars.event_date;
  return section(
    (title ? heading(title) : "") +
      (date
        ? `<p style="margin:0;font-size:15px;color:#374151">El evento comienza <strong>${esc(date)}</strong>.</p>`
        : `<p style="margin:0;color:#9ca3af">Cuenta regresiva no disponible en email.</p>`),
  );
}

function renderMap(b: EmailBlock, vars: Vars): string {
  const c = b.config;
  const title = str(c.title, vars);
  const query = str(c.query, vars) || vars.event_address || "";
  const mapsUrl = query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : "";
  return section(
    (title ? heading(title) : "") +
      (query
        ? `<p style="margin:0;color:#374151">${esc(query)}</p>` +
          `<p style="margin:8px 0 0"><a href="${esc(mapsUrl)}" style="color:${DEFAULT_BRAND}">Ver en el mapa</a></p>`
        : `<p style="color:#9ca3af">Sin ubicación.</p>`),
  );
}

function renderCustom(b: EmailBlock, vars: Vars, opts: RenderOptions): string {
  const c = b.config;
  const title = str(c.title, vars);
  const html = interpolate(str(c.html, {}), vars);
  const embed = str(c.embed_url, {});
  const embedLink = embed
    ? `<p style="margin:8px 0 0"><a href="${esc(wrapLink(embed, opts))}" style="color:${DEFAULT_BRAND}">Abrir contenido</a></p>`
    : "";
  return section(
    (title ? heading(title) : "") +
      (html ? sanitizeHtml(html) : "") +
      embedLink,
  );
}

const RENDERERS: Record<
  string,
  (b: EmailBlock, vars: Vars, opts: RenderOptions) => string
> = {
  hero: renderHero,
  text: renderText,
  agenda: renderAgenda,
  speakers: renderSpeakers,
  sponsors: renderSponsors,
  gallery: renderGallery,
  video: renderVideo,
  faq: renderFaq,
  cta: renderCta,
  testimonials: renderTestimonials,
  countdown: renderCountdown,
  map: renderMap,
  custom: renderCustom,
};

export function renderEmailHtml(blocks: EmailBlock[], opts: RenderOptions): string {
  const brand = opts.brandColor ?? DEFAULT_BRAND;
  const font = opts.fontFamily ?? DEFAULT_FONT;
  const body = blocks
    .map((b) => {
      const fn = RENDERERS[b.type];
      if (!fn) return "";
      try {
        return fn(b, opts.vars, opts);
      } catch {
        return "";
      }
    })
    .filter(Boolean)
    .join("");

  const pixel = opts.openPixelUrl
    ? `<img src="${esc(opts.openPixelUrl)}" width="1" height="1" alt="" style="display:block;border:0;outline:none" />`
    : "";

  return (
    `<!DOCTYPE html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />` +
    `<title>${esc(opts.subject ?? "")}</title></head>` +
    `<body style="margin:0;padding:0;background:#f4f4f5;font-family:${font}">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0">` +
    `<tr><td align="center">` +
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.04)">` +
    body +
    `</table>` +
    `<p style="margin:16px 0 0;font-size:12px;color:#9ca3af">Recibes este correo por tu registro en ${esc(opts.vars.calendar_name ?? "Nevetico")}.</p>` +
    (opts.vars.unsubscribe_url
      ? `<p style="margin:4px 0 0;font-size:12px"><a href="${esc(opts.vars.unsubscribe_url)}" style="color:#9ca3af">Cancelar suscripción</a></p>`
      : "") +
    `</td></tr></table>${pixel}</body></html>`
  );
}

/** Versión texto plano para clientes sin HTML / para accesibilidad. */
export function renderEmailText(blocks: EmailBlock[], opts: RenderOptions): string {
  const v = opts.vars;
  const lines: string[] = [];
  for (const b of blocks) {
    const c = b.config;
    switch (b.type) {
      case "hero": {
        const title = str(c.title, v) || v.event_title || v.calendar_name || "";
        const subtitle = str(c.subtitle, v);
        if (title) lines.push(title.toUpperCase());
        if (subtitle) lines.push(subtitle);
        if (v.rsvp_url && str(c.cta_label, v)) lines.push(`${str(c.cta_label, v)}: ${v.rsvp_url}`);
        break;
      }
      case "text": {
        const title = str(c.title, v);
        const body = str(c.body, v);
        if (title) lines.push(title);
        if (body) lines.push(body);
        break;
      }
      case "agenda": {
        if (str(c.title, v)) lines.push(str(c.title, v));
        for (const it of arr(c.items)) {
          lines.push(`${str(it.time, v)} ${str(it.title, v)}${str(it.speaker, v) ? " · " + str(it.speaker, v) : ""}`);
        }
        break;
      }
      case "speakers": {
        if (str(c.title, v)) lines.push(str(c.title, v));
        for (const it of arr(c.items)) {
          lines.push(`${str(it.name, v)}${str(it.role, v) ? " (" + str(it.role, v) + ")" : ""}`);
          if (str(it.bio, v)) lines.push(`  ${str(it.bio, v)}`);
        }
        break;
      }
      case "sponsors": {
        if (str(c.title, v)) lines.push(str(c.title, v));
        for (const tier of arr(c.tiers)) {
          lines.push(`[${str(tier.name, v)}]`);
          for (const l of arr(tier.logos)) lines.push(`  ${str(l.name, v)} ${str(l.link, v)}`);
        }
        break;
      }
      case "gallery": {
        if (str(c.title, v)) lines.push(str(c.title, v));
        for (const it of arr(c.items)) lines.push(str(it.src, v));
        break;
      }
      case "video": {
        if (str(c.title, v)) lines.push(str(c.title, v));
        if (str(c.src, v)) lines.push(`Video: ${str(c.src, v)}`);
        break;
      }
      case "faq": {
        if (str(c.title, v)) lines.push(str(c.title, v));
        for (const it of arr(c.items)) {
          lines.push(`P: ${str(it.q, v)}`);
          lines.push(`R: ${str(it.a, v)}`);
        }
        break;
      }
      case "cta": {
        if (str(c.title, v)) lines.push(str(c.title, v));
        if (str(c.body, v)) lines.push(str(c.body, v));
        if (str(c.cta_url, v) && str(c.cta_label, v))
          lines.push(`${str(c.cta_label, v)}: ${str(c.cta_url, v)}`);
        break;
      }
      case "testimonials": {
        if (str(c.title, v)) lines.push(str(c.title, v));
        for (const it of arr(c.items))
          lines.push(`"${str(it.quote, v)}" — ${str(it.author, v)}`);
        break;
      }
      case "countdown": {
        if (str(c.title, v)) lines.push(str(c.title, v));
        if (v.event_date) lines.push(`El evento comienza ${v.event_date}.`);
        break;
      }
      case "map": {
        if (str(c.title, v)) lines.push(str(c.title, v));
        if (str(c.query, v) || v.event_address) lines.push(str(c.query, v) || v.event_address || "");
        break;
      }
      case "custom": {
        if (str(c.title, v)) lines.push(str(c.title, v));
        if (str(c.html, v)) lines.push(interpolate(str(c.html, v), v).replace(/<[^>]+>/g, ""));
        if (str(c.embed_url, v)) lines.push(`Abrir: ${str(c.embed_url, v)}`);
        break;
      }
    }
    lines.push("");
  }
  if (v.unsubscribe_url) {
    lines.push("—");
    lines.push(`Cancelar suscripción: ${v.unsubscribe_url}`);
  }
  return lines.filter((l) => l != null).join("\n").trim() + "\n";
}
