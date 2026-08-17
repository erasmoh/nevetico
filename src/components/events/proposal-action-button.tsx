"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ProposalActionButton({
  action,
  label,
  variant,
}: {
  action: () => Promise<{ ok?: boolean; error?: string }>;
  label: string;
  variant: "default" | "outline";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await action();
          if (r?.error) toast.error(r.error);
          else {
            toast.success(`Propuesta ${label.toLowerCase()}`);
            router.refresh();
          }
        })
      }
    >
      {label}
    </Button>
  );
}
