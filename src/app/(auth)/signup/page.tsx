import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Crear cuenta</h1>
        <p className="text-sm text-muted-foreground">
          Organiza eventos para tu comunidad, gratis.
        </p>
      </div>

      <SignupForm />

      <p className="text-center text-xs text-muted-foreground">
        <Link href="/" className="hover:underline">
          ← Volver al inicio
        </Link>
      </p>
    </div>
  );
}
