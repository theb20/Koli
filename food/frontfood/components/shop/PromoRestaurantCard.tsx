"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import type { Restaurant } from "@/lib/types";
import { useFavoritesStore } from "@/lib/store/favoritesStore";

export function PromoRestaurantCard({
  restaurant,
  badge,
  className = "",
}: {
  restaurant: Restaurant;
  badge: string;
  className?: string;
}) {
  const isFavorite = useFavoritesStore((s) => s.isFavoriteRestaurant(restaurant.id));
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavoriteRestaurant);

  return (
    <Link
      href={`/restaurant/${restaurant.slug}`}
      className={`group flex flex-col overflow-hidden rounded-2xl bg-white shadow-card transition-transform duration-300 hover:-translate-y-1 ${className}`}
    >
      <div className="relative h-28 w-full overflow-hidden">
        <Image
          src={restaurant.coverImage}
          alt={restaurant.name}
          fill
          sizes="680px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-2.5 top-2.5 rounded-md bg-ink-950 px-2 py-1 text-[10px] font-bold text-cream-100">
          {badge}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggleFavorite(restaurant.id);
          }}
          aria-label="Ajouter aux favoris"
          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-ink-950"
        >
          <Heart size={13} className={isFavorite ? "fill-maroon-600 text-maroon-600" : ""} />
        </button>
      </div>
      <div className="p-3">
        <p className="font-heading text-sm font-bold text-ink-950">{restaurant.name}</p>
        <p className="mt-0.5 text-xs text-ink-950/50">
          {restaurant.rating.toFixed(1)} ★ ({restaurant.ratingCount > 999 ? `${Math.floor(restaurant.ratingCount / 1000)}k+` : `${restaurant.ratingCount}+`})
          {" · "}
          {restaurant.estimatedDeliveryMinutesMin} min
        </p>
      </div>
    </Link>
  );
}
