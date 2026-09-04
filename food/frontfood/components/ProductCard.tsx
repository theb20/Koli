"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Star, Plus, Check } from "lucide-react";
import type { Product, Restaurant } from "@/lib/types";
import { useCartStore } from "@/lib/store/cartStore";
import { useUiStore } from "@/lib/store/uiStore";
import { formatPriceCents } from "@/lib/utils/format";
import { ProductCustomizationSheet } from "./product/ProductCustomizationSheet";

export function ProductCard({ product, restaurant }: { product: Product; restaurant: Restaurant }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const addItem = useCartStore((s) => s.addItem);
  const requestCartConflict = useUiStore((s) => s.requestCartConflict);
  const pushToast = useUiStore((s) => s.pushToast);

  const hasRequiredOptions = product.optionGroups.some((g) => g.required);
  const href = `/restaurant/${restaurant.slug}/produit/${product.slug}`;

  function handleQuickAdd() {
    if (!product.isAvailable) return;
    if (hasRequiredOptions) {
      setSheetOpen(true);
      return;
    }
    const payload = { product, restaurant, selectedOptions: [], quantity: 1 };
    const result = addItem(payload);
    if (!result.ok) {
      requestCartConflict(payload);
      return;
    }
    pushToast(`${product.name} ajouté au panier`);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  }

  return (
    <>
      <article className="group flex flex-col items-center rounded-3xl bg-white p-6 text-center shadow-card transition-transform duration-300 hover:-translate-y-1.5">
        <Link href={href} className="flex flex-col items-center">
          <div className="relative h-28 w-28 overflow-hidden rounded-full ring-4 ring-cream-100 sm:h-32 sm:w-32">
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="128px"
              className="object-cover transition-transform duration-500 group-hover:scale-110"
            />
            {!product.isAvailable && (
              <div className="absolute inset-0 flex items-center justify-center bg-ink-950/55">
                <span className="text-[10px] font-bold uppercase tracking-wide text-white">Indisponible</span>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-0.5" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={14}
                className={i < Math.round(product.rating) ? "fill-brand-yellow text-brand-yellow" : "fill-ink-950/10 text-ink-950/10"}
              />
            ))}
          </div>
          <span className="sr-only">Note : {product.rating} sur 5</span>

          <h3 className="font-heading mt-2 text-base font-bold text-ink-950">{product.name}</h3>
        </Link>

        <div className="mt-4 flex w-full items-center justify-between">
          <span className="font-heading text-lg font-extrabold text-maroon-600">{formatPriceCents(product.priceCents)}</span>
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={!product.isAvailable}
            aria-label={hasRequiredOptions ? `Personnaliser ${product.name}` : `Ajouter ${product.name} au panier`}
            className={`flex h-9 w-9 items-center justify-center rounded-full text-white shadow-button transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
              justAdded ? "bg-cta-dark" : "bg-cta hover:bg-cta-dark"
            } active:scale-90`}
          >
            {justAdded ? <Check size={16} /> : <Plus size={16} />}
          </button>
        </div>
      </article>

      <ProductCustomizationSheet
        product={sheetOpen ? product : null}
        restaurant={sheetOpen ? restaurant : null}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
