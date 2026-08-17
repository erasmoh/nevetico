"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createApiKey,
  revokeApiKey,
  createWebhook,
  deleteWebhook,
  WEBHOOK_EVENTS,
} from "@/app/actions/api-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Trash2, Plus } from "lucide-react";

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

type Webhook = {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  secret: string;
};

export function ApiSettingsPanel({
  calendarSlug,
  apiKeys,
  webhooks,
}: {
  calendarSlug: string;
  apiKeys: ApiKey[];
  webhooks: Webhook[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <ApiKeysSection calendarSlug={calendarSlug} keys={apiKeys} />
      <WebhooksSection calendarSlug={calendarSlug} hooks={webhooks} />
    </div>
  );
}

function ApiKeysSection({
  calendarSlug,
  keys,
}: {
  calendarSlug: string;
  keys: ApiKey[];
}) {
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const create = () =>
    startTransition(async () => {
      if (!name.trim()) {
        toast.error("Dale un nombre a la key.");
        return;
      }
      const r = await createApiKey(calendarSlug, name);
      if (!r || r.error) {
        toast.error(r?.error ?? "Error desconocido");
        return;
      }
      setNewKey(r.key ?? null);
      setName("");
      toast.success("API key creada. Cópiala ahora (no se vuelve a mostrar).");
    });

  return (
    <div className="rounded-xl border border-border p-4">
      <p className="mb-3 text-sm font-medium">API keys</p>
      {newKey ? (
        <div className="mb-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
          <p className="text-xs text-muted-foreground">
            Copia tu API key ahora. No se volverá a mostrar.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
              {newKey}
            </code>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(newKey);
                toast.success("Copiada");
              }}
            >
              <Copy className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Nombre (ej: Mi sitio)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-xs"
        />
        <Button size="sm" disabled={pending} onClick={create}>
          <Plus className="size-4" /> Crear key
        </Button>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {keys.map((k) => (
          <li
            key={k.id}
            className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{k.name}</p>
              <p className="text-xs text-muted-foreground">
                {k.key_prefix}… ·{" "}
                {k.last_used_at
                  ? `usada ${new Date(k.last_used_at).toLocaleDateString("es-MX")}`
                  : "sin usar"}
              </p>
            </div>
            {k.revoked_at ? (
              <Badge variant="secondary">revocada</Badge>
            ) : (
              <Button
                size="icon-sm"
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await revokeApiKey(calendarSlug, k.id);
                    if (r?.error) toast.error(r.error);
                    else toast.success("Key revocada");
                  })
                }
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function WebhooksSection({
  calendarSlug,
  hooks,
}: {
  calendarSlug: string;
  hooks: Webhook[];
}) {
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const create = () =>
    startTransition(async () => {
      if (!url.trim()) {
        toast.error("Pon una URL.");
        return;
      }
      const r = await createWebhook(calendarSlug, url, events);
      if (r?.error) toast.error(r.error);
      else {
        setUrl("");
        setEvents([]);
        toast.success("Webhook creado");
      }
    });

  return (
    <div className="rounded-xl border border-border p-4">
      <p className="mb-3 text-sm font-medium">Webhooks</p>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="https://tu-endpoint.com/webhook"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="max-w-md"
          />
          <Button size="sm" disabled={pending} onClick={create}>
            <Plus className="size-4" /> Crear webhook
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {WEBHOOK_EVENTS.map((e) => (
            <label
              key={e.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs"
            >
              <input
                type="checkbox"
                checked={events.includes(e.id)}
                onChange={(ev) =>
                  setEvents(
                    ev.target.checked
                      ? [...events, e.id]
                      : events.filter((x) => x !== e.id),
                  )
                }
                className="size-3"
              />
              {e.label}
            </label>
          ))}
        </div>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {hooks.map((h) => (
          <li
            key={h.id}
            className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{h.url}</p>
              <p className="text-xs text-muted-foreground">
                {(h.events as string[]).join(", ") || "todos"}
              </p>
            </div>
            <Badge variant={h.enabled ? "default" : "secondary"}>
              {h.enabled ? "activo" : "pausado"}
            </Badge>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await deleteWebhook(calendarSlug, h.id);
                  if (r?.error) toast.error(r.error);
                  else toast.success("Webhook eliminado");
                })
              }
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
