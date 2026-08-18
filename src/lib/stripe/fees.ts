import "server-only";
import type { Plan } from "@/lib/entitlements";

/**
 * Cálculo de fee por plan (espejo del hardcodeado en la RPC `create_order`).
 * community=5% (500 bps), pro=2.5% (250 bps), business=1% (100 bps).
 * Si cambias uno, cambia el otro.
 */
export const FEE_BPS: Record<Plan, number> = {
  community: 500,
  pro: 250,
  business: 100,
};

/**
 * Calcula el fee en cents para un net dado (subtotal - discount).
 * Fee = floor(net * bps / 10000). Usa Number (los cents de un ticket caben
 * holadamente en Number sin pérdida de precisión: 150000 * 300 = 45M).
 */
export function calculateFeeCents(netCents: number, plan: Plan): number {
  return Math.floor((netCents * FEE_BPS[plan]) / 10000);
}

/**
 * Calcula el net final al organizador = net - fee.
 */
export function calculateOrganizerNetCents(
  netCents: number,
  plan: Plan,
): { fee: number; net: number } {
  const fee = calculateFeeCents(netCents, plan);
  return { fee, net: netCents - fee };
}
