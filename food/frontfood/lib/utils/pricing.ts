import type { CartItem } from "../store/cartStore";
import type { DeliveryMode, Restaurant } from "../types";
import { getSubtotalCents } from "../store/cartStore";

export const RAPIDE_SURCHARGE_CENTS = 150;
export const SERVICE_FEE_CENTS = 100;

export function getDeliveryFeeCents(restaurant: Restaurant, mode: DeliveryMode): number {
  if (mode === "retrait") return 0;
  if (mode === "livraison_rapide") return restaurant.deliveryFeeCents + RAPIDE_SURCHARGE_CENTS;
  return restaurant.deliveryFeeCents;
}

export type OrderTotals = {
  subtotalCents: number;
  deliveryFeeCents: number;
  serviceFeeCents: number;
  discountCents: number;
  tipCents: number;
  totalCents: number;
};

/**
 * Calcul des totaux — affiché côté client dans cette démo, mais dans un
 * vrai système ce calcul DOIT être refait et validé côté serveur avant tout
 * paiement (le frontend n'est jamais une source fiable pour les prix).
 */
export function computeOrderTotals(
  items: CartItem[],
  restaurant: Restaurant | undefined,
  deliveryMode: DeliveryMode,
  discountCents: number,
  tipCents: number
): OrderTotals {
  const subtotalCents = getSubtotalCents(items);
  const deliveryFeeCents = restaurant ? getDeliveryFeeCents(restaurant, deliveryMode) : 0;
  const serviceFeeCents = subtotalCents > 0 ? SERVICE_FEE_CENTS : 0;
  const totalCents = Math.max(
    0,
    subtotalCents + deliveryFeeCents + serviceFeeCents - discountCents + tipCents
  );
  return { subtotalCents, deliveryFeeCents, serviceFeeCents, discountCents, tipCents, totalCents };
}
