import { sanitizeHtml } from "@/lib/sanitize";
import { BlockSection } from "./section";

/** Solo se permiten embeds https, para no inyectar contenido inseguro. */
function safeEmbed(raw?: string): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function CustomBlock({
  title,
  embedUrl,
  html,
}: {
  title?: string;
  embedUrl?: string;
  html?: string;
}) {
  const embed = safeEmbed(embedUrl);
  const safeHtml = html?.trim() ? sanitizeHtml(html) : "";
  if (!embed && !safeHtml) return null;

  return (
    <BlockSection title={title}>
      {safeHtml ? (
        <div
          className="flex flex-col gap-3 text-sm leading-relaxed [&_a]:text-primary [&_a]:underline-offset-4 [&_a:hover]:underline [&_h2]:font-heading [&_h2]:text-base [&_h2]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_ul]:list-disc"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      ) : null}
      {embed ? (
        <iframe
          src={embed}
          title={title ?? "Contenido embebido"}
          className={"w-full rounded-lg border border-border " + (safeHtml ? "mt-4 h-96" : "h-96")}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      ) : null}
    </BlockSection>
  );
}
