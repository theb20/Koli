"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ClipboardList, User } from "lucide-react";

const TABS = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/recherche", label: "Recherche", icon: Search },
  { href: "/compte/commandes", label: "Commandes", icon: ClipboardList },
  { href: "/compte/profil", label: "Profil", icon: User },
];

/** Barre de navigation basse — mobile uniquement, style marketplace. */
export function MobileBottomNav() {
  const pathname = usePathname();

  if (pathname === "/connexion") return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-ink-950/8 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-sm sm:hidden">
      {TABS.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-semibold transition-colors ${
              active ? "text-accent" : "text-ink-950/40"
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.4 : 2} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
