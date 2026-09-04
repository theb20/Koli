"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SimulatedOrder } from "@/lib/types";
import { getRestaurantBySlug, getProductBySlug } from "@/lib/data";
import { useCartStore } from "@/lib/store/cartStore";
import { Button } from "../ui/Button";

export function ReorderButton({ order }: { order: SimulatedOrder }) {
  const [unavailable, setUnavailable] = useState<string[] | null>(null);
  const router = useRouter();
  const clearCart = useCartStore((s) => s.clearCart);
  const addItem = useCartStore((s) => s.addItem);
  const cartRestaurantId = useCartStore((s) => s.restaurantId);
  const cartHasItems = useCartStore((s) => s.items.length > 0);

  function handleReorder() {
    const restaurant = getRestaurantBySlug(order.restaurantSlug);
    if (!restaurant) {
      setUnavailable(order.items.map((i) => i.name));
      return;
    }

    const missing: string[] = [];
    const available = order.items.filter((item) => {
      const entry = getProductBySlug(order.restaurantSlug, item.productSlug);
      const ok = entry && entry.product.isAvailable;
      if (!ok) missing.push(item.name);
      return ok;
    });

    if (available.length === 0) {
      setUnavailable(missing);
      return;
    }

    if (cartHasItems && cartRestaurantId !== restaurant.id) clearCart();

    for (const item of available) {
      const entry = getProductBySlug(order.restaurantSlug, item.productSlug)!;
      addItem(
        {
          product: entry.product,
          restaurant,
          selectedOptions: item.selectedOptions.map((o) => ({ groupName: o.groupName, optionName: o.optionName, priceDeltaCents: o.priceDeltaCents })),
          quantity: item.quantity,
        },
        true
      );
    }

    setUnavailable(missing.length > 0 ? missing : null);
    if (missing.length === 0) router.push("/panier");
  }

  return (
    <div>
      <Button variant="outline" size="sm" onClick={handleReorder}>
        Commander à nouveau
      </Button>
      {unavailable && unavailable.length > 0 && (
        <p className="mt-2 text-xs text-maroon-600">
          Indisponible désormais : {unavailable.join(", ")}
          {unavailable.length < order.items.length && " — le reste a été ajouté au panier."}
        </p>
      )}
    </div>
  );
}
