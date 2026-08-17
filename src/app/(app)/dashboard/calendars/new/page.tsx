import { CalendarForm } from "@/components/calendars/calendar-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Nueva comunidad" };

export default function NewCalendarPage() {
  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Nueva comunidad</CardTitle>
        <CardDescription>
          Una comunidad agrupa tus eventos bajo una página pública (tu calendario).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CalendarForm />
      </CardContent>
    </Card>
  );
}
