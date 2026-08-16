import Image from "next/image";
import { IMAGES } from "@/lib/images";
import { Reveal } from "./Reveal";

const CATEGORIES = [
  { label: "Hot-dog", image: IMAGES.hotdog },
  { label: "Sandwich", image: IMAGES.sandwich },
  { label: "Poulet", image: IMAGES.chicken, featured: true },
  { label: "Biryani", image: IMAGES.biryani },
  { label: "Fast Food", image: IMAGES.fries },
  { label: "Pizza", image: IMAGES.pizza },
];

export function CategoryStrip() {
  return (
    <section className="bg-cream-100 py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid grid-cols-3 gap-x-4 gap-y-10 sm:grid-cols-6 sm:gap-x-6">
          {CATEGORIES.map((cat, i) => (
            <Reveal key={cat.label} delay={i * 70}>
              <a href="#menu" className="group flex flex-col items-center gap-3 text-center">
                <span
                  className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-105 sm:h-24 sm:w-24 ${
                    cat.featured ? "bg-brand-orange shadow-card" : "bg-white shadow-card"
                  }`}
                >
                  <span className="relative h-14 w-14 overflow-hidden rounded-full ring-4 ring-white sm:h-16 sm:w-16">
                    <Image src={cat.image} alt={cat.label} fill sizes="64px" className="object-cover" />
                  </span>
                </span>
                <span className="font-heading text-xs font-semibold text-ink-950 sm:text-sm">
                  {cat.label}
                </span>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
