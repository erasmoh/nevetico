"use client";

import { useEffect, useRef, useState } from "react";
import type { EmailBlock } from "@/lib/email/render";

/**
 * Vista previa del email: hace POST a `/api/email/preview` con los bloques
 * actuales (debounced) y pinta el HTML devuelto en un iframe vía `srcDoc`.
 * Sin tracking y con variables de muestra.
 */
export function EmailPreview({
  blocks,
  subject,
  device,
}: {
  blocks: EmailBlock[];
  subject: string;
  device: "desktop" | "mobile";
}) {
  const [html, setHtml] = useState<string>("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/email/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blocks, subject }),
        });
        if (res.ok) setHtml(await res.text());
      } catch {
        // ignore
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [blocks, subject]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-muted/30 p-2">
      <iframe
        title="Vista previa del email"
        srcDoc={html}
        sandbox=""
        className={
          "mx-auto h-[70vh] min-h-[520px] w-full rounded-lg border border-border bg-background " +
          (device === "mobile" ? "max-w-[390px]" : "")
        }
      />
    </div>
  );
}
