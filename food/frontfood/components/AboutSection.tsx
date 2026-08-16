import Image from "next/image";
import { Salad, Award, Truck } from "lucide-react";
import { IMAGES } from "@/lib/images";
import { Reveal } from "./Reveal";

const POINTS = [
  { icon: Salad, title: "Ingrédients frais" },
  { icon: Award, title: "Meilleure qualité" },
  { icon: Truck, title: "Livraison rapide" },
];

export function AboutSection() {
  return (
    <section id="apropos" className="bg-cream-100 py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:gap-20">
        <Reveal direction="right" className="relative mx-auto aspect-[4/5] w-full max-w-md lg:mx-0">
          <div
            className="absolute -inset-4 -z-10 rounded-3xl bg-kraft-texture bg-maroon-700/10"
            aria-hidden="true"
          />
          <div className="relative h-full w-full overflow-hidden rounded-3xl shadow-card">
            <Image
              src={IMAGES.aboutBurger}
              alt="Burger Ember et boissons servis sur planche en bois"
              fill
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="object-cover"
            />
          </div>
        </Reveal>

        <Reveal delay={100}>
          <p className="font-heading text-sm font-bold tracking-[0.3em] text-maroon-600 uppercase">
            À propos de nous
          </p>
          <h2 className="font-heading mt-3 text-3xl leading-tight font-extrabold text-ink-950 sm:text-4xl lg:text-5xl">
            On fait le meilleur
            <br />
            burger de la ville
          </h2>
          <p className="font-body mt-5 max-w-lg text-ink-950/65">
            Depuis notre première grillade, une seule règle : rien ne quitte
            la cuisine si ce n&rsquo;est pas fait dans les règles de l&rsquo;art.
            Viande sélectionnée, pain boulangé sur place, sauces maison — le
            fast-food comme il devrait toujours être.
          </p>

          <div className="mt-9 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {POINTS.map(({ icon: Icon, title }) => (
              <div key={title} className="flex flex-col items-start gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-orange/15 text-brand-orange">
                  <Icon size={22} />
                </span>
                <p className="font-heading text-sm font-bold text-ink-950">{title}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
