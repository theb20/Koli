"use client";

import { Heart } from "lucide-react";
import { useFavoritesStore } from "@/lib/store/favoritesStore";
import { RESTAURANTS, PRODUCTS, getRestaurantById } from "@/lib/data";
import { RestaurantCard } from "../shop/RestaurantCard";
import { ProductCard } from "../ProductCard";
import { EmptyState } from "../ui/EmptyState";

export function FavoritesGrid() {
  const favoriteRestaurantIds = useFavoritesStore((s) => s.favoriteRestaurantIds);
  const favoriteProductIds = useFavoritesStore((s) => s.favoriteProductIds);

  const favoriteRestaurants = RESTAURANTS.filter((r) => favoriteRestaurantIds.includes(r.id));
  const favoriteProducts = favoriteProductIds
    .map((key) => {
      const [restaurantId, productId] = key.split(":");
      const restaurant = getRestaurantById(restaurantId);
      const product = PRODUCTS.find((p) => p.id === productId);
      return restaurant && product ? { restaurant, product } : null;
    })
    .filter((v): v is { restaurant: (typeof RESTAURANTS)[number]; product: (typeof PRODUCTS)[number] } => Boolean(v));

  if (favoriteRestaurants.length === 0 && favoriteProducts.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="Aucun favori pour le moment"
        description="Ajoutez des restaurants ou des plats en favoris pour les retrouver ici."
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {favoriteRestaurants.length > 0 && (
        <section>
          <h3 className="font-heading mb-3 text-sm font-bold text-ink-950">Restaurants</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {favoriteRestaurants.map((r) => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>
        </section>
      )}

      {favoriteProducts.length > 0 && (
        <section>
          <h3 className="font-heading mb-3 text-sm font-bold text-ink-950">Plats</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {favoriteProducts.map(({ product, restaurant }) => (
              <ProductCard key={product.id} product={product} restaurant={restaurant} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
