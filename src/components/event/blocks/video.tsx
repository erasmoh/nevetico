import { BlockSection } from "./section";

/** Convierte una URL de YouTube/Vimeo en su URL de embed. Otras se usan tal cual. */
export function toEmbedUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    }
    if (host.endsWith("youtube.com")) {
      const id = u.searchParams.get("v") ?? u.pathname.split("/").pop();
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host.endsWith("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    if (u.protocol === "https:") return u.toString();
    return null;
  } catch {
    return null;
  }
}

export function VideoBlock({
  title,
  src,
  caption,
}: {
  title?: string;
  src?: string;
  caption?: string;
}) {
  const embed = src ? toEmbedUrl(src) : null;
  if (!embed) return null;

  return (
    <BlockSection title={title ?? "Video"}>
      <div className="overflow-hidden rounded-lg border border-border">
        <iframe
          src={embed}
          title={title ?? "Video"}
          className="aspect-video w-full"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      {caption ? <p className="mt-3 text-sm text-muted-foreground">{caption}</p> : null}
    </BlockSection>
  );
}
