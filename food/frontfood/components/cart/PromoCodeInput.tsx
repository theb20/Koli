"use client";

import { useState } from "react";
import { Tag, X } from "lucide-react";
import { useCartStore } from "@/lib/store/cartStore";
import { formatPriceCents } from "@/lib/utils/format";

export function PromoCodeInput() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const promo = useCartStore((s) => s.promo);
  const applyPromoCode = useCartStore((s) => s.applyPromoCode);
  const removePromo = useCartStore((s) => s.removePromo);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = applyPromoCode(value);
    if (!result.ok) {
      setError(result.reason === "invalid" ? "Code promo invalide ou expiré." : "Montant minimum non atteint pour ce code.");
      return;
    }
    setValue("");
  }

  if (promo) {
    return (
      <div className="flex items-center justify-between rounded-2xl bg-cta/10 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-cta-dark">
          <Tag size={15} />
          {promo.code} appliqué — -{formatPriceCents(promo.discountCents)}
        </span>
        <button onClick={removePromo} aria-label="Retirer le code promo" className="text-cta-dark/60 hover:text-cta-dark">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          placeholder="Code promo"
          className="w-full rounded-full border border-ink-950/15 bg-white px-4 py-2.5 text-sm text-ink-950 placeholder:text-ink-950/35 focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="shrink-0 rounded-full bg-ink-950 px-5 py-2.5 text-sm font-semibold text-cream-100 disabled:opacity-40"
        >
          Appliquer
        </button>
      </div>
      {error && <p className="px-2 text-xs text-maroon-600">{error}</p>}
    </form>
  );
}
