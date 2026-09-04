"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Heart, Minus, Plus, Star } from "lucide-react";
import type { Product, Restaurant, Review } from "@/lib/types";
import { ProductOptionGroup } from "./ProductOptionGroup";
import { ProductReviews } from "./ProductReviews";
import { Button } from "../ui/Button";
import { useCartStore, type SelectedOption } from "@/lib/store/cartStore";
import { useFavoritesStore } from "@/lib/store/favoritesStore";
import { useUiStore } from "@/lib/store/uiStore";
import { formatPriceCents } from "@/lib/utils/format";

function initSelections(product: Product): Record<string, string[]> {
  const initial: Record<string, string[]> = {};
  for (const g of product.optionGroups) {
    if (g.type === "single") {
      const def = g.options.find((o) => o.isDefault) ?? (g.required ? g.options[0] : undefined);
      initial[g.id] = def ? [def.id] : [];
    } else {
      initial[g.id] = g.options.filter((o) => o.isDefault).map((o) => o.id);
    }
  }
  return initial;
}

export function ProductDetailView({
  product,
  restaurant,
  reviews,
}: {
  product: Product;
  restaurant: Restaurant;
  reviews: Review[];
}) {
  const router = useRouter();
  const [selections, setSelections] = useState<Record<string, string[]>>(() => initSelections(product));
  const [quantity, setQuantity] = useState(1);

  const addItem = useCartStore((s) => s.addItem);
  const requestCartConflict = useUiStore((s) => s.requestCartConflict);
  const pushToast = useUiStore((s) => s.pushToast);
  const isFavorite = useFavoritesStore((s) => s.isFavoriteProduct(restaurant.id, product.id));
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavoriteProduct);

  useEffect(() => {
    setSelections(initSelections(product));
    setQuantity(1);
  }, [product]);

  function toggle(groupId: string, optionId: string) {
    const group = product.optionGroups.find((g) => g.id === groupId);
    if (!group) return;
    setSelections((prev) => {
      const current = prev[groupId] ?? [];
      if (group.type === "single") return { ...prev, [groupId]: [optionId] };
      if (current.includes(optionId)) return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      if (current.length >= group.maxSelect) return prev;
      return { ...prev, [groupId]: [...current, optionId] };
    });
  }

  const isValid = product.optionGroups.every(
    (g) => !g.required || (selections[g.id]?.length ?? 0) >= g.minSelect
  );

  const selectedOptions: SelectedOption[] = product.optionGroups.flatMap((g) =>
    (selections[g.id] ?? []).map((optionId) => {
      const option = g.options.find((o) => o.id === optionId)!;
      return { groupName: g.name, optionName: option.name, priceDeltaCents: option.priceDeltaCents };
    })
  );

  const unitPriceCents = product.priceCents + selectedOptions.reduce((s, o) => s + o.priceDeltaCents, 0);
  const totalCents = unitPriceCents * quantity;

  function handleAdd() {
    const payload = { product, restaurant, selectedOptions, quantity };
    const result = addItem(payload);
    if (!result.ok) {
      requestCartConflict(payload);
      return;
    }
    pushToast(`${product.name} ajouté au panier`);
    router.push(`/restaurant/${restaurant.slug}`);
  }

  return (
    <div className="pb-28">
      <div className="relative h-64 w-full sm:h-80">
        <Image src={product.image} alt={product.name} fill sizes="100vw" className="object-cover" priority />
        <button
          onClick={() => router.back()}
          aria-label="Retour"
          className="absolute left-4 top-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-sm sm:top-24"
        >
          <ArrowLeft size={18} className="text-ink-950" />
        </button>
        <button
          onClick={() => toggleFavorite(restaurant.id, product.id)}
          aria-label="Ajouter aux favoris"
          className="absolute right-4 top-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-sm sm:top-24"
        >
          <Heart size={16} className={isFavorite ? "fill-maroon-600 text-maroon-600" : "text-ink-950"} />
        </button>
      </div>

      <div className="mx-auto max-w-2xl px-5 py-5 sm:px-8">
        <p className="text-sm font-semibold text-accent">{restaurant.name}</p>
        <h1 className="font-heading mt-1 text-2xl font-extrabold text-ink-950 sm:text-3xl">{product.name}</h1>
        <div className="mt-2 flex items-center gap-1.5 text-sm text-ink-950/60">
          <Star size={14} className="fill-brand-yellow text-brand-yellow" />
          {product.rating.toFixed(1)} <span className="text-ink-950/40">({product.ratingCount} avis)</span>
        </div>
        <p className="mt-3 text-sm text-ink-950/65">{product.description}</p>

        {!product.isAvailable && (
          <p className="mt-4 rounded-xl bg-maroon-600/10 px-4 py-3 text-sm font-semibold text-maroon-600">
            Ce produit est actuellement indisponible.
          </p>
        )}

        <div className="mt-4">
          {product.optionGroups.map((group) => (
            <ProductOptionGroup
              key={group.id}
              group={group}
              selectedIds={selections[group.id] ?? []}
              onToggle={(optionId) => toggle(group.id, optionId)}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-ink-950/8 pt-4">
          <span className="font-heading text-sm font-bold text-ink-950">Quantité</span>
          <div className="flex items-center gap-3 rounded-full bg-ink-950/5 px-2 py-1.5">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Diminuer la quantité"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-ink-950 shadow-sm"
            >
              <Minus size={13} />
            </button>
            <span className="w-5 text-center text-sm font-bold text-ink-950">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              aria-label="Augmenter la quantité"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-ink-950 shadow-sm"
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        <section className="mt-10">
          <h2 className="font-heading text-lg font-bold text-ink-950">Avis</h2>
          <div className="mt-3">
            <ProductReviews reviews={reviews} />
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-ink-950/10 bg-cream-100 px-5 py-3 sm:bottom-0">
        <div className="mx-auto max-w-2xl">
          <Button fullWidth size="lg" disabled={!isValid || !product.isAvailable} onClick={handleAdd}>
            Ajouter — {formatPriceCents(totalCents)}
          </Button>
        </div>
      </div>
    </div>
  );
}
