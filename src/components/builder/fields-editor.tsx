"use client";

import { Fragment } from "react";
import type { FieldDef } from "@/lib/blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

type Values = Record<string, unknown>;

function asValues(value: unknown): Values {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Values)
    : {};
}

function asArray(value: unknown): Values[] {
  return Array.isArray(value) ? value.map(asValues) : [];
}

/**
 * Formulario genérico para el `config` de un bloque, generado a partir del
 * catálogo de campos (`FieldDef[]`). Soporta listas de items anidadas (p.ej.
 * tiers de sponsors → logos).
 */
export function FieldsEditor({
  fields,
  values,
  onChange,
  idPrefix,
}: {
  fields: FieldDef[];
  values: Values;
  onChange: (next: Values) => void;
  idPrefix: string;
}) {
  const set = (name: string, value: unknown) => onChange({ ...values, [name]: value });

  return (
    <div className="flex flex-col gap-4">
      {fields.map((field) => {
        const id = `${idPrefix}-${field.name}`;
        const raw = values[field.name];

        if (field.kind === "items") {
          const items = asArray(raw);
          const setItems = (next: Values[]) => set(field.name, next);
          return (
            <div key={field.name} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Label>{field.label}</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setItems([...items, {}])}
                >
                  <Plus className="size-4" /> {field.itemLabel}
                </Button>
              </div>
              {field.help ? (
                <p className="text-xs text-muted-foreground">{field.help}</p>
              ) : null}
              {items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                  Sin {field.label.toLowerCase()} todavía.
                </p>
              ) : null}
              {items.map((item, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      {field.itemLabel} {index + 1}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Subir"
                        disabled={index === 0}
                        onClick={() => {
                          const next = [...items];
                          [next[index - 1], next[index]] = [next[index], next[index - 1]];
                          setItems(next);
                        }}
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Bajar"
                        disabled={index === items.length - 1}
                        onClick={() => {
                          const next = [...items];
                          [next[index + 1], next[index]] = [next[index], next[index + 1]];
                          setItems(next);
                        }}
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Eliminar"
                        onClick={() => setItems(items.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <FieldsEditor
                    fields={field.fields}
                    values={item}
                    idPrefix={`${id}-${index}`}
                    onChange={(next) =>
                      setItems(items.map((it, i) => (i === index ? next : it)))
                    }
                  />
                </div>
              ))}
            </div>
          );
        }

        const value = typeof raw === "string" ? raw : "";

        return (
          <Fragment key={field.name}>
            <div className="flex flex-col gap-2">
              <Label htmlFor={id}>{field.label}</Label>
              {field.kind === "textarea" ? (
                <Textarea
                  id={id}
                  rows={4}
                  value={value}
                  placeholder={field.placeholder}
                  onChange={(e) => set(field.name, e.target.value)}
                />
              ) : field.kind === "select" ? (
                // <select> nativo: el Select de base-ui es controlado por
                // portal y aquí conviven decenas de campos dinámicos.
                <select
                  id={id}
                  value={value || field.options[0].value}
                  onChange={(e) => set(field.name, e.target.value)}
                  className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                >
                  {field.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id={id}
                  type={field.kind === "url" ? "url" : "text"}
                  value={value}
                  placeholder={field.placeholder}
                  onChange={(e) => set(field.name, e.target.value)}
                />
              )}
              {field.help ? (
                <p className="text-xs text-muted-foreground">{field.help}</p>
              ) : null}
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
