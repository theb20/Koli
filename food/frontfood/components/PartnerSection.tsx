"use client";

import Image from "next/image";
import { Briefcase, Store, Bike } from "lucide-react";
import { IMAGES } from "@/lib/images";
import { useUiStore } from "@/lib/store/uiStore";
import { Reveal } from "./Reveal";

const CARDS = [
  {
    icon: Briefcase,
    image: IMAGES.coffeeLattes,
    title: "Aidez vos collaborateurs à se restaurer",
    cta: "Créez un compte professionnel",
  },
  {
    icon: Store,
    image: IMAGES.pizza,
    title: "Les plats de vos restaurants préférés, livrés chez vous",
    cta: "Ajoutez votre restaurant",
  },
  {
    icon: Bike,
    image: IMAGES.tacos,
    title: "Livrez avec Régal Express",
    cta: "Devenez coursier-partenaire",
  },
];

export function PartnerSection() {
  const pushToast = useUiStore((s) => s.pushToast);

  return (
    <section className="bg-surface-100 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {CARDS.map(({ icon: Icon, image, title, cta }, i) => (
            <Reveal key={title} delay={i * 100}>
              <div className="flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-card">
                <div className="relative h-36 w-full">
                  <Image src={image} alt="" fill sizes="360px" className="object-cover" />
                  <span className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink-950">
                    <Icon size={17} />
                  </span>
                </div>
                <div className="flex flex-1 flex-col justify-between gap-4 p-5">
                  <h3 className="font-heading text-lg font-bold leading-snug text-ink-950">{title}</h3>
                  <button
                    onClick={() => pushToast(`${cta} — à venir dans cette démo.`, "info")}
                    className="self-start text-sm font-semibold text-cta underline underline-offset-2"
                  >
                    {cta}
                  </button>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
