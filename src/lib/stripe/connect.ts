import "server-only";
import { getStripe } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/database.types";

type StripeAccount = Database["public"]["Tables"]["stripe_accounts"]["Row"];

/**
 * Stripe Connect (Express). El organizador conecta su cuenta Stripe una vez
 * y la reutiliza para todos sus eventos. El onboarding se hace vía Account
 * Link; el dashboard Express vía Login Link.
 *
 * Sin STRIPE_SECRET_KEY, todas las funciones devuelven null y la UI muestra
 * el estado "modo demo" (no se pueden cobros reales).
 */

/** Crea una cuenta Express para el perfil si no existe, devuelve la fila. */
export async function getOrCreateExpressAccount(
  profileId: string,
): Promise<StripeAccount | null> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("stripe_accounts")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (existing) return existing as StripeAccount;

  const stripe = getStripe();
  if (!stripe) return null;

  const account = await stripe.accounts.create({
    type: "express",
    metadata: { profile_id: profileId },
  });

  const { data, error } = await admin
    .from("stripe_accounts")
    .insert({
      profile_id: profileId,
      stripe_account_id: account.id,
      details_submitted: account.details_submitted ?? false,
      charges_enabled: account.charges_enabled ?? false,
      payouts_enabled: account.payouts_enabled ?? false,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as StripeAccount;
}

/** Sincroniza el estado de la cuenta desde Stripe (charges/payouts enabled). */
export async function syncStripeAccount(
  profileId: string,
): Promise<StripeAccount | null> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("stripe_accounts")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!row) return null;

  const stripe = getStripe();
  if (!stripe) return row as StripeAccount;

  const account = await stripe.accounts.retrieve(row.stripe_account_id);
  const { data, error } = await admin
    .from("stripe_accounts")
    .update({
      details_submitted: account.details_submitted ?? false,
      charges_enabled: account.charges_enabled ?? false,
      payouts_enabled: account.payouts_enabled ?? false,
    })
    .eq("id", row.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as StripeAccount;
}

/** Crea un Account Link para el onboarding Express. */
export async function createAccountLink(
  stripeAccountId: string,
  returnUrl: string,
  refreshUrl: string,
): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;
  const link = await stripe.accountLinks.create({
    account: stripeAccountId,
    type: "account_onboarding",
    return_url: returnUrl,
    refresh_url: refreshUrl,
  });
  return link.url;
}

/** Crea un Login Link al dashboard Express del organizador. */
export async function createLoginLink(
  stripeAccountId: string,
): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;
  const link = await stripe.accounts.createLoginLink(stripeAccountId);
  return link.url;
}
