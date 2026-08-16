import Image from "next/image";
import { Star, BadgeCheck } from "lucide-react";
import { IMAGES } from "@/lib/images";
import { Reveal } from "./Reveal";

const AVATARS = [IMAGES.avatar1, IMAGES.avatar2, IMAGES.avatar3];

export function TestimonialSection() {
  return (
    <section className="relative overflow-hidden bg-white py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-5 sm:px-8 lg:grid-cols-[auto_1fr]">
        <Reveal direction="right" className="mx-auto hidden lg:block">
          <div className="flex h-40 w-40 -rotate-6 flex-col items-center justify-center gap-1 rounded-full border-4 border-dashed border-cta/40 text-cta">
            <BadgeCheck size={30} />
            <span className="font-heading text-center text-xs leading-tight font-extrabold tracking-wide uppercase">
              Qualité
              <br />
              certifiée
            </span>
          </div>
        </Reveal>

        <Reveal delay={100} className="text-center">
          <div className="flex justify-center gap-1" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={20} className="fill-brand-yellow text-brand-yellow" />
            ))}
          </div>
          <span className="sr-only">Note moyenne : 5 sur 5</span>

          <blockquote className="font-heading mx-auto mt-6 max-w-2xl text-2xl leading-snug font-semibold text-ink-950 sm:text-3xl">
            « Le meilleur burger que j&rsquo;ai mangé depuis longtemps. Croustillant,
            généreux, servi brûlant — on sent que c&rsquo;est fait sur place, pas
            réchauffé. »
          </blockquote>

          <p className="font-heading mt-5 text-sm font-bold text-ink-950">Camille R.</p>
          <p className="font-body text-xs text-ink-950/50">Cliente régulière</p>

          <div className="mt-7 flex justify-center -space-x-3">
            {AVATARS.map((src, i) => (
              <span
                key={i}
                className="relative h-11 w-11 overflow-hidden rounded-full ring-4 ring-white"
              >
                <Image src={src} alt="" fill sizes="44px" className="object-cover" />
              </span>
            ))}
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-950 font-heading text-xs font-bold text-cream-100 ring-4 ring-white">
              2k+
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
