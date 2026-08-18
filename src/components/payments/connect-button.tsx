"use client";

import { useState, useTransition } from "react";
import {
  connectStripeAccount,
  refreshStripeAccount,
  getStripeDashboardLink,
} from "@/app/actions/payments";
import { Button } from "@/components/ui/button";

type Account = {
  stripe_account_id: string;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
};

export function ConnectButton({
  account,
  stripeConfigured,
}: {
  account: Account | null;
  stripeConfigured: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [acc, setAcc] = useState<Account | null>(account);

  function handleConnect() {
    setError(null);
    startTransition(async () => {
      const res = await connectStripeAccount();
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.url) {
        window.location.href = res.url;
      }
    });
  }

  function handleRefresh() {
    setError(null);
    startTransition(async () => {
      const res = await refreshStripeAccount();
      if (res.error) setError(res.error);
      // Recargar para mostrar estado fresco.
      if (res.ok) window.location.reload();
    });
  }

  function handleDashboard() {
    setError(null);
    startTransition(async () => {
      const res = await getStripeDashboardLink();
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.url) window.open(res.url, "_blank");
    });
  }

  if (!stripeConfigured) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Modo demo: Stripe no está configurado. Los pagos se simulan con un
          mock para desarrollo.
        </p>
        {acc && (
          <p className="text-xs text-muted-foreground">
            Cuenta demo: {acc.stripe_account_id}
          </p>
        )}
      </div>
    );
  }

  if (!acc) {
    return (
      <div className="flex flex-col gap-2">
        <Button onClick={handleConnect} disabled={pending}>
          {pending ? "Conectando…" : "Conectar con Stripe"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2 text-sm sm:grid-cols-3">
        <Status label="Detalles enviados" ok={acc.details_submitted} />
        <Status label="Cobros habilitados" ok={acc.charges_enabled} />
        <Status label="Pagos habilitados" ok={acc.payouts_enabled} />
      </div>
      <div className="flex gap-2">
        {!acc.details_submitted && (
          <Button onClick={handleConnect} disabled={pending} size="sm">
            Completar onboarding
          </Button>
        )}
        <Button onClick={handleRefresh} disabled={pending} size="sm" variant="outline">
          Sincronizar
        </Button>
        <Button onClick={handleDashboard} disabled={pending} size="sm" variant="outline">
          Dashboard Express
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function Status({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
      <span
        className={
          "size-2 rounded-full " + (ok ? "bg-green-500" : "bg-muted-foreground")
        }
      />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
