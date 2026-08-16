import Image from "next/image";
import { ArrowRight, Leaf } from "lucide-react";
import { IMAGES } from "@/lib/images";
import { Reveal } from "./Reveal";

export function Hero() {
  return (
    <section
      id="top"
      className="relative isolate overflow-hidden bg-ink-950 bg-wood-texture pt-32 pb-20 sm:pt-40 sm:pb-28"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-ink-950"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-brand-orange/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:gap-8">
        <Reveal>
          <p className="font-heading text-sm font-bold tracking-[0.3em] text-brand-orange uppercase">
            Cuisiné au feu de bois
          </p>

          <h1 className="font-heading mt-4 text-5xl leading-[0.95] font-extrabold text-white sm:text-6xl lg:text-7xl">
            GRILLED
            <br />
            <span className="font-script text-brand-yellow text-6xl font-normal sm:text-7xl lg:text-8xl">
              Burger
            </span>
            <br />
            BEEF BURGER
          </h1>

          <p className="font-body mt-6 max-w-md text-base leading-relaxed text-cream-100/70 sm:text-lg">
            Un steak grillé à la flamme, du cheddar fondu et des légumes
            croquants dans un pain moelleux. Simple, honnête, terriblement
            bon.
          </p>

          <a
            href="#menu"
            className="group mt-8 inline-flex items-center gap-2 rounded-full bg-cta px-8 py-3.5 font-heading text-base font-bold tracking-wide text-white uppercase shadow-button transition-colors hover:bg-cta-dark"
          >
            Commander
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </a>
        </Reveal>

        <Reveal direction="left" delay={150} className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="relative aspect-square">
            <div
              className="absolute inset-8 rounded-full bg-gradient-to-br from-brand-orange/25 to-transparent blur-2xl"
              aria-hidden="true"
            />
            <Image
              src={IMAGES.heroBurger}
              alt="Burger grillé Ember, double steak et cheddar fondu"
              fill
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="object-contain drop-shadow-2xl"
              priority
            />

            {/* décor flottant */}
            <Leaf
              className="absolute top-6 left-2 -rotate-12 text-cta/70 drop-shadow"
              size={34}
              aria-hidden="true"
            />
            <Leaf
              className="absolute right-4 bottom-16 rotate-45 text-cta/50 drop-shadow"
              size={26}
              aria-hidden="true"
            />

            {/* badge promo */}
            <div className="absolute top-2 right-2 flex h-20 w-20 -rotate-[8deg] flex-col items-center justify-center rounded-full bg-brand-yellow text-ink-950 shadow-xl sm:h-24 sm:w-24">
              <span className="font-heading text-xl leading-none font-extrabold sm:text-2xl">-50%</span>
              <span className="font-heading text-[10px] font-bold tracking-wide uppercase">promo</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
