"use client";

import Image from "next/image";
import { useState } from "react";
import { Star, Plus, Check } from "lucide-react";

export type Product = {
  name: string;
  price: string;
  rating: number;
  image: string;
};

export function ProductCard({ product }: { product: Product }) {
  const [added, setAdded] = useState(false);

  return (
    <article className="group flex flex-col items-center rounded-3xl bg-white p-6 text-center shadow-card transition-transform duration-300 hover:-translate-y-1.5">
      <div className="relative h-28 w-28 overflow-hidden rounded-full ring-4 ring-cream-100 sm:h-32 sm:w-32">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="128px"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </div>

      <div className="mt-4 flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={14}
            className={i < product.rating ? "fill-brand-yellow text-brand-yellow" : "fill-ink-950/10 text-ink-950/10"}
          />
        ))}
      </div>
      <span className="sr-only">Note : {product.rating} sur 5</span>

      <h3 className="font-heading mt-2 text-base font-bold text-ink-950">{product.name}</h3>

      <div className="mt-4 flex w-full items-center justify-between">
        <span className="font-heading text-lg font-extrabold text-maroon-600">{product.price}</span>
        <button
          type="button"
          onClick={() => setAdded(true)}
          aria-label={`Ajouter ${product.name} au panier`}
          className={`flex h-9 w-9 items-center justify-center rounded-full text-white shadow-button transition-all ${
            added ? "bg-cta-dark" : "bg-cta hover:bg-cta-dark"
          } active:scale-90`}
        >
          {added ? <Check size={16} /> : <Plus size={16} />}
        </button>
      </div>
    </article>
  );
}
