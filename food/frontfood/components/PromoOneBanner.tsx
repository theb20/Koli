"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useCartStore, getItemCount } from "@/lib/store/cartStore";

const HIDDEN_ON = ["/connexion", "/panier", "/commande"];

/**
 * Bandeau doré fixe promouvant un vrai code promo existant (LIVRAISONOFFERTE)
 * plutôt qu'un abonnement fictif de type "Régal One" qui n'existe pas dans
 * ce système.
 */
export function PromoOneBanner() {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const pathname = usePathname();
  const items = useCartStore((s) => s.items);

  useEffect(() => setMounted(true), []);

  if (!mounted || dismissed) return null;
  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;
  if (getItemCount(items) > 0) return null; // laisse la place à la barre panier

  return (
    <div className="fixed inset-x-0 bottom-16 z-30 flex items-center justify-between gap-3 bg-brand-yellow px-5 py-3 text-sm font-semibold text-white sm:bottom-0">
      <span>Livraison offerte avec le code LIVRAISONOFFERTE</span>
      <button onClick={() => setDismissed(true)} aria-label="Fermer" className="shrink-0">
        <X size={16} />
      </button>
    </div>
  );
}
