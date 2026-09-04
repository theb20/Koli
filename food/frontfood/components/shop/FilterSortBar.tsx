"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { SortOption } from "@/lib/data";

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: "Recommandé", value: "recommande" },
  { label: "Plus proche", value: "plus_proche" },
  { label: "Plus rapide", value: "plus_rapide" },
  { label: "Mieux noté", value: "mieux_note" },
  { label: "Moins cher", value: "moins_cher" },
  { label: "Plus populaire", value: "plus_populaire" },
];

const TOGGLE_FILTERS: { label: string; key: string }[] = [
  { label: "Ouvert maintenant", key: "ouvert" },
  { label: "Livraison gratuite", key: "livraison" },
  { label: "Végétarien", key: "vege" },
  { label: "Halal", key: "halal" },
  { label: "Promotions", key: "promo" },
];

export function FilterSortBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) params.delete(key);
    else params.set(key, value);
    router.push(`/recherche?${params.toString()}`);
  }

  function toggleFlag(key: string) {
    updateParam(key, searchParams.get(key) === "1" ? null : "1");
  }

  const sort = (searchParams.get("tri") as SortOption) || "recommande";
  const activePrices = (searchParams.get("prix") ?? "").split(",").filter(Boolean);

  function togglePrice(range: string) {
    const next = activePrices.includes(range)
      ? activePrices.filter((r) => r !== range)
      : [...activePrices, range];
    updateParam("prix", next.length ? next.join(",") : null);
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <div className="relative shrink-0">
        <select
          value={sort}
          onChange={(e) => updateParam("tri", e.target.value === "recommande" ? null : e.target.value)}
          className="appearance-none rounded-full bg-white py-2 pl-4 pr-9 text-sm font-semibold text-ink-950 shadow-sm focus:outline-none"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Trier : {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-950/40" />
      </div>

      <div className="h-6 w-px shrink-0 bg-ink-950/10" />

      {["€", "€€", "€€€"].map((range) => (
        <button
          key={range}
          onClick={() => togglePrice(range)}
          className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
            activePrices.includes(range) ? "bg-accent text-white" : "bg-white text-ink-950/60 shadow-sm hover:bg-ink-950/5"
          }`}
        >
          {range}
        </button>
      ))}

      <div className="h-6 w-px shrink-0 bg-ink-950/10" />

      {TOGGLE_FILTERS.map((f) => {
        const active = searchParams.get(f.key) === "1";
        return (
          <button
            key={f.key}
            onClick={() => toggleFlag(f.key)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
              active ? "bg-accent text-white" : "bg-white text-ink-950/60 shadow-sm hover:bg-ink-950/5"
            }`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
