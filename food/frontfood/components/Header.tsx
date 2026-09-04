"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, User, ShoppingBag, Menu, X } from "lucide-react";
import { useCartStore, getItemCount } from "@/lib/store/cartStore";
import { useUiStore } from "@/lib/store/uiStore";
import { useProfileStore } from "@/lib/store/profileStore";
import { Logo } from "./Logo";

// Pages avec leur propre bandeau (connexion plein écran, feed avec sa barre dédiée) —
// le header global y serait redondant.
const NO_GLOBAL_HEADER = ["/connexion", "/recherche"];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const items = useCartStore((s) => s.items);
  const openCartDrawer = useUiStore((s) => s.openCartDrawer);
  const profile = useProfileStore();

  useEffect(() => setMounted(true), []);

  const itemCount = mounted ? getItemCount(items) : 0;
  const hasProfile = mounted && Boolean(profile.name || profile.email || profile.phone);

  if (NO_GLOBAL_HEADER.includes(pathname)) return null;

  return (
<header className="fixed flex items-center justify-between px-5 py-3 inset-x-0 top-0 z-50 w-full bg-ink-950">
    <Link href="/" className="text-cream-100">
      <Logo size={32} />
    </Link>

    <div className="flex items-center gap-5">
      <div className="hidden items-center gap-5 text-cream-100 sm:flex">
        <Link
          href="/recherche"
          aria-label="Rechercher"
          className="transition-colors hover:text-cta"
        >
          <Search size={18} />
        </Link>

        <button
          type="button"
          onClick={openCartDrawer}
          aria-label="Panier"
          className="relative transition-colors hover:text-cta"
        >
          <ShoppingBag size={18} />

          {itemCount > 0 && (
            <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-cta px-1 text-[10px] font-bold text-white">
              {itemCount}
            </span>
          )}
        </button>

        {hasProfile ? (
          <Link
            href="/compte/profil"
            aria-label="Mon compte"
            className="transition-colors hover:text-cta"
          >
            <User size={18} />
          </Link>
        ) : (
          <Link
            href="/connexion"
            className="text-sm font-semibold transition-colors hover:text-cta"
          >
            Connexion
          </Link>
        )}
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-cream-100 sm:hidden"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={open}
      >
        {open ? <X size={24} /> : <Menu size={24} />}
      </button>
    </div>

  {open && (
    <nav className="w-full border-t border-cream-100/10 px-5 pb-5 pt-3 sm:hidden">
      <div className="flex w-full flex-col gap-1">
        <Link
          href="/recherche"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-cream-100/90 hover:bg-white/5"
        >
          <Search size={16} />
          Rechercher
        </Link>

        {hasProfile ? (
          <Link
            href="/compte/profil"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-cream-100/90 hover:bg-white/5"
          >
            <User size={16} />
            Mon compte
          </Link>
        ) : (
          <Link
            href="/connexion"
            onClick={() => setOpen(false)}
            className="mt-1 rounded-full bg-cta px-6 py-2.5 text-center text-sm font-bold text-white"
          >
            Connexion
          </Link>
        )}
      </div>
    </nav>
  )}
</header>
  );
}
