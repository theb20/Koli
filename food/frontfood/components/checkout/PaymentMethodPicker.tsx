"use client";

import { CreditCard, Banknote, Smartphone } from "lucide-react";
import type { PaymentMethod } from "@/lib/types";

const OPTIONS: { value: PaymentMethod; label: string; icon: typeof CreditCard }[] = [
  { value: "carte", label: "Carte bancaire (démo)", icon: CreditCard },
  { value: "mobile_money", label: "Mobile Money (démo)", icon: Smartphone },
  { value: "especes", label: "Espèces à la livraison (démo)", icon: Banknote },
];

/**
 * Choix de moyen de paiement — volontairement limité à des libellés, sans
 * aucun champ numéro de carte/CVC : cette démo ne collecte aucune donnée de
 * paiement réelle (voir DemoModeBanner).
 */
export function PaymentMethodPicker({
  value,
  onChange,
}: {
  value: PaymentMethod | null;
  onChange: (method: PaymentMethod) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-4 rounded-2xl border bg-white p-4 text-left shadow-card transition-colors ${
              active ? "border-accent" : "border-transparent"
            }`}
          >
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${active ? "bg-accent/10 text-accent" : "bg-ink-950/5 text-ink-950/50"}`}>
              <Icon size={19} />
            </div>
            <span className="font-heading text-sm font-bold text-ink-950">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
