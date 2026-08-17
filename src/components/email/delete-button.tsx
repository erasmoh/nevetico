"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

/**
 * Botón de borrado genérico: llama a una server action que devuelve
 * `{ ok?, error? }`, muestra toast y refresca. Para acciones de borrado que no
 * encajan como `<form action>` (porque retornan estado, no void).
 */
export function DeleteButton({
  action,
  confirm: confirmMsg = "¿Eliminar?",
  size = "icon-sm",
  redirect,
}: {
  action: () => Promise<{ ok?: boolean; error?: string } | undefined>;
  confirm?: string;
  size?: "icon-sm" | "sm";
  redirect?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size={size}
      variant="ghost"
      aria-label="Eliminar"
      disabled={pending}
      onClick={() => {
        if (!confirm(confirmMsg)) return;
        startTransition(async () => {
          const r = await action();
          if (r?.error) {
            toast.error(r.error);
            return;
          }
          toast.success("Eliminado");
          if (redirect) router.push(redirect);
          else router.refresh();
        });
      }}
    >
      <Trash2 className="size-4 text-destructive" />
    </Button>
  );
}
