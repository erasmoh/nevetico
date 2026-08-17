"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CheckinResult = { ok: boolean; error?: string };

export async function checkIn(
  eventId: string,
  registrationId: string,
): Promise<CheckinResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado." };

  const { error: insErr } = await supabase
    .from("checkins")
    .insert({ registration_id: registrationId, event_id: eventId, checked_by: user.id });
  if (insErr) {
    if (insErr.code === "23505") return { ok: false, error: "Ya acreditado." };
    return { ok: false, error: insErr.message };
  }

  await supabase
    .from("registrations")
    .update({ status: "checked_in" })
    .eq("id", registrationId);

  revalidatePath(`/dashboard/events/${eventId}/checkin`);
  revalidatePath(`/dashboard/events/${eventId}`);
  return { ok: true };
}

export async function undoCheckIn(
  eventId: string,
  registrationId: string,
): Promise<CheckinResult> {
  const supabase = await createClient();

  await supabase.from("checkins").delete().eq("registration_id", registrationId);
  await supabase
    .from("registrations")
    .update({ status: "going" })
    .eq("id", registrationId);

  revalidatePath(`/dashboard/events/${eventId}/checkin`);
  revalidatePath(`/dashboard/events/${eventId}`);
  return { ok: true };
}
