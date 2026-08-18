import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ImportForm } from "@/components/import/import-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Importar eventos" };

export default async function ImportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Calendarios donde el usuario es owner/host (para elegir destino).
  const { data: memberships } = await supabase
    .from("calendar_members")
    .select("calendar_id, role, calendar:calendars(id, name)")
    .eq("user_id", user.id)
    .in("role", ["owner", "host"]);

  const calendars = (memberships ?? [])
    .map((m) => {
      const cal = m.calendar as { id: string; name: string } | null;
      return cal ? { id: cal.id, name: cal.name } : null;
    })
    .filter((c): c is { id: string; name: string } => c !== null);

  return (
    <div className="mx-auto w-full max-w-2xl flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          nativeButton={false}
          render={<Link href="/dashboard" />}
        >
          <ArrowLeft className="size-4" /> Volver
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Importar eventos</h1>
        <p className="text-sm text-muted-foreground">
          Trae eventos desde Luma, Eventbrite o un CSV. Se crean como borrador.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Importar</CardTitle>
          <CardDescription>
            Pega un CSV con tus eventos o la URL de un evento de Luma/Eventbrite.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportForm
            calendarId={calendars[0]?.id ?? null}
            calendars={calendars}
          />
        </CardContent>
      </Card>
    </div>
  );
}
