"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  addVerifiedDomain,
  checkVerifiedDomain,
  deleteVerifiedDomain,
  type DomainActionState,
} from "@/app/actions/email-domains";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Trash2 } from "lucide-react";

type DnsRecord = {
  record: string;
  type: string;
  name: string;
  value: string;
  status?: string;
  ttl?: number | string;
  priority?: number;
};

type Domain = {
  id: string;
  domain: string;
  status: string;
  resend_id: string | null;
  records: DnsRecord[];
  last_checked_at: string | null;
};

export function DomainsPanel({
  calendarSlug,
  initial,
  resendEnabled,
}: {
  calendarSlug: string;
  initial: Domain[];
  resendEnabled: boolean;
}) {
  const [domains, setDomains] = useState<Domain[]>(initial);
  const [pending, startTransition] = useTransition();

  const addAction = addVerifiedDomain.bind(null, calendarSlug);
  const [addState, addFormAction] = useActionState<DomainActionState, FormData>(
    addAction,
    undefined,
  );

  useEffect(() => {
    if (addState?.ok) {
      toast.success("Dominio creado. Configura los registros DNS y verifica.");
      // Recargar para traer el registro persistido (con records y resend_id).
      window.location.reload();
    }
    if (addState?.error) toast.error(addState.error);
  }, [addState]);

  const verify = (id: string) =>
    startTransition(async () => {
      const r = await checkVerifiedDomain(id);
      if (r?.error) {
        toast.error(r.error);
        return;
      }
      toast.success(
        r?.status === "verified"
          ? "¡Dominio verificado!"
          : "Aún pendiente. Revisa los DNS.",
      );
      window.location.reload();
    });

  const remove = (id: string) =>
    startTransition(async () => {
      if (!confirm("¿Eliminar el dominio?")) return;
      const r = await deleteVerifiedDomain(id);
      if (r?.error) toast.error(r.error);
      else {
        toast.success("Dominio eliminado");
        setDomains((d) => d.filter((x) => x.id !== id));
      }
    });

  return (
    <div className="flex flex-col gap-6">
      {!resendEnabled ? (
        <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
          Sin <code>RESEND_API_KEY</code> configurado: la creación/verificación de
          dominios llamará a Resend y fallará. Configúrala en{" "}
          <code>.env</code> para probar el flujo real.
        </p>
      ) : null}

      <form action={addFormAction} className="flex flex-col gap-3 rounded-xl border border-border p-4">
        <Label htmlFor="domain">Añadir dominio verificado</Label>
        <div className="flex flex-wrap gap-2">
          <Input
            id="domain"
            name="domain"
            placeholder="eventos.midominio.com"
            className="max-w-xs"
          />
          <Button type="submit" disabled={pending}>
            Crear en Resend
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Resend devolverá los registros DNS (SPF, DKIM, DMARC) que debes setear
          en tu proveedor. Luego pulsa "Verificar".
        </p>
      </form>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">Dominios</p>
        {domains.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Sin dominios verificados. Los emails saldrán con el remitente por
            defecto.
          </p>
        ) : null}
        {domains.map((d) => (
          <div key={d.id} className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-medium">{d.domain}</p>
              <Badge variant={d.status === "verified" ? "default" : "secondary"}>
                {statusLabel(d.status)}
              </Badge>
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" disabled={pending} onClick={() => verify(d.id)}>
                  <RefreshCw className="size-4" /> Verificar
                </Button>
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => remove(d.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>

            {d.records && d.records.length > 0 ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="py-1 pr-3">Tipo</th>
                      <th className="py-1 pr-3">Nombre</th>
                      <th className="py-1 pr-3">Valor</th>
                      <th className="py-1">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.records.map((r, i) => (
                      <tr key={i} className="border-t border-border/60">
                        <td className="py-1 pr-3 font-mono">{r.type}</td>
                        <td className="py-1 pr-3 font-mono text-xs">{r.name}</td>
                        <td className="py-1 pr-3 font-mono text-xs break-all">{r.value}</td>
                        <td className="py-1 text-xs">{r.status ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {d.last_checked_at ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Última verificación:{" "}
                {new Date(d.last_checked_at).toLocaleString("es-MX")}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function statusLabel(s: string): string {
  return (
    { pending: "Pendiente", verified: "Verificado", failed: "Fallido" } as Record<
      string,
      string
    >
  )[s] ?? s;
}
