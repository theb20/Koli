"use client";

import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { CartItemRow } from "./CartItemRow";
import { useCartStore, getSubtotalCents } from "@/lib/store/cartStore";
import { useUiStore } from "@/lib/store/uiStore";
import { formatPriceCents } from "@/lib/utils/format";

export function CartDrawer() {
  const isOpen = useUiStore((s) => s.isCartDrawerOpen);
  const closeCartDrawer = useUiStore((s) => s.closeCartDrawer);
  const items = useCartStore((s) => s.items);
  const router = useRouter();

  const subtotal = getSubtotalCents(items);

  return (
    <Sheet open={isOpen} onClose={closeCartDrawer} title="Votre panier" side="right">
      <div className="flex h-full flex-col px-5 py-4">
        {items.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="Votre panier est vide"
            description="Ajoutez des plats depuis un restaurant pour commencer."
          />
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              {items.map((item) => (
                <CartItemRow key={item.id} item={item} />
              ))}
            </div>

            <div className="mt-4 border-t border-ink-950/10 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-950/60">Sous-total</span>
                <span className="font-heading font-bold text-ink-950">{formatPriceCents(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-ink-950/40">Frais de livraison et service calculés à l&apos;étape suivante.</p>
              <Button
                fullWidth
                size="lg"
                className="mt-4"
                onClick={() => {
                  closeCartDrawer();
                  router.push("/panier");
                }}
              >
                Voir le panier
              </Button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
