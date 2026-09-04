"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Minus, Plus } from "lucide-react";
import type { Product, Restaurant } from "@/lib/types";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import { ProductOptionGroup } from "./ProductOptionGroup";
import { useCartStore, type SelectedOption } from "@/lib/store/cartStore";
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

export function ProductCustomizationSheet({
  product,
  restaurant,
  open,
  onClose,
}: {
  product: Product | null;
  restaurant: Restaurant | null;
  open: boolean;
  onClose: () => void;
}) {
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);

  const addItem = useCartStore((s) => s.addItem);
  const requestCartConflict = useUiStore((s) => s.requestCartConflict);
  const pushToast = useUiStore((s) => s.pushToast);

  useEffect(() => {
    if (product && open) {
      setSelections(initSelections(product));
      setQuantity(1);
    }
  }, [product, open]);

  if (!product || !restaurant) return null;

  function toggle(groupId: string, optionId: string) {
    const group = product!.optionGroups.find((g) => g.id === groupId);
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

  function handleSubmit() {
    const payload = { product: product!, restaurant: restaurant!, selectedOptions, quantity };
    const result = addItem(payload);
    if (!result.ok) {
      requestCartConflict(payload);
      onClose();
      return;
    }
    pushToast(`${product!.name} ajouté au panier`);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={product.name}>
      <div className="flex flex-col">
        <div className="relative h-44 w-full">
          <Image src={product.image} alt={product.name} fill sizes="512px" className="object-cover" />
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-ink-950/60">{product.description}</p>

          {!product.isAvailable && (
            <p className="mt-3 rounded-xl bg-maroon-600/10 px-3 py-2 text-sm font-semibold text-maroon-600">
              Ce produit est actuellement indisponible.
            </p>
          )}

          {product.optionGroups.map((group) => (
            <ProductOptionGroup
              key={group.id}
              group={group}
              selectedIds={selections[group.id] ?? []}
              onToggle={(optionId) => toggle(group.id, optionId)}
            />
          ))}

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
        </div>

        <div className="sticky bottom-0 border-t border-ink-950/10 bg-cream-100 px-5 py-4">
          <Button
            fullWidth
            size="lg"
            disabled={!isValid || !product.isAvailable}
            onClick={handleSubmit}
          >
            Ajouter — {formatPriceCents(totalCents)}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
