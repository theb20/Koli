"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Restaurant } from "@/lib/types";
import { RestaurantCard } from "./RestaurantCard";
import { Reveal } from "../Reveal";

export function RestaurantRail({
  title,
  restaurants,
  seeAllHref,
}: {
  title: string;
  restaurants: Restaurant[];
  seeAllHref?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (restaurants.length === 0) return null;

  function scroll(direction: -1 | 1) {
    scrollerRef.current?.scrollBy({ left: direction * 320, behavior: "smooth" });
  }

  return (
    <section className="bg-cream-100 py-10 sm:py-12">
      <div className="mx-auto ">
        <Reveal className="flex items-center justify-between">
          <h2 className="font-heading text-xl font-extrabold text-ink-950 sm:text-2xl">{title}</h2>
          <div className="flex items-center gap-3">
            {seeAllHref && (
              <Link href={seeAllHref} className="text-sm font-semibold text-accent">
                Tout afficher
              </Link>
            )}
            <div className="hidden items-center gap-1.5 sm:flex">
              <button
                onClick={() => scroll(-1)}
                aria-label="Précédent"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink-950/60 shadow-sm hover:text-accent"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => scroll(1)}
                aria-label="Suivant"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink-950/60 shadow-sm hover:text-accent"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </Reveal>

        <div ref={scrollerRef} className="mt-6 flex snap-x scroll-smooth gap-5 overflow-x-auto overflow-y-hidden pb-2">
          {restaurants.map((r, i) => (
            <Reveal key={r.id} delay={i * 70} className="w-100 shrink-0 snap-start">
              <RestaurantCard restaurant={r} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
