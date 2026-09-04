"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useCartStore, getSubtotalCents } from "@/lib/store/cartStore";
import { getRestaurantById } from "@/lib/data";
import { CartItemRow } from "@/components/cart/CartItemRow";
import { PromoCodeInput } from "@/components/cart/PromoCodeInput";
import { TipSelector } from "@/components/cart/TipSelector";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { formatPriceCents } from "@/lib/utils/format";

export default function PanierPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const items = useCartStore((s) => s.items);
  const restaurantId = useCartStore((s) => s.restaurantId);
  const promo = useCartStore((s) => s.promo);
  const tipCents = useCartStore((s) => s.tipCents);

  if (!mounted) return <div className="min-h-[60vh]" />;

  const restaurant = restaurantId ? getRestaurantById(restaurantId) : undefined;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-5 pt-24 sm:pt-28">
        <EmptyState
          icon={ShoppingBag}
          title="Votre panier est vide"
          description="Parcourez les restaurants pour ajouter vos plats préférés."
          action={
            <Button href="/recherche" size="sm">
              Découvrir des restaurants
            </Button>
          }
        />
      </div>
    );
  }

  const subtotal = getSubtotalCents(items);
  const discount = promo?.discountCents ?? 0;

  return (
    <div className="mx-auto max-w-2xl px-5 pb-32 pt-24 sm:px-8 sm:pt-28">
      <h1 className="font-heading text-2xl font-extrabold text-ink-950">Votre panier</h1>
      {restaurant && <p className="mt-1 text-sm text-ink-950/50">Chez {restaurant.name}</p>}

      <div className="mt-5 rounded-3xl bg-white p-4 shadow-card">
        {items.map((item) => (
          <CartItemRow key={item.id} item={item} />
        ))}
      </div>

      <div className="mt-6">
        <h2 className="font-heading mb-2 text-sm font-bold text-ink-950">Code promo</h2>
        <PromoCodeInput />
      </div>

      <div className="mt-6">
        <h2 className="font-heading mb-2 text-sm font-bold text-ink-950">Pourboire</h2>
        <TipSelector />
      </div>

      <div className="mt-6 flex flex-col gap-2 rounded-2xl bg-white p-4 text-sm shadow-card">
        <div className="flex items-center justify-between">
          <span className="text-ink-950/60">Sous-total</span>
          <span className="font-medium text-ink-950">{formatPriceCents(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-ink-950/60">Réduction</span>
            <span className="font-semibold text-cta-dark">-{formatPriceCents(discount)}</span>
          </div>
        )}
        {tipCents > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-ink-950/60">Pourboire</span>
            <span className="font-medium text-ink-950">{formatPriceCents(tipCents)}</span>
          </div>
        )}
        <p className="pt-1 text-xs text-ink-950/40">
          Frais de livraison et de service calculés à l&apos;étape suivante.
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-ink-950/10 bg-cream-100 px-5 py-3 sm:bottom-0">
        <div className="mx-auto max-w-2xl">
          <Button fullWidth size="lg" href="/commande/adresse">
            Continuer
          </Button>
        </div>
      </div>
    </div>
  );
}
