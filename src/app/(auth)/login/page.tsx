import { MagicLinkForm } from "@/components/auth/magic-link-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; from?: string }>;
}) {
  const params = await searchParams;
  const hasError = params.error === "auth";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Acceder</h1>
        <p className="text-sm text-muted-foreground">
          Sin contraseñas. Te enviamos un enlace a tu correo.
        </p>
      </div>

      {hasError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
          {params.message
            ? `No pudimos completar el acceso: ${params.message}`
            : "El enlace no era válido o ya se usó. Pide uno nuevo."}
        </p>
      ) : null}

      <MagicLinkForm />
    </div>
  );
}
