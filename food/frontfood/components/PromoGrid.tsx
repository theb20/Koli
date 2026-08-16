import { PromoBanner } from "./PromoBanner";
import { IMAGES } from "@/lib/images";

type Banner = React.ComponentProps<typeof PromoBanner>;

const MEALS: Banner[] = [
  { title: "Fast Food Meals", image: IMAGES.fries, tone: "dark", price: "8,90 €", ctaLabel: "Commander" },
  { title: "Beef Burger", image: IMAGES.beefBurgerDark, tone: "orange", price: "6,50 €", ctaLabel: "Commander" },
  { title: "Cheese Pizza", image: IMAGES.pizzaSlice, tone: "dark", price: "11,90 €", ctaLabel: "Commander" },
];

const FINAL: Banner[] = [
  { title: "Super Delicious", image: IMAGES.beefBurgerStack, tone: "dark", phone: "01 84 60 22 15", ctaLabel: "Appeler" },
  { title: "Burrito du jour", image: IMAGES.burrito, tone: "orange", badge: "offre du jour", ctaLabel: "Commander" },
  { title: "Pizza épaisse au fromage", image: IMAGES.pizza, tone: "maroon", price: "13,90 €", ctaLabel: "Commander" },
];

export function PromoGrid({ variant }: { variant: "meals" | "final" }) {
  const banners = variant === "meals" ? MEALS : FINAL;

  return (
    <section className="bg-cream-100 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {banners.map((b, i) => (
            <PromoBanner key={b.title} {...b} delay={i * 100} />
          ))}
        </div>
      </div>
    </section>
  );
}
