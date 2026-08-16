import Image from "next/image";
import { ArrowRight, Flame } from "lucide-react";
import { IMAGES } from "@/lib/images";
import { Reveal } from "./Reveal";

export function QuesadillaPromo() {
  return (
    <section className="relative overflow-hidden bg-maroon-700 bg-kraft-texture py-20 sm:py-28">
      <div
        className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-brand-orange/15 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-5 sm:px-8 lg:grid-cols-[0.9fr_1fr_0.8fr]">
        {/* Photo qui déborde à gauche */}
        <Reveal direction="right" className="relative -mx-5 aspect-[4/5] sm:mx-0 lg:-ml-16 lg:aspect-[3/4]">
          <Image
            src={IMAGES.tacos}
            alt="Quesadilla et tacos garnis Ember"
            fill
            sizes="(min-width: 1024px) 35vw, 90vw"
            className="rounded-3xl object-cover shadow-2xl lg:rounded-l-none"
          />
        </Reveal>

        {/* Texte central */}
        <Reveal delay={100} className="text-center lg:text-left">
          <p className="font-heading inline-flex items-center gap-2 text-sm font-bold tracking-[0.3em] text-brand-orange uppercase">
            <Flame size={16} />
            Offre limitée
          </p>
          <h2 className="font-heading mt-4 text-3xl leading-tight font-extrabold text-white sm:text-4xl lg:text-5xl">
            La Quesadilla
            <br />
            qui change tout
          </h2>

          <div className="mx-auto mt-7 flex max-w-xs flex-col gap-2 lg:mx-0">
            <div className="flex items-center justify-between text-sm font-semibold text-cream-100/80">
              <span>Portions restantes aujourd&rsquo;hui</span>
              <span className="text-brand-yellow">18/50</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[36%] rounded-full bg-brand-yellow" />
            </div>
          </div>

          <a
            href="#menu"
            className="group mt-8 inline-flex items-center gap-2 rounded-full bg-cta px-8 py-3.5 font-heading text-base font-bold tracking-wide text-white uppercase shadow-button transition-colors hover:bg-cta-dark"
          >
            Commander
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </a>
        </Reveal>

        {/* Image + badge prix */}
        <Reveal direction="left" delay={200} className="relative mx-auto aspect-square w-full max-w-xs">
          <Image
            src={IMAGES.burrito}
            alt="Tacos garni servi chaud"
            fill
            sizes="(min-width: 1024px) 25vw, 70vw"
            className="rounded-3xl object-cover shadow-2xl"
          />
          <div className="absolute -top-4 -right-4 flex h-24 w-24 -rotate-[8deg] flex-col items-center justify-center rounded-full bg-brand-yellow text-ink-950 shadow-xl">
            <span className="font-heading text-xs font-semibold line-through opacity-60">12,90 €</span>
            <span className="font-heading text-xl leading-none font-extrabold">8,90 €</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
