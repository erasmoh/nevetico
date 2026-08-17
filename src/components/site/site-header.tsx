import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "./user-menu";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName: string | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    displayName = data?.display_name ?? null;
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
            N
          </span>
          <span>Nevetico</span>
        </Link>

        <nav className="flex items-center gap-2">
          {user ? (
            <UserMenu displayName={displayName ?? user.email ?? "Cuenta"} email={user.email ?? ""} />
          ) : (
            <Button size="sm" nativeButton={false} render={<Link href="/login" />}>
              Acceder
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
