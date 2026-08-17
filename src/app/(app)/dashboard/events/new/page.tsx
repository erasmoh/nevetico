import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { defaultTimezone } from "@/lib/timezones";
import { EventForm } from "@/components/events/event-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Nuevo evento" };

export default async function NewEventPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?from=dashboard");

  const { data } = await supabase
    .from("calendar_members")
    .select("calendar:calendars(id, name)")
    .eq("user_id", user.id)
    .in("role", ["owner", "host"]);

  const calendars = (data ?? [])
    .map((m) => m.calendar)
    .filter((c): c is NonNullable<typeof c> => c !== null);

  if (calendars.length === 0) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Necesitas una comunidad</CardTitle>
          <CardDescription>
            Crea una comunidad primero; los eventos pertenecen a una comunidad.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/dashboard/calendars/new" />}>
            Crear comunidad
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Nuevo evento</CardTitle>
        <CardDescription>
          Crea un evento para tu comunidad. Puedes dejarlo en borrador o publicarlo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EventForm calendars={calendars} defaultTimezone={defaultTimezone()} />
      </CardContent>
    </Card>
  );
}
