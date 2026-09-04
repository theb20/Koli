"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/cartStore";
import { useAddressStore } from "@/lib/store/addressStore";
import { getRestaurantById } from "@/lib/data";
import { computeOrderTotals } from "@/lib/utils/pricing";
import { DemoModeBanner } from "@/components/ui/DemoModeBanner";
import { CheckoutSummary } from "@/components/checkout/CheckoutSummary";
import { PaymentMethodPicker } from "@/components/checkout/PaymentMethodPicker";
import { PlaceOrderButton } from "@/components/checkout/PlaceOrderButton";
import { OrderTotals } from "@/components/cart/OrderTotals";
import { Button } from "@/components/ui/Button";
import type { PaymentMethod } from "@/lib/types";

export default function PaiementPage() {
  const [mounted, setMounted] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const router = useRouter();

  const restaurantId = useCartStore((s) => s.restaurantId);
  const items = useCartStore((s) => s.items);
  const deliveryMode = useCartStore((s) => s.deliveryMode);
  const promo = useCartStore((s) => s.promo);
  const tipCents = useCartStore((s) => s.tipCents);
  const setPaymentMethodInCart = useCartStore((s) => s.setPaymentMethod);

  const addresses = useAddressStore((s) => s.addresses);
  const selectedAddressId = useAddressStore((s) => s.selectedAddressId);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (items.length === 0) router.replace("/panier");
    else if (!selectedAddressId) router.replace("/commande/adresse");
    else if (!deliveryMode) router.replace("/commande/livraison");
  }, [mounted, items.length, selectedAddressId, deliveryMode, router]);

  if (!mounted) return <div className="min-h-[60vh]" />;

  const restaurant = restaurantId ? getRestaurantById(restaurantId) : undefined;
  const address = addresses.find((a) => a.id === selectedAddressId);
  if (!restaurant || !address || !deliveryMode) return <div className="min-h-[60vh]" />;

  const totals = computeOrderTotals(items, restaurant, deliveryMode, promo?.discountCents ?? 0, tipCents);

  return (
    <div className="mx-auto max-w-xl px-5 pb-32 pt-24 sm:px-8 sm:pt-28">
      <h1 className="font-heading text-2xl font-extrabold text-ink-950">Paiement</h1>

      <div className="mt-5">
        <CheckoutSummary restaurant={restaurant} address={address} deliveryMode={deliveryMode} />
      </div>

      <h2 className="font-heading mt-6 mb-2 text-sm font-bold text-ink-950">Moyen de paiement</h2>
      <PaymentMethodPicker
        value={paymentMethod}
        onChange={(m) => {
          setPaymentMethod(m);
          setPaymentMethodInCart(m);
        }}
      />

      <div className="mt-6 rounded-2xl bg-white p-4 shadow-card">
        <OrderTotals totals={totals} />
      </div>

      <div className="mt-6">
        <DemoModeBanner variant="payment" />
      </div>

      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-ink-950/10 bg-cream-100 px-5 py-3 sm:bottom-0">
        <div className="mx-auto max-w-xl">
          {paymentMethod ? (
            <PlaceOrderButton
              restaurant={restaurant}
              address={address}
              deliveryMode={deliveryMode}
              paymentMethod={paymentMethod}
              totals={totals}
              items={items}
            />
          ) : (
            <Button fullWidth size="lg" disabled>
              Choisissez un moyen de paiement
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
