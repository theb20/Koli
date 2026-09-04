"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { useCartStore, getItemCount, getSubtotalCents } from "@/lib/store/cartStore";
import { formatPriceCents } from "@/lib/utils/format";

const HIDDEN_ON = ["/panier", "/commande"];

/** Barre flottante persistante quand le panier n'est pas vide — accès rapide au panier depuis n'importe quelle page. */
export function CartSummaryBar() {
  const [mounted, setMounted] = useState(false);
  const items = useCartStore((s) => s.items);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  if (!mounted || items.length === 0) return null;
  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  const count = getItemCount(items);
  const subtotal = getSubtotalCents(items);

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 flex justify-center px-4 sm:bottom-4">
      <button
        onClick={() => router.push("/panier")}
        className="flex w-full max-w-md items-center justify-between gap-3 rounded-full bg-ink-950 px-5 py-3.5 text-white shadow-card transition-transform hover:scale-[1.01]"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <ShoppingBag size={17} />
          {count} article{count > 1 ? "s" : ""}
        </span>
        <span className="text-sm font-bold">Voir le panier — {formatPriceCents(subtotal)}</span>
      </button>
    </div>
  );
}
