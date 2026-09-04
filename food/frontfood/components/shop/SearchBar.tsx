"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Clock, X } from "lucide-react";
import { useSearchStore } from "@/lib/store/searchStore";
import { searchCatalog } from "@/lib/data";

export function SearchBar({ placeholder = "Rechercher un plat, un restaurant…" }: { placeholder?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const recentSearches = useSearchStore((s) => s.recentSearches);
  const addRecentSearch = useSearchStore((s) => s.addRecentSearch);
  const removeRecentSearch = useSearchStore((s) => s.removeRecentSearch);

  const suggestions = useMemo(() => {
    if (!value.trim()) return null;
    const { restaurants, matchedProducts } = searchCatalog({ q: value });
    return { restaurants: restaurants.slice(0, 4), products: matchedProducts.slice(0, 4) };
  }, [value]);

  function go(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    addRecentSearch(trimmed);
    setFocused(false);
    inputRef.current?.blur();
    router.push(`/recherche?q=${encodeURIComponent(trimmed)}`);
  }

  const showDropdown = focused && (recentSearches.length > 0 || value.trim().length > 0);

  return (
    <div className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(value);
        }}
        className="flex items-center gap-2 rounded-full bg-white px-5 py-3 shadow-card"
      >
        <Search size={18} className="shrink-0 text-ink-950/40" />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-ink-950 placeholder:text-ink-950/40 focus:outline-none"
        />
        {value && (
          <button type="button" onClick={() => setValue("")} aria-label="Effacer" className="text-ink-950/30">
            <X size={16} />
          </button>
        )}
      </form>

      {showDropdown && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-2xl bg-white p-3 shadow-card">
          {!value.trim() && recentSearches.length > 0 && (
            <>
              <p className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-ink-950/40">
                Recherches récentes
              </p>
              {recentSearches.map((term) => (
                <div key={term} className="flex items-center justify-between rounded-xl px-2 py-2 hover:bg-ink-950/5">
                  <button
                    type="button"
                    onMouseDown={() => go(term)}
                    className="flex flex-1 items-center gap-2 text-left text-sm text-ink-950"
                  >
                    <Clock size={14} className="text-ink-950/35" />
                    {term}
                  </button>
                  <button
                    type="button"
                    onMouseDown={() => removeRecentSearch(term)}
                    aria-label={`Supprimer "${term}"`}
                    className="text-ink-950/30 hover:text-maroon-600"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </>
          )}

          {value.trim() && suggestions && (
            <>
              {suggestions.restaurants.length === 0 && suggestions.products.length === 0 && (
                <p className="px-2 py-3 text-sm text-ink-950/40">Aucun résultat pour « {value} ».</p>
              )}
              {suggestions.restaurants.length > 0 && (
                <>
                  <p className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-ink-950/40">Restaurants</p>
                  {suggestions.restaurants.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onMouseDown={() => router.push(`/restaurant/${r.slug}`)}
                      className="block w-full rounded-xl px-2 py-2 text-left text-sm text-ink-950 hover:bg-ink-950/5"
                    >
                      {r.name}
                    </button>
                  ))}
                </>
              )}
              {suggestions.products.length > 0 && (
                <>
                  <p className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-ink-950/40">Plats</p>
                  {suggestions.products.map(({ product, restaurant }) => (
                    <button
                      key={product.id}
                      type="button"
                      onMouseDown={() => router.push(`/restaurant/${restaurant.slug}/produit/${product.slug}`)}
                      className="block w-full rounded-xl px-2 py-2 text-left text-sm text-ink-950 hover:bg-ink-950/5"
                    >
                      {product.name} <span className="text-ink-950/40">— {restaurant.name}</span>
                    </button>
                  ))}
                </>
              )}
              <button
                type="button"
                onMouseDown={() => go(value)}
                className="mt-1 block w-full rounded-xl px-2 py-2 text-left text-sm font-semibold text-accent hover:bg-accent/5"
              >
                Voir tous les résultats pour « {value} »
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
