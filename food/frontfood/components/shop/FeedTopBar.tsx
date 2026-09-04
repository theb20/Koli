"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, ShoppingBag } from "lucide-react";
import { useCartStore, getItemCount } from "@/lib/store/cartStore";
import { useAddressStore } from "@/lib/store/addressStore";
import { useProfileStore } from "@/lib/store/profileStore";
import { useUiStore } from "@/lib/store/uiStore";
import { SearchBar } from "./SearchBar";

export function FeedTopBar() {
  const [mounted, setMounted] = useState(false);
  // Bascule Livraison / À emporter — purement visuelle dans cette démo : le
  // mode de livraison réel se choisit à l'étape dédiée du tunnel de commande.
  const [mode, setMode] = useState<"livraison" | "emporter">("livraison");

  useEffect(() => setMounted(true), []);

  const items = useCartStore((s) => s.items);
  const openCartDrawer = useUiStore((s) => s.openCartDrawer);
  const addresses = useAddressStore((s) => s.addresses);
  const selectedAddressId = useAddressStore((s) => s.selectedAddressId);
  const profile = useProfileStore();

  const itemCount = mounted ? getItemCount(items) : 0;
  const selectedAddress = mounted ? addresses.find((a) => a.id === selectedAddressId) : undefined;
  const hasProfile = mounted && Boolean(profile.name || profile.email || profile.phone);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-full bg-ink-950/5 p-1 text-xs font-bold">
          <button
            onClick={() => setMode("livraison")}
            className={`rounded-full px-3.5 py-1.5 transition-colors ${mode === "livraison" ? "bg-ink-950 text-cream-100" : "text-ink-950/50"}`}
          >
            Livraison
          </button>
          <button
            onClick={() => setMode("emporter")}
            className={`rounded-full px-3.5 py-1.5 transition-colors ${mode === "emporter" ? "bg-ink-950 text-cream-100" : "text-ink-950/50"}`}
          >
            À emporter
          </button>
        </div>

        <Link href="/compte/adresses" className="flex items-center gap-1.5 text-sm font-semibold text-ink-950">
          <MapPin size={14} className="text-accent" />
          {selectedAddress ? selectedAddress.ville : "Choisir une adresse"} · Maintenant
        </Link>
      </div>

      <div className="sm:max-w-sm sm:flex-1">
        <SearchBar placeholder="Rechercher dans Régal Express" />
      </div>

      <div className="flex items-center justify-end gap-4">
        <button onClick={openCartDrawer} aria-label="Panier" className="relative text-ink-950">
          <ShoppingBag size={20} />
          {itemCount > 0 && (
            <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
              {itemCount}
            </span>
          )}
        </button>

        {hasProfile ? (
          <Link href="/compte/profil" className="text-sm font-semibold text-ink-950">
            Bonjour, {profile.name || "vous"}
          </Link>
        ) : (
          <div className="flex items-center gap-3 text-sm font-semibold">
            <Link href="/connexion" className="text-ink-950">
              Connexion
            </Link>
            <Link href="/connexion" className="rounded-full bg-ink-950 px-4 py-2 text-cream-100">
              Inscription
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
