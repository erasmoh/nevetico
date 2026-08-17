"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MailCheck, Loader2 } from "lucide-react";

export function MagicLinkForm() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setError(null);

    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/40 p-6 text-center">
        <MailCheck className="size-8 text-emerald-600" />
        <div>
          <p className="font-medium">Revisa tu correo</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Enviamos un enlace de acceso a{" "}
            <strong className="text-foreground">{email}</strong>. Haz clic en él
            para entrar.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          ¿No llegó? Revisa spam, o{" "}
          <button
            type="button"
            className="underline-offset-4 hover:underline"
            onClick={() => {
              setStatus("idle");
              setEmail("");
            }}
          >
            prueba con otro correo
          </button>
          .
        </p>
        <p className="text-xs text-muted-foreground">
          En desarrollo local, los enlaces se ven en{" "}
          <a
            href="http://127.0.0.1:54324"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-4 hover:underline"
          >
            Mailpit
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Correo</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tucorreo@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "sending"}
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={status === "sending"}>
        {status === "sending" ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Enviando…
          </>
        ) : (
          "Enviar enlace de acceso"
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Te enviaremos un enlace mágico. Haz clic y entrarás. Si es tu primera
        vez, se crea tu cuenta automáticamente.
      </p>
    </form>
  );
}
