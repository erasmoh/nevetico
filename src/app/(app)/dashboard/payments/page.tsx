import { createClient } from "@/lib/supabase/server";
import { isStripeConfigured } from "@/lib/stripe/client";
import { ConnectButton } from "@/components/payments/connect-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Pagos" };

type OrderRow = {
  id: string;
  email: string;
  name: string | null;
  quantity: number;
  unit_price_cents: number;
  discount_cents: number;
  fee_cents: number;
  net_cents: number;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
  event: { title: string } | null;
};

export default async function PaymentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const stripeConfigured = isStripeConfigured();

  // Cuenta Connect del usuario.
  const { data: account } = await supabase
    .from("stripe_accounts")
    .select("stripe_account_id, details_submitted, charges_enabled, payouts_enabled")
    .eq("profile_id", user.id)
    .maybeSingle();

  // Órdenes de eventos que el usuario organiza (vía RLS).
  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, email, name, quantity, unit_price_cents, discount_cents, fee_cents, net_cents, currency, status, paid_at, created_at, event:events(title)",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const orderRows = (orders as OrderRow[] | null) ?? [];
  const totalRevenue = orderRows
    .filter((o) => o.status === "paid")
    .reduce((sum, o) => sum + Number(o.net_cents), 0);
  const totalFees = orderRows
    .filter((o) => o.status === "paid")
    .reduce((sum, o) => sum + Number(o.fee_cents), 0);

  return (
    <div className="mx-auto w-full max-w-3xl flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pagos</h1>
        <p className="text-sm text-muted-foreground">
          Conecta tu cuenta de Stripe para recibir pagos de tickets.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stripe Connect</CardTitle>
          <CardDescription>
            Tu cuenta de Stripe para cobrar tickets. Nevetico cobra un fee por
            transacción según tu plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConnectButton
            account={
              account
                ? {
                    stripe_account_id: account.stripe_account_id,
                    details_submitted: account.details_submitted,
                    charges_enabled: account.charges_enabled,
                    payouts_enabled: account.payouts_enabled,
                  }
                : null
            }
            stripeConfigured={stripeConfigured}
          />
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ingresos netos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCents(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fees de Nevetico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCents(totalFees)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Órdenes recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {orderRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay órdenes de tickets pagos.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>Comprador</TableHead>
                    <TableHead>Cant.</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderRows.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">
                        {o.event?.title ?? "—"}
                      </TableCell>
                      <TableCell>{o.email}</TableCell>
                      <TableCell>{o.quantity}</TableCell>
                      <TableCell>
                        {formatCents(
                          Number(o.unit_price_cents) * o.quantity -
                            Number(o.discount_cents),
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            o.status === "paid"
                              ? "default"
                              : o.status === "refunded"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {o.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("es-MX", {
    style: "currency",
    currency: "USD",
  });
}
