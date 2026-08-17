"use client";

import { useMemo, useState, useTransition } from "react";
import { checkIn, undoCheckIn } from "@/app/actions/checkin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, Undo2 } from "lucide-react";

type Attendee = {
  id: string;
  name: string | null;
  email: string;
  status: string;
};

export function CheckinClient({
  eventId,
  attendees,
}: {
  eventId: string;
  attendees: Attendee[];
}) {
  const [query, setQuery] = useState("");
  const [idInput, setIdInput] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return attendees;
    return attendees.filter((a) =>
      [a.name ?? "", a.email, a.id].some((s) => s.toLowerCase().includes(q)),
    );
  }, [query, attendees]);

  const doCheckIn = (regId: string, name: string | null) =>
    startTransition(async () => {
      const res = await checkIn(eventId, regId);
      if (res.ok) toast.success(`Acreditado: ${name ?? regId.slice(0, 8)}`);
      else toast.error(res.error ?? "No se pudo acreditar");
    });

  const doUndo = (regId: string) =>
    startTransition(async () => {
      const res = await undoCheckIn(eventId, regId);
      if (res.ok) toast.success("Acreditación revertida");
      else toast.error(res.error ?? "No se pudo revertir");
    });

  const checkInById = () => {
    const regId = idInput.trim();
    if (!regId) return;
    doCheckIn(regId, null);
    setIdInput("");
  };

  const checkedIn = attendees.filter((a) => a.status === "checked_in").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {checkedIn}/{attendees.length} acreditados
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Pega el ID del QR escaneado"
            value={idInput}
            onChange={(e) => setIdInput(e.target.value)}
            className="w-64"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                checkInById();
              }
            }}
          />
          <Button size="sm" disabled={pending || !idInput} onClick={checkInById}>
            <Check className="size-4" /> Acreditar
          </Button>
        </div>
      </div>

      <Input
        placeholder="Buscar por nombre o correo…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {filtered.length === 0 ? (
          <li className="p-4 text-sm text-muted-foreground">
            {attendees.length === 0
              ? "No hay asistentes registrados."
              : "Sin resultados."}
          </li>
        ) : (
          filtered.map((a) => (
            <li key={a.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{a.name ?? "Sin nombre"}</p>
                <p className="truncate text-sm text-muted-foreground">{a.email}</p>
              </div>
              <Badge variant={a.status === "checked_in" ? "default" : "secondary"}>
                {a.status === "checked_in" ? "Acreditado" : a.status === "waitlist" ? "En espera" : "Confirmado"}
              </Badge>
              {a.status === "checked_in" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => doUndo(a.id)}
                >
                  <Undo2 className="size-4" /> Revertir
                </Button>
              ) : a.status === "going" ? (
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => doCheckIn(a.id, a.name)}
                >
                  <Check className="size-4" /> Acreditar
                </Button>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
