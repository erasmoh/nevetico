"use client";

import { useState } from "react";
import { BLOCK_DEFS, blockDef, blockLabel } from "@/lib/blocks";
import { FieldsEditor } from "@/components/builder/fields-editor";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

type Block = { type: string; config: Record<string, unknown> };

/**
 * Editor de una lista de bloques (reutiliza el catálogo `BLOCK_DEFS` y
 * `FieldsEditor`). Sin persistencia: notifica cambios vía `onChange`. Lo usan
 * el builder de campañas y los pasos `send_email` de automatizaciones.
 */
export function BlocksEditor({
  blocks,
  onChange,
  idPrefix,
  disabled,
}: {
  blocks: Block[];
  onChange: (next: Block[]) => void;
  idPrefix: string;
  disabled?: boolean;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const add = (type: string) => {
    const def = blockDef(type);
    onChange([...blocks, { type, config: def?.defaults ?? {} }]);
    setOpenIdx(blocks.length);
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    setOpenIdx(j);
  };
  const remove = (i: number) => {
    onChange(blocks.filter((_, idx) => idx !== i));
    setOpenIdx(null);
  };
  const update = (i: number, config: Record<string, unknown>) =>
    onChange(blocks.map((b, idx) => (idx === i ? { ...b, config } : b)));

  return (
    <div className="flex flex-col gap-3">
      {blocks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          Sin bloques.
        </p>
      ) : null}
      {blocks.map((block, i) => {
        const def = blockDef(block.type);
        const open = openIdx === i;
        return (
          <div key={i} className="rounded-xl border border-border bg-card">
            <div className="flex items-center gap-1 p-2">
              <button
                type="button"
                onClick={() => setOpenIdx(open ? null : i)}
                className="min-w-0 flex-1 px-2 py-1 text-left"
              >
                <span className="truncate text-sm font-medium">
                  {blockLabel(block.type)}
                </span>
              </button>
              <Button type="button" size="icon-sm" variant="ghost" aria-label="Subir" disabled={disabled || i === 0} onClick={() => move(i, -1)}>
                <ArrowUp className="size-4" />
              </Button>
              <Button type="button" size="icon-sm" variant="ghost" aria-label="Bajar" disabled={disabled || i === blocks.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown className="size-4" />
              </Button>
              <Button type="button" size="icon-sm" variant="ghost" aria-label="Eliminar" disabled={disabled} onClick={() => remove(i)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
            {open && def ? (
              <div className="border-t border-border p-4">
                <FieldsEditor
                  fields={def.fields}
                  values={block.config}
                  onChange={(cfg) => update(i, cfg)}
                  idPrefix={`${idPrefix}-${i}`}
                />
              </div>
            ) : null}
          </div>
        );
      })}

      {!disabled ? (
        <details className="rounded-xl border border-border p-2">
          <summary className="cursor-pointer px-2 py-1 text-sm font-medium">
            Agregar bloque
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {BLOCK_DEFS.map((def) => (
              <Button
                key={def.type}
                type="button"
                size="sm"
                variant="outline"
                className="justify-start"
                onClick={() => add(def.type)}
              >
                <Plus className="size-4" /> {def.label}
              </Button>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
