"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/cartStore";
import { useAddressStore } from "@/lib/store/addressStore";
import { getRestaurantById } from "@/lib/data";
import { DeliveryOptionPicker } from "@/components/checkout/DeliveryOptionPicker";
import { Button } from "@/components/ui/Button";

export default function LivraisonPage() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  const restaurantId = useCartStore((s) => s.restaurantId);
  const items = useCartStore((s) => s.items);
  const deliveryMode = useCartStore((s) => s.deliveryMode);
  const setDeliveryMode = useCartStore((s) => s.setDeliveryMode);
  const selectedAddressId = useAddressStore((s) => s.selectedAddressId);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (items.length === 0) router.replace("/panier");
    else if (!selectedAddressId) router.replace("/commande/adresse");
  }, [mounted, items.length, selectedAddressId, router]);

  if (!mounted) return <div className="min-h-[60vh]" />;

  const restaurant = restaurantId ? getRestaurantById(restaurantId) : undefined;
  if (!restaurant) return <div className="min-h-[60vh]" />;

  return (
    <div className="mx-auto max-w-xl px-5 pb-28 pt-24 sm:px-8 sm:pt-28">
      <h1 className="font-heading text-2xl font-extrabold text-ink-950">Mode de livraison</h1>
      <p className="mt-1 text-sm text-ink-950/50">Chez {restaurant.name}</p>

      <div className="mt-5">
        <DeliveryOptionPicker restaurant={restaurant} value={deliveryMode} onChange={setDeliveryMode} />
      </div>

      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-ink-950/10 bg-cream-100 px-5 py-3 sm:bottom-0">
        <div className="mx-auto max-w-xl">
          <Button fullWidth size="lg" disabled={!deliveryMode} onClick={() => router.push("/commande/paiement")}>
            Continuer
          </Button>
        </div>
      </div>
    </div>
  );
}
