import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { RestaurantHeader } from "@/components/shop/RestaurantHeader";
import { MenuCategoryNav } from "@/components/shop/MenuCategoryNav";
import { MenuSection } from "@/components/shop/MenuSection";
import { ProductReviews } from "@/components/product/ProductReviews";
import {
  getRestaurantBySlug,
  getProductsByRestaurant,
  getMenuCategoriesForRestaurant,
  getReviewsForRestaurant,
} from "@/lib/data";

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const restaurant = getRestaurantBySlug(params.slug);
  return { title: restaurant ? `${restaurant.name} — Régal Express` : "Restaurant introuvable" };
}

export default function RestaurantPage({ params }: { params: { slug: string } }) {
  const restaurant = getRestaurantBySlug(params.slug);
  if (!restaurant) notFound();

  const products = getProductsByRestaurant(restaurant.id);
  const categories = getMenuCategoriesForRestaurant(restaurant.id);
  const reviews = getReviewsForRestaurant(restaurant.id);

  return (
    <div>
      <RestaurantHeader restaurant={restaurant} />
      <MenuCategoryNav categories={categories} />

      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        {categories.map((category) => (
          <MenuSection
            key={category}
            category={category}
            products={products.filter((p) => p.menuCategory === category)}
            restaurant={restaurant}
          />
        ))}

        <section className="py-10">
          <h2 className="font-heading text-xl font-extrabold text-ink-950">Avis clients</h2>
          <div className="mt-4">
            <ProductReviews reviews={reviews} />
          </div>
        </section>
      </div>
    </div>
  );
}
