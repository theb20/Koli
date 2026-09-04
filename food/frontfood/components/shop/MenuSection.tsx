import type { Product, Restaurant } from "@/lib/types";
import { ProductCard } from "../ProductCard";
import { menuCategorySlug } from "./MenuCategoryNav";

export function MenuSection({
  category,
  products,
  restaurant,
}: {
  category: string;
  products: Product[];
  restaurant: Restaurant;
}) {
  return (
    <section id={menuCategorySlug(category)} className="scroll-mt-32 py-6">
      <h2 className="font-heading text-xl font-extrabold text-ink-950">{category}</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} restaurant={restaurant} />
        ))}
      </div>
    </section>
  );
}
