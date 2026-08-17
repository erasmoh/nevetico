/**
 * Sanitizador mínimo para el bloque "Embed / HTML". No pretende ser un DOM
 * parser: mantiene una allowlist corta de etiquetas de texto, borra atributos
 * salvo `href` (solo http/https/mailto) y elimina cualquier `on*`, `<script>`,
 * `<style>` o `<iframe>` (para embeds está el campo `embed_url`).
 */
const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "code",
  "pre",
  "blockquote",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "h4",
  "a",
  "hr",
  "span",
]);

const SAFE_HREF = /^(https?:\/\/|mailto:|#|\/)/i;

export function sanitizeHtml(input: string): string {
  const withoutDangerBlocks = input.replace(
    /<(script|style|iframe|object|embed|form|svg)\b[\s\S]*?<\/\1\s*>/gi,
    "",
  );

  return withoutDangerBlocks.replace(
    /<\/?([a-zA-Z0-9-]+)((?:\s+[^<>]*)?)\/?>/g,
    (match, rawTag: string, rawAttrs: string) => {
      const tag = rawTag.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) return "";
      if (match.startsWith("</")) return `</${tag}>`;

      let attrs = "";
      if (tag === "a") {
        const href = /href\s*=\s*("([^"]*)"|'([^']*)')/i.exec(rawAttrs);
        const value = href?.[2] ?? href?.[3] ?? "";
        if (value && SAFE_HREF.test(value.trim())) {
          attrs = ` href="${value.trim().replace(/"/g, "&quot;")}" rel="noopener noreferrer nofollow" target="_blank"`;
        }
      }
      const selfClosing = tag === "br" || tag === "hr";
      return `<${tag}${attrs}${selfClosing ? " /" : ""}>`;
    },
  );
}
