import { ProductCard, type Product } from "./ProductCard";
import { IMAGES } from "@/lib/images";
import { Reveal } from "./Reveal";

const DISHES: Product[] = [
  { name: "Beef Burger", price: "6,50 €", rating: 5, image: IMAGES.beefBurgerDark },
  { name: "Poulet Croustillant", price: "7,90 €", rating: 4, image: IMAGES.chicken },
  { name: "Pizza Fromage", price: "11,90 €", rating: 5, image: IMAGES.pizza },
  { name: "Trio Tacos", price: "8,50 €", rating: 4, image: IMAGES.tacos },
];

export function BestSellingSection() {
  return (
    <section id="menu" className="bg-cream-100 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-xl text-center">
          <p className="font-heading text-sm font-bold tracking-[0.3em] text-maroon-600 uppercase">
            Plats populaires
          </p>
          <h2 className="font-heading mt-3 text-3xl font-extrabold text-ink-950 sm:text-4xl">
            Best Selling Dishes
          </h2>
        </Reveal>

        <div className="mt-14 flex snap-x gap-6 overflow-x-auto pb-4 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-4">
          {DISHES.map((dish, i) => (
            <Reveal key={dish.name} delay={i * 100} className="w-64 shrink-0 snap-start sm:w-auto">
              <ProductCard product={dish} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
