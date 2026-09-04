import { CATEGORIES } from "./categories";
import { RESTAURANTS } from "./restaurants";
import { PRODUCTS } from "./products";
import { PROMOTIONS } from "./promotions";
import { REVIEWS } from "./reviews";
import { DRIVERS } from "./drivers";
import type { Product, Restaurant } from "../types";

// Petites fonctions de requête "façon repository" : elles isolent les pages
// du shape brut des tableaux mock. Si un vrai backend arrive un jour, ces
// fonctions peuvent devenir des `fetch(...)` avec la même signature, sans
// toucher aux composants qui les appellent.

export { CATEGORIES, RESTAURANTS, PRODUCTS, PROMOTIONS, REVIEWS, DRIVERS };

export function getCategoryBySlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function getRestaurantBySlug(slug: string) {
  return RESTAURANTS.find((r) => r.slug === slug);
}

export function getRestaurantById(id: string) {
  return RESTAURANTS.find((r) => r.id === id);
}

export function getProductsByRestaurant(restaurantId: string) {
  return PRODUCTS.filter((p) => p.restaurantId === restaurantId);
}

export function getProductBySlug(restaurantSlug: string, productSlug: string) {
  const restaurant = getRestaurantBySlug(restaurantSlug);
  if (!restaurant) return undefined;
  const product = PRODUCTS.find((p) => p.restaurantId === restaurant.id && p.slug === productSlug);
  return product ? { product, restaurant } : undefined;
}

export function getMenuCategoriesForRestaurant(restaurantId: string) {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const p of getProductsByRestaurant(restaurantId)) {
    if (!seen.has(p.menuCategory)) {
      seen.add(p.menuCategory);
      ordered.push(p.menuCategory);
    }
  }
  return ordered;
}

export function getFeaturedRestaurants(limit = 6) {
  return [...RESTAURANTS]
    .sort((a, b) => Number(b.promoted) - Number(a.promoted) || b.rating - a.rating)
    .slice(0, limit);
}

export function getNearbyRestaurants(limit = 6) {
  return [...RESTAURANTS].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, limit);
}

export function getTopRatedRestaurants(limit = 6) {
  return [...RESTAURANTS].sort((a, b) => b.rating - a.rating).slice(0, limit);
}

export function getTopProducts(limit = 4): { product: Product; restaurant: Restaurant }[] {
  return PRODUCTS.filter((p) => p.tags?.includes("Best-seller"))
    .slice(0, limit)
    .map((product) => ({ product, restaurant: getRestaurantById(product.restaurantId)! }))
    .filter((entry) => entry.restaurant);
}

export function getPromotionByCode(code: string) {
  return PROMOTIONS.find((p) => p.code.toLowerCase() === code.trim().toLowerCase());
}

export function getReviewsForRestaurant(restaurantId: string) {
  return REVIEWS.filter((r) => r.restaurantId === restaurantId).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getReviewsForProduct(productId: string) {
  return REVIEWS.filter((r) => r.productId === productId);
}

export type SortOption =
  | "recommande"
  | "plus_proche"
  | "plus_rapide"
  | "mieux_note"
  | "moins_cher"
  | "plus_populaire";

export type SearchFilters = {
  q?: string;
  categorySlug?: string;
  sort?: SortOption;
  priceRanges?: Restaurant["priceRange"][];
  openNow?: boolean;
  freeDelivery?: boolean;
  vegetarian?: boolean;
  halal?: boolean;
  promotedOnly?: boolean;
};

export type SearchResult = {
  restaurants: Restaurant[];
  matchedProducts: { product: Product; restaurant: Restaurant }[];
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function searchCatalog(filters: SearchFilters): SearchResult {
  const q = filters.q ? normalize(filters.q.trim()) : "";
  const category = filters.categorySlug ? getCategoryBySlug(filters.categorySlug) : undefined;

  let restaurants = [...RESTAURANTS];
  let matchedProducts: { product: Product; restaurant: Restaurant }[] = [];

  if (category) {
    restaurants = restaurants.filter((r) => r.categoryIds.includes(category.id));
  }

  if (filters.priceRanges?.length) {
    restaurants = restaurants.filter((r) => filters.priceRanges!.includes(r.priceRange));
  }
  if (filters.openNow) {
    restaurants = restaurants.filter((r) => r.isOpen);
  }
  if (filters.freeDelivery) {
    restaurants = restaurants.filter((r) => r.deliveryFeeCents === 0);
  }
  if (filters.vegetarian) {
    restaurants = restaurants.filter((r) => r.isVegetarianFriendly);
  }
  if (filters.halal) {
    restaurants = restaurants.filter((r) => r.isHalal);
  }
  if (filters.promotedOnly) {
    restaurants = restaurants.filter((r) => r.promoted);
  }

  if (q) {
    const matchingProducts = PRODUCTS.filter((p) => normalize(p.name).includes(q));
    const restaurantIdsFromProducts = new Set(matchingProducts.map((p) => p.restaurantId));

    restaurants = restaurants.filter(
      (r) =>
        normalize(r.name).includes(q) ||
        normalize(r.description).includes(q) ||
        r.tags.some((t) => normalize(t).includes(q)) ||
        restaurantIdsFromProducts.has(r.id)
    );

    const visibleRestaurantIds = new Set(restaurants.map((r) => r.id));
    matchedProducts = matchingProducts
      .filter((p) => visibleRestaurantIds.has(p.restaurantId))
      .map((product) => ({ product, restaurant: getRestaurantById(product.restaurantId)! }))
      .filter((entry) => entry.restaurant);
  }

  const sort = filters.sort ?? "recommande";
  switch (sort) {
    case "plus_proche":
      restaurants.sort((a, b) => a.distanceKm - b.distanceKm);
      break;
    case "plus_rapide":
      restaurants.sort((a, b) => a.estimatedDeliveryMinutesMin - b.estimatedDeliveryMinutesMin);
      break;
    case "mieux_note":
      restaurants.sort((a, b) => b.rating - a.rating);
      break;
    case "moins_cher":
      restaurants.sort((a, b) => a.priceRange.length - b.priceRange.length);
      break;
    case "plus_populaire":
      restaurants.sort((a, b) => b.ratingCount - a.ratingCount);
      break;
    default:
      restaurants.sort((a, b) => Number(b.promoted) - Number(a.promoted) || b.rating - a.rating);
  }

  return { restaurants, matchedProducts };
}
