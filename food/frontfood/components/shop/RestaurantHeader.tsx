"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowLeft, Heart, Share2, Star, Clock, Bike, Wallet2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Restaurant } from "@/lib/types";
import { useFavoritesStore } from "@/lib/store/favoritesStore";
import { useUiStore } from "@/lib/store/uiStore";
import { formatPriceCents } from "@/lib/utils/format";
import { Badge } from "../ui/Badge";

export function RestaurantHeader({ restaurant }: { restaurant: Restaurant }) {
  const router = useRouter();
  const isFavorite = useFavoritesStore((s) => s.isFavoriteRestaurant(restaurant.id));
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavoriteRestaurant);
  const pushToast = useUiStore((s) => s.pushToast);
  const [today] = useState(() => new Date().toLocaleDateString("fr-FR", { weekday: "long" }));

  const todaysHours = restaurant.openingHours.find(
    (h) => h.day.toLowerCase() === today.toLowerCase()
  );

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: restaurant.name, url });
        return;
      } catch {
        // annulé par l'utilisateur — pas d'action
      }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      pushToast("Lien copié dans le presse-papiers");
    }
  }

  return (
    <div>
      <div className="relative h-56 w-full sm:h-72">
        <Image src={restaurant.coverImage} alt={restaurant.name} fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-ink-950/10 to-transparent" />

        <button
          onClick={() => router.back()}
          aria-label="Retour"
          className="absolute left-4 top-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-sm sm:top-24"
        >
          <ArrowLeft size={18} className="text-ink-950" />
        </button>

        <div className="absolute right-4 top-20 flex items-center gap-2 sm:top-24">
          <button
            onClick={handleShare}
            aria-label="Partager"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-sm"
          >
            <Share2 size={16} className="text-ink-950" />
          </button>
          <button
            onClick={() => toggleFavorite(restaurant.id)}
            aria-label="Ajouter aux favoris"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-sm"
          >
            <Heart size={16} className={isFavorite ? "fill-maroon-600 text-maroon-600" : "text-ink-950"} />
          </button>
        </div>

        <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
          <div>
            <h1 className="font-heading text-2xl font-extrabold text-white sm:text-3xl">{restaurant.name}</h1>
            <p className="text-sm text-white/80">{restaurant.tagline}</p>
          </div>
          {restaurant.isOpen ? (
            <Badge tone="success">Ouvert</Badge>
          ) : (
            <Badge tone="danger">Fermé</Badge>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 py-5 sm:px-8">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-950/70">
          <span className="flex items-center gap-1.5 font-semibold text-ink-950">
            <Star size={15} className="fill-brand-yellow text-brand-yellow" />
            {restaurant.rating.toFixed(1)} <span className="font-normal text-ink-950/40">({restaurant.ratingCount} avis)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={15} />
            {restaurant.estimatedDeliveryMinutesMin}-{restaurant.estimatedDeliveryMinutesMax} min
          </span>
          <span className="flex items-center gap-1.5">
            <Bike size={15} />
            {restaurant.deliveryFeeCents === 0 ? "Livraison gratuite" : `Livraison ${formatPriceCents(restaurant.deliveryFeeCents)}`}
          </span>
          <span className="flex items-center gap-1.5">
            <Wallet2 size={15} />
            Min. {formatPriceCents(restaurant.minOrderCents)}
          </span>
        </div>

        {todaysHours && (
          <p className="mt-2 text-xs text-ink-950/45">
            Aujourd&apos;hui ({today}) : {todaysHours.hours}
          </p>
        )}

        <p className="mt-3 max-w-2xl text-sm text-ink-950/60">{restaurant.description}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {restaurant.tags.map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
