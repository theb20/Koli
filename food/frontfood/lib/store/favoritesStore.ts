"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type FavoritesState = {
  favoriteRestaurantIds: string[];
  favoriteProductIds: string[]; // "restaurantId:productId"
  toggleFavoriteRestaurant: (id: string) => void;
  toggleFavoriteProduct: (restaurantId: string, productId: string) => void;
  isFavoriteRestaurant: (id: string) => boolean;
  isFavoriteProduct: (restaurantId: string, productId: string) => boolean;
};

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favoriteRestaurantIds: [],
      favoriteProductIds: [],

      toggleFavoriteRestaurant: (id) =>
        set((state) => ({
          favoriteRestaurantIds: state.favoriteRestaurantIds.includes(id)
            ? state.favoriteRestaurantIds.filter((x) => x !== id)
            : [...state.favoriteRestaurantIds, id],
        })),

      toggleFavoriteProduct: (restaurantId, productId) => {
        const key = `${restaurantId}:${productId}`;
        set((state) => ({
          favoriteProductIds: state.favoriteProductIds.includes(key)
            ? state.favoriteProductIds.filter((x) => x !== key)
            : [...state.favoriteProductIds, key],
        }));
      },

      isFavoriteRestaurant: (id) => get().favoriteRestaurantIds.includes(id),
      isFavoriteProduct: (restaurantId, productId) =>
        get().favoriteProductIds.includes(`${restaurantId}:${productId}`),
    }),
    { name: "koli-favorites" }
  )
);
