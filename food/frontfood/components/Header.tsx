"use client";

import { useEffect, useState } from "react";
import { Search, User, ShoppingBag, Menu, X, Flame } from "lucide-react";

const LINKS = [
  { label: "Accueil", href: "#top" },
  { label: "Menu", href: "#menu" },
  { label: "À propos", href: "#apropos" },
  { label: "Blog", href: "#blog" },
  { label: "Contact", href: "#contact" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const inkText = scrolled ? "text-ink-950" : "text-cream-100";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-cream-100/95 shadow-md shadow-ink-950/5 backdrop-blur-sm" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <a href="#top" className={`flex items-center gap-2 font-heading text-2xl font-extrabold tracking-tight ${inkText}`}>
          <Flame className="text-brand-orange" size={26} strokeWidth={2.4} />
          Ember
        </a>

        <nav className="hidden items-center gap-8 lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`font-heading text-sm font-semibold tracking-wide transition-colors hover:text-brand-orange ${inkText}`}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <div className={`hidden items-center gap-4 sm:flex ${inkText}`}>
            <button type="button" aria-label="Rechercher" className="transition-colors hover:text-brand-orange">
              <Search size={19} />
            </button>
            <button type="button" aria-label="Mon compte" className="transition-colors hover:text-brand-orange">
              <User size={19} />
            </button>
            <button type="button" aria-label="Panier" className="transition-colors hover:text-brand-orange">
              <ShoppingBag size={19} />
            </button>
          </div>

          <a
            href="#menu"
            className="hidden rounded-full bg-cta px-6 py-2.5 font-heading text-sm font-bold tracking-wide text-white uppercase shadow-button transition-colors hover:bg-cta-dark sm:inline-block"
          >
            Commander
          </a>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`lg:hidden ${inkText}`}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
          >
            {open ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 bg-ink-950 px-5 pb-5 lg:hidden">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 font-heading text-sm font-semibold text-cream-100/90 hover:bg-white/5"
            >
              {l.label}
            </a>
          ))}
          <a
            href="#menu"
            onClick={() => setOpen(false)}
            className="mt-2 rounded-full bg-cta px-6 py-2.5 text-center font-heading text-sm font-bold tracking-wide text-white uppercase"
          >
            Commander
          </a>
        </nav>
      )}
    </header>
  );
}
