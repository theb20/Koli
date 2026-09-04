"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Address, DeliveryMode, PaymentMethod, Restaurant } from "@/lib/types";
import type { CartItem } from "@/lib/store/cartStore";
import { useCartStore } from "@/lib/store/cartStore";
import { useOrderStore } from "@/lib/store/orderStore";
import type { OrderTotals } from "@/lib/utils/pricing";
import { Button } from "../ui/Button";

export function PlaceOrderButton({
  restaurant,
  address,
  deliveryMode,
  paymentMethod,
  totals,
  items,
}: {
  restaurant: Restaurant;
  address: Address;
  deliveryMode: DeliveryMode;
  paymentMethod: PaymentMethod;
  totals: OrderTotals;
  items: CartItem[];
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const createOrder = useOrderStore((s) => s.createOrder);
  const promo = useCartStore((s) => s.promo);

  function handlePlaceOrder() {
    setLoading(true);
    // Léger délai cosmétique — aucune requête réseau réelle n'est en jeu ici.
    setTimeout(() => {
      const order = createOrder({
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        restaurantSlug: restaurant.slug,
        restaurantImage: restaurant.coverImage,
        items,
        address,
        deliveryMode,
        subtotalCents: totals.subtotalCents,
        deliveryFeeCents: totals.deliveryFeeCents,
        serviceFeeCents: totals.serviceFeeCents,
        promo: promo ?? undefined,
        tipCents: totals.tipCents,
        totalCents: totals.totalCents,
        paymentMethod,
      });
      // Le panier est vidé depuis la page de confirmation elle-même (pas ici) pour
      // éviter que la garde "panier vide" de cette page ne coure-circuite la navigation.
      router.push(`/commande/confirmation/${order.id}`);
    }, 700);
  }

  return (
    <Button fullWidth size="lg" loading={loading} onClick={handlePlaceOrder}>
      Confirmer la commande (démo) — {(totals.totalCents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
    </Button>
  );
}
