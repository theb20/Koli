"use client";

import { useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { CATEGORIES } from "@/lib/data";
import { CATEGORY_ICONS } from "@/lib/categoryIcons";

/**
 * Rangée horizontale de catégories façon feed Uber Eats — remplace la
 * sidebar verticale : on est une plateforme mono-verticale (repas
 * uniquement), donc pas de rubriques Courses/Épicerie/Alcool/Animalerie/
 * Fleurs/Bébé/Hygiène qui n'existent pas dans ce produit. Seules les
 * catégories de cuisine réellement présentes dans le catalogue apparaissent.
 */
export function CategoryIconRow() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const activeCategorie = searchParams.get("categorie");

  function scrollRight() {
    scrollerRef.current?.scrollBy({ left: 280, behavior: "smooth" });
  }

  return (
    <div className="relative flex items-center gap-2 border-b border-ink-950/8 py-3">
      <div ref={scrollerRef} className="flex flex-1 gap-6 overflow-x-auto scroll-smooth">
        {CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.icon];
          const active = activeCategorie === cat.slug;
          return (
            <Link
              key={cat.slug}
              href={`/recherche?categorie=${cat.slug}`}
              className={`flex shrink-0 flex-col items-center gap-1.5 pb-1 text-xs font-semibold transition-colors ${
                active ? "border-b-2 border-ink-950 text-ink-950" : "text-ink-950/55 hover:text-ink-950"
              }`}
            >
              {Icon && <Icon size={22} />}
              {cat.label}
            </Link>
          );
        })}
      </div>
      <button
        onClick={scrollRight}
        aria-label="Voir plus de catégories"
        className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-ink-950/60 shadow-sm sm:flex"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
