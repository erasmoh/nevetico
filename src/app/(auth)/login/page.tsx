import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const fromSignup = params.from === "signup";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
        <p className="text-sm text-muted-foreground">
          Accede a tus eventos y comunidades.
        </p>
      </div>

      {fromSignup ? (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-center text-sm text-muted-foreground">
          Cuenta creada. Revisa tu correo si se solicita confirmación, luego
          inicia sesión.
        </p>
      ) : null}

      <LoginForm />

      <p className="text-center text-xs text-muted-foreground">
        <Link href="/" className="hover:underline">
          ← Volver al inicio
        </Link>
      </p>
    </div>
  );
}
