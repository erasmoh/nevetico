"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  addBlock,
  applyTemplate,
  deleteBlock,
  moveBlock,
  setBlockVisibility,
  updateBlockConfig,
  type BlockActionState,
} from "@/app/actions/page-blocks";
import { BLOCK_DEFS, blockDef, blockLabel } from "@/lib/blocks";
import { PAGE_TEMPLATES } from "@/lib/templates";
import type { PageTheme } from "@/lib/theme";
import { FieldsEditor } from "@/components/builder/fields-editor";
import { ThemeEditor } from "@/components/builder/theme-editor";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Monitor,
  Plus,
  RefreshCw,
  Smartphone,
  Trash2,
} from "lucide-react";

export type BuilderBlock = {
  id: string;
  type: string;
  order_idx: number;
  visible: boolean;
  config: Record<string, unknown>;
};

/**
 * Editor de la página pública del evento: bloques (agregar, ordenar, editar,
 * ocultar, borrar), tema y plantillas, con vista previa en vivo en un iframe
 * que apunta a la propia página pública.
 */
export function PageBuilder({
  eventId,
  publicPath,
  theme,
  blocks,
}: {
  eventId: string;
  publicPath: string;
  theme: PageTheme;
  blocks: BuilderBlock[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(blocks[0]?.id ?? null);
  const [previewKey, setPreviewKey] = useState(0);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  const refresh = () => {
    router.refresh();
    setPreviewKey((k) => k + 1);
  };

  const run = (action: () => Promise<BlockActionState>, success?: string) => {
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      if (success) toast.success(success);
      refresh();
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div className="min-w-0">
        <Tabs defaultValue="blocks">
          <TabsList className="w-full">
            <TabsTrigger value="blocks">Bloques</TabsTrigger>
            <TabsTrigger value="theme">Tema</TabsTrigger>
            <TabsTrigger value="templates">Plantillas</TabsTrigger>
          </TabsList>

          <TabsContent value="blocks" className="mt-4 flex flex-col gap-3">
            {blocks.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                Todavía no hay bloques. Agrega uno abajo o aplica una plantilla.
              </p>
            ) : null}

            {blocks.map((block, index) => {
              const def = blockDef(block.type);
              const open = openId === block.id;
              return (
                <div
                  key={block.id}
                  className="rounded-xl border border-border bg-card"
                >
                  <div className="flex items-center gap-1 p-2">
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : block.id)}
                      className="flex min-w-0 flex-1 flex-col items-start px-2 py-1 text-left"
                    >
                      <span
                        className={cn(
                          "truncate text-sm font-medium",
                          !block.visible && "text-muted-foreground line-through",
                        )}
                      >
                        {blockLabel(block.type)}
                      </span>
                      {def ? (
                        <span className="truncate text-xs text-muted-foreground">
                          {def.description}
                        </span>
                      ) : null}
                    </button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Subir bloque"
                      disabled={pending || index === 0}
                      onClick={() => run(() => moveBlock(eventId, block.id, -1))}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Bajar bloque"
                      disabled={pending || index === blocks.length - 1}
                      onClick={() => run(() => moveBlock(eventId, block.id, 1))}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={block.visible ? "Ocultar bloque" : "Mostrar bloque"}
                      disabled={pending}
                      onClick={() =>
                        run(() =>
                          setBlockVisibility(eventId, block.id, !block.visible),
                        )
                      }
                    >
                      {block.visible ? (
                        <Eye className="size-4" />
                      ) : (
                        <EyeOff className="size-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Eliminar bloque"
                      disabled={pending}
                      onClick={() => {
                        if (!confirm("¿Eliminar este bloque?")) return;
                        run(() => deleteBlock(eventId, block.id), "Bloque eliminado");
                      }}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>

                  {open && def ? (
                    <BlockForm
                      key={`${block.id}-${previewKey}`}
                      block={block}
                      eventId={eventId}
                      pending={pending}
                      onSave={(config) =>
                        run(
                          () =>
                            updateBlockConfig(
                              eventId,
                              block.id,
                              block.type,
                              config,
                            ),
                          "Bloque guardado",
                        )
                      }
                    />
                  ) : null}
                </div>
              );
            })}

            <div className="mt-2 rounded-xl border border-border p-3">
              <p className="mb-2 text-sm font-medium">Agregar bloque</p>
              <div className="grid grid-cols-2 gap-2">
                {BLOCK_DEFS.map((def) => (
                  <Button
                    key={def.type}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="justify-start"
                    disabled={pending}
                    onClick={() => run(() => addBlock(eventId, def.type))}
                  >
                    <Plus className="size-4" /> {def.label}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="theme" className="mt-4">
            <ThemeEditor eventId={eventId} theme={theme} onSaved={refresh} />
          </TabsContent>

          <TabsContent value="templates" className="mt-4 flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Aplicar una plantilla reemplaza los bloques actuales y el tema.
            </p>
            {PAGE_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{template.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {template.description}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(`¿Aplicar la plantilla "${template.label}"?`)) return;
                    run(
                      () => applyTemplate(eventId, template.id),
                      "Plantilla aplicada",
                    );
                  }}
                >
                  Aplicar
                </Button>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <div className="min-w-0">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Vista previa</p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon-sm"
              variant={device === "desktop" ? "secondary" : "ghost"}
              aria-label="Escritorio"
              onClick={() => setDevice("desktop")}
            >
              <Monitor className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant={device === "mobile" ? "secondary" : "ghost"}
              aria-label="Móvil"
              onClick={() => setDevice("mobile")}
            >
              <Smartphone className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label="Recargar vista previa"
              onClick={refresh}
            >
              <RefreshCw className={cn("size-4", pending && "animate-spin")} />
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-muted/30 p-2">
          <iframe
            key={previewKey}
            title="Vista previa del evento"
            src={publicPath}
            className={cn(
              "mx-auto h-[70vh] min-h-[520px] w-full rounded-lg border border-border bg-background",
              device === "mobile" && "max-w-[390px]",
            )}
          />
        </div>
      </div>
    </div>
  );
}

function BlockForm({
  block,
  eventId,
  pending,
  onSave,
}: {
  block: BuilderBlock;
  eventId: string;
  pending: boolean;
  onSave: (config: Record<string, unknown>) => void;
}) {
  const def = blockDef(block.type);
  const [values, setValues] = useState<Record<string, unknown>>(block.config);
  if (!def) return null;

  return (
    <div className="border-t border-border p-4">
      {def.fields.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Este bloque no tiene opciones.
        </p>
      ) : (
        <FieldsEditor
          fields={def.fields}
          values={values}
          onChange={setValues}
          idPrefix={`${eventId}-${block.id}`}
        />
      )}
      <div className="mt-4 flex justify-end">
        <Button type="button" size="sm" disabled={pending} onClick={() => onSave(values)}>
          Guardar bloque
        </Button>
      </div>
    </div>
  );
}
