"use client";

import { Bike, Zap, Store } from "lucide-react";
import type { DeliveryMode, Restaurant } from "@/lib/types";
import { getDeliveryFeeCents, RAPIDE_SURCHARGE_CENTS } from "@/lib/utils/pricing";
import { formatPriceCents } from "@/lib/utils/format";

const OPTIONS: { mode: DeliveryMode; label: string; icon: typeof Bike; description: (r: Restaurant) => string }[] = [
  {
    mode: "livraison_standard",
    label: "Livraison standard",
    icon: Bike,
    description: (r) => `${r.estimatedDeliveryMinutesMin}-${r.estimatedDeliveryMinutesMax} min`,
  },
  {
    mode: "livraison_rapide",
    label: "Livraison rapide",
    icon: Zap,
    description: (r) => `${Math.max(10, r.estimatedDeliveryMinutesMin - 10)}-${r.estimatedDeliveryMinutesMin} min`,
  },
  {
    mode: "retrait",
    label: "À emporter",
    icon: Store,
    description: () => "Prêt en 15-20 min",
  },
];

export function DeliveryOptionPicker({
  restaurant,
  value,
  onChange,
}: {
  restaurant: Restaurant;
  value: DeliveryMode | null;
  onChange: (mode: DeliveryMode) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.mode;
        const fee = getDeliveryFeeCents(restaurant, opt.mode);
        return (
          <button
            key={opt.mode}
            type="button"
            onClick={() => onChange(opt.mode)}
            className={`flex items-center gap-4 rounded-2xl border bg-white p-4 text-left shadow-card transition-colors ${
              active ? "border-accent" : "border-transparent"
            }`}
          >
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${active ? "bg-accent/10 text-accent" : "bg-ink-950/5 text-ink-950/50"}`}>
              <Icon size={19} />
            </div>
            <div className="flex-1">
              <p className="font-heading text-sm font-bold text-ink-950">{opt.label}</p>
              <p className="text-xs text-ink-950/50">{opt.description(restaurant)}</p>
              {opt.mode === "livraison_rapide" && (
                <p className="text-[11px] text-ink-950/35">
                  +{formatPriceCents(RAPIDE_SURCHARGE_CENTS)} de supplément
                </p>
              )}
            </div>
            <span className="font-heading text-sm font-bold text-ink-950">
              {fee === 0 ? "Gratuit" : formatPriceCents(fee)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
