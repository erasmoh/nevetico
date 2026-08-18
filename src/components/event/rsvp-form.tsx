"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { rsvp, type RsvpFormState } from "@/app/actions/registrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/components/site/locale-context";

export function RsvpForm({
  eventId,
  user,
}: {
  eventId: string;
  user: { email: string; name: string | null } | null;
}) {
  const [state, action, pending] = useActionState<RsvpFormState, FormData>(
    rsvp,
    undefined,
  );
  const params = useSearchParams();
  const refCode = params.get("ref");
  const t = useT();

  return (
    <form action={action} className="flex flex-col gap-3" id="rsvp">
      <input type="hidden" name="event_id" value={eventId} />
      {refCode && <input type="hidden" name="ref_code" value={refCode} />}

      {user ? (
        <>
          <input type="hidden" name="email" value={user.email} />
          <input type="hidden" name="name" value={user.name ?? ""} />
          <p className="text-sm text-muted-foreground">
            {t("event.rsvp.as")} <strong>{user.name || user.email}</strong>.
          </p>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="rsvp_name">{t("event.rsvp.name")}</Label>
            <Input id="rsvp_name" name="name" required placeholder={t("event.rsvp.name.placeholder")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="rsvp_email">{t("event.rsvp.email")}</Label>
            <Input
              id="rsvp_email"
              name="email"
              type="email"
              required
              placeholder={t("event.rsvp.email.placeholder")}
            />
          </div>
        </>
      )}

      {state?.ok ? (
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          {state.status === "waitlist"
            ? t("event.rsvp.waitlist")
            : t("event.rsvp.confirm")}
        </div>
      ) : null}

      {state?.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? t("event.rsvp.rsvping") : t("event.rsvp")}
      </Button>
      {user ? null : (
        <p className="text-xs text-muted-foreground">
          {t("event.rsvp.login")}{" "}
          <a className="underline-offset-4 hover:underline" href="/login">
            ↗
          </a>
        </p>
      )}
    </form>
  );
}
