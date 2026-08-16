import Image from "next/image";
import { IMAGES } from "@/lib/images";
import { Reveal } from "./Reveal";

const STATS = [
  { value: "23+", label: "Années d'expérience" },
  { value: "580+", label: "Plats différents" },
];

export function MadeForYouSection() {
  return (
    <section className="bg-cream-100 py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:gap-20">
        <Reveal direction="right" className="relative mx-auto aspect-[4/5] w-full max-w-md lg:mx-0">
          <div className="relative h-full w-full overflow-hidden rounded-3xl shadow-card">
            <Image
              src={IMAGES.sodaBurger}
              alt="Burger, frites et soda servis sur planche en bois"
              fill
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="object-cover"
            />
          </div>
        </Reveal>

        <Reveal delay={100}>
          <p className="font-heading text-sm font-bold tracking-[0.3em] text-maroon-600 uppercase">
            Notre promesse
          </p>
          <h2 className="font-heading mt-3 text-3xl leading-tight font-extrabold text-ink-950 sm:text-4xl lg:text-5xl">
            Fait comme il faut,
            <br />
            spécialement pour vous
          </h2>
          <p className="font-body mt-5 max-w-lg text-ink-950/65">
            Chaque commande part de notre cuisine, jamais d&rsquo;une chaîne de
            production. On grille, on assemble, on emballe — au moment où
            vous commandez, pas avant.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-8">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <p className="font-heading text-4xl font-extrabold text-brand-orange sm:text-5xl">
                  {stat.value}
                </p>
                <p className="font-heading mt-1 text-sm font-semibold text-ink-950/70">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
