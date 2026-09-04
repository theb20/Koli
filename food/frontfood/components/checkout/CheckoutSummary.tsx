import Link from "next/link";
import { Store, MapPin, Bike, Zap } from "lucide-react";
import type { Address, DeliveryMode, Restaurant } from "@/lib/types";

const DELIVERY_LABELS: Record<DeliveryMode, string> = {
  livraison_standard: "Livraison standard",
  livraison_rapide: "Livraison rapide",
  retrait: "À emporter",
};

export function CheckoutSummary({
  restaurant,
  address,
  deliveryMode,
}: {
  restaurant: Restaurant;
  address: Address;
  deliveryMode: DeliveryMode;
}) {
  return (
    <div className="flex flex-col divide-y divide-ink-950/8 rounded-2xl bg-white shadow-card">
      <div className="flex items-center justify-between p-4">
        <span className="flex items-center gap-2.5 text-sm">
          <Store size={16} className="text-ink-950/40" />
          <span className="font-semibold text-ink-950">{restaurant.name}</span>
        </span>
        <Link href={`/restaurant/${restaurant.slug}`} className="text-xs font-semibold text-accent">
          Modifier
        </Link>
      </div>

      <div className="flex items-center justify-between p-4">
        <span className="flex items-start gap-2.5 text-sm">
          <MapPin size={16} className="mt-0.5 shrink-0 text-ink-950/40" />
          <span className="text-ink-950">
            <span className="font-semibold">{address.label}</span> — {address.line1}, {address.codePostal} {address.ville}
          </span>
        </span>
        <Link href="/commande/adresse" className="shrink-0 text-xs font-semibold text-accent">
          Modifier
        </Link>
      </div>

      <div className="flex items-center justify-between p-4">
        <span className="flex items-center gap-2.5 text-sm">
          {deliveryMode === "livraison_rapide" ? (
            <Zap size={16} className="text-ink-950/40" />
          ) : (
            <Bike size={16} className="text-ink-950/40" />
          )}
          <span className="font-semibold text-ink-950">{DELIVERY_LABELS[deliveryMode]}</span>
        </span>
        <Link href="/commande/livraison" className="text-xs font-semibold text-accent">
          Modifier
        </Link>
      </div>
    </div>
  );
}
