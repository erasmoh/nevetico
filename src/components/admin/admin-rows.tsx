"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  setProfilePlan,
  setProfileAttendeesOverride,
  setProfileIsAdmin,
  reviewCommunityVerification,
  type AdminActionState,
} from "@/app/actions/admin";
import type { Plan } from "@/lib/entitlements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Profile = {
  id: string;
  display_name: string;
  email?: string | null;
  plan: Plan;
  is_admin: boolean;
  max_attendees_override: number | null;
};

/**
 * Fila de perfil en el admin: cambiar plan, override de asistentes, is_admin.
 * Cada control dispara su server action y refresca.
 */
export function ProfileAdminRow({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (
    fn: () => Promise<AdminActionState>,
    ok: string,
  ) =>
    startTransition(async () => {
      const r = await fn();
      if (r?.error) toast.error(r.error);
      else {
        toast.success(ok);
        router.refresh();
      }
    });

  return (
    <tr className="border-b border-border/60">
      <td className="px-3 py-2">
        <p className="font-medium">{profile.display_name}</p>
        {profile.email ? (
          <p className="text-xs text-muted-foreground">{profile.email}</p>
        ) : null}
      </td>
      <td className="px-3 py-2">
        <select
          value={profile.plan}
          disabled={pending}
          onChange={(e) =>
            run(
              () => setProfilePlan(profile.id, e.target.value as Plan),
              `Plan → ${e.target.value}`,
            )
          }
          className="h-8 rounded-md border border-input bg-transparent px-2 text-sm dark:bg-input/30"
        >
          <option value="community">Community</option>
          <option value="pro">Pro</option>
          <option value="business">Business</option>
        </select>
      </td>
      <td className="px-3 py-2">
        <Input
          type="number"
          min={1}
          placeholder="plan"
          defaultValue={profile.max_attendees_override ?? ""}
          disabled={pending}
          className="h-8 w-24"
          onBlur={(e) => {
            const v = e.target.value.trim();
            const n = v ? Number(v) : null;
            if (n === profile.max_attendees_override) return;
            run(
              () => setProfileAttendeesOverride(profile.id, n),
              "Override actualizado",
            );
          }}
        />
      </td>
      <td className="px-3 py-2">
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={profile.is_admin}
            disabled={pending}
            onChange={(e) =>
              run(
                () => setProfileIsAdmin(profile.id, e.target.checked),
                e.target.checked ? "Admin concedido" : "Admin revocado",
              )
            }
            className="size-4"
          />
          <span className="text-xs text-muted-foreground">admin</span>
        </label>
      </td>
    </tr>
  );
}

/** Evento con override editable. */
export function EventAdminRow({
  event,
}: {
  event: {
    id: string;
    title: string;
    slug: string;
    calendar_name: string | null;
    max_attendees_override: number | null;
    going_count: number;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-border/60">
      <td className="px-3 py-2">
        <p className="font-medium">{event.title}</p>
        <p className="text-xs text-muted-foreground">
          {event.calendar_name ?? "Personal"} · {event.going_count} going
        </p>
      </td>
      <td className="px-3 py-2">
        <Input
          type="number"
          min={1}
          placeholder="plan"
          defaultValue={event.max_attendees_override ?? ""}
          disabled={pending}
          className="h-8 w-24"
          onBlur={(e) => {
            const v = e.target.value.trim();
            const n = v ? Number(v) : null;
            if (n === event.max_attendees_override) return;
            startTransition(async () => {
              const r = await (await import("@/app/actions/admin")).setEventAttendeesOverride(
                event.id,
                n,
              );
              if (r?.error) toast.error(r.error);
              else {
                toast.success("Override de evento actualizado");
                router.refresh();
              }
            });
          }}
        />
      </td>
      <td className="px-3 py-2 text-right">
        <Button
          size="sm"
          variant="ghost"
          nativeButton={false}
          render={
            <a
              href={`/dashboard/events/${event.id}`}
              target="_blank"
              rel="noreferrer"
            />
          }
        >
          Ver
        </Button>
      </td>
    </tr>
  );
}

/** Fila de verificación Community con botones approve/reject/needs_info. */
export function VerificationAdminRow({
  verification,
}: {
  verification: {
    id: string;
    calendar_name: string;
    status: "pending" | "approved" | "rejected" | "needs_info";
    description: string | null;
    community_url: string | null;
    submitted_at: string;
    notes: string | null;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const review = (
    status: "approved" | "rejected" | "needs_info",
    ok: string,
  ) => {
    const notes =
      status === "needs_info" || status === "rejected"
        ? window.prompt("Notas para el organizador (opcional):")
        : null;
    startTransition(async () => {
      const r = await reviewCommunityVerification(verification.id, status, notes ?? undefined);
      if (r?.error) toast.error(r.error);
      else {
        toast.success(ok);
        router.refresh();
      }
    });
  };

  const statusBadge = {
    pending: { label: "Pendiente", variant: "secondary" as const },
    approved: { label: "Aprobada", variant: "default" as const },
    rejected: { label: "Rechazada", variant: "destructive" as const },
    needs_info: { label: "Necesita info", variant: "secondary" as const },
  }[verification.status];

  return (
    <tr className="border-b border-border/60">
      <td className="px-3 py-2">
        <p className="font-medium">{verification.calendar_name}</p>
        {verification.community_url ? (
          <a
            href={verification.community_url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary hover:underline"
          >
            {verification.community_url}
          </a>
        ) : null}
      </td>
      <td className="px-3 py-2 max-w-xs">
        <p className="truncate text-xs text-muted-foreground">
          {verification.description ?? "—"}
        </p>
      </td>
      <td className="px-3 py-2">
        <span
          className={
            "inline-flex rounded-full px-2 py-0.5 text-xs " +
            (verification.status === "approved"
              ? "bg-green-500/15 text-green-700"
              : verification.status === "rejected"
                ? "bg-destructive/15 text-destructive"
                : "bg-muted text-muted-foreground")
          }
        >
          {statusBadge.label}
        </span>
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          {verification.status !== "approved" && (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => review("approved", "Verificación aprobada")}
            >
              Aprobar
            </Button>
          )}
          {verification.status !== "rejected" && (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => review("rejected", "Verificación rechazada")}
            >
              Rechazar
            </Button>
          )}
          {verification.status !== "needs_info" && (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => review("needs_info", "Solicitando más info")}
            >
              Pedir info
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
