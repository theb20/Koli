"use client";

import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCartStore, type CartItem } from "@/lib/store/cartStore";
import { formatPriceCents } from "@/lib/utils/format";

export function CartItemRow({ item }: { item: CartItem }) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  return (
    <div className="flex gap-3 border-b border-ink-950/8 py-4 last:border-0">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-ink-950/5">
        <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-heading text-sm font-bold text-ink-950">{item.name}</h4>
          <button
            onClick={() => removeItem(item.id)}
            aria-label={`Supprimer ${item.name}`}
            className="shrink-0 text-ink-950/35 transition-colors hover:text-maroon-600"
          >
            <Trash2 size={15} />
          </button>
        </div>

        {item.selectedOptions.length > 0 && (
          <p className="mt-0.5 text-xs text-ink-950/50">
            {item.selectedOptions.map((o) => o.optionName).join(", ")}
          </p>
        )}
        {item.notes && <p className="mt-0.5 text-xs italic text-ink-950/40">« {item.notes} »</p>}

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2 rounded-full bg-ink-950/5 px-1 py-1">
            <button
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
              aria-label="Diminuer la quantité"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-ink-950 shadow-sm"
            >
              <Minus size={12} />
            </button>
            <span className="w-4 text-center text-xs font-bold text-ink-950">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              aria-label="Augmenter la quantité"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-ink-950 shadow-sm"
            >
              <Plus size={12} />
            </button>
          </div>
          <span className="font-heading text-sm font-bold text-maroon-600">
            {formatPriceCents(item.unitPriceCents * item.quantity)}
          </span>
        </div>
      </div>
    </div>
  );
}
