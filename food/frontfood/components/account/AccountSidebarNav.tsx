"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, ClipboardList, Heart, MapPin } from "lucide-react";

const LINKS = [
  { href: "/compte/profil", label: "Profil", icon: User },
  { href: "/compte/commandes", label: "Mes commandes", icon: ClipboardList },
  { href: "/compte/favoris", label: "Mes favoris", icon: Heart },
  { href: "/compte/adresses", label: "Adresses", icon: MapPin },
];

export function AccountSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto pb-2 sm:w-48 sm:shrink-0 sm:flex-col sm:overflow-visible sm:pb-0">
      {LINKS.map((link) => {
        const active = pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex shrink-0 items-center gap-2.5 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              active ? "bg-ink-950 text-cream-100" : "bg-white text-ink-950/60 shadow-sm hover:bg-ink-950/5"
            }`}
          >
            <Icon size={16} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
