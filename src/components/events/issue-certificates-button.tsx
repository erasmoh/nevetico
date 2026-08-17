"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { issueCertificates, type CertificateActionState } from "@/app/actions/certificates";
import { Button } from "@/components/ui/button";
import { Award } from "lucide-react";

export function IssueCertificatesButton({ eventId }: { eventId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        if (!confirm("¿Emitir certificados para todos los asistentes acreditados?")) return;
        startTransition(async () => {
          const r: CertificateActionState = await issueCertificates(eventId);
          if (!r || r.error) {
            toast.error(r?.error ?? "Error desconocido");
            return;
          }
          toast.success(`${r.count ?? 0} certificado(s) emitido(s).`);
        });
      }}
    >
      <Award className="size-4" /> {pending ? "Emitiendo…" : "Certificados"}
    </Button>
  );
}
