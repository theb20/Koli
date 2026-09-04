"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Star, Clock, Bike } from "lucide-react";
import type { Restaurant } from "@/lib/types";
import { useFavoritesStore } from "@/lib/store/favoritesStore";
import { formatPriceCents } from "@/lib/utils/format";
import { Badge } from "../ui/Badge";

export function RestaurantCard({ restaurant, className = "" }: { restaurant: Restaurant; className?: string }) {
  const isFavorite = useFavoritesStore((s) => s.isFavoriteRestaurant(restaurant.id));
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavoriteRestaurant);

  return (
    <Link
      href={`/restaurant/${restaurant.slug}`}
      className={`group flex flex-col overflow-hidden rounded-3xl bg-white shadow-card transition-transform duration-300 hover:-translate-y-1 ${className}`}
    >
      <div className="relative h-36 w-full overflow-hidden">
        <Image
          src={restaurant.coverImage}
          alt={restaurant.name}
          fill
          sizes="320px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {!restaurant.isOpen && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-950/55">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink-950">
              Fermé
            </span>
          </div>
        )}
        {restaurant.promoted && restaurant.isOpen && (
          <span className="absolute left-3 top-3">
            <Badge tone="brand">Sponsorisé</Badge>
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggleFavorite(restaurant.id);
          }}
          aria-label="Ajouter aux favoris"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink-950 shadow-sm transition-colors hover:text-maroon-600"
        >
          <Heart size={15} className={isFavorite ? "fill-maroon-600 text-maroon-600" : ""} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-heading text-base font-bold text-ink-950">{restaurant.name}</h3>
          <span className="shrink-0 text-xs font-semibold text-ink-950/50">{restaurant.priceRange}</span>
        </div>
        <p className="line-clamp-1 text-xs text-ink-950/50">{restaurant.tagline}</p>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-950/60">
          <span className="flex items-center gap-1 font-semibold text-ink-950">
            <Star size={12} className="fill-brand-yellow text-brand-yellow" />
            {restaurant.rating.toFixed(1)}
            <span className="font-normal text-ink-950/40">({restaurant.ratingCount})</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {restaurant.estimatedDeliveryMinutesMin}-{restaurant.estimatedDeliveryMinutesMax} min
          </span>
          <span className="flex items-center gap-1">
            <Bike size={12} />
            {restaurant.deliveryFeeCents === 0 ? "Gratuite" : formatPriceCents(restaurant.deliveryFeeCents)}
          </span>
        </div>
      </div>
    </Link>
  );
}
