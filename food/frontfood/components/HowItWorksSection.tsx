import { Search, UtensilsCrossed, Bike } from "lucide-react";
import { Reveal } from "./Reveal";

const STEPS = [
  { icon: Search, title: "Trouvez un restaurant", description: "Parcourez les restaurants près de chez vous et leurs menus complets." },
  { icon: UtensilsCrossed, title: "Choisissez vos plats", description: "Personnalisez votre commande et ajoutez-la au panier en un clic." },
  { icon: Bike, title: "Suivez la livraison", description: "En temps réel, du restaurant jusqu'à votre porte." },
];

export function HowItWorksSection() {
  return (
    <section className="bg-cream-100 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-xl text-center">
          <p className="font-heading text-sm font-bold tracking-[0.3em] text-cta uppercase">Simple et rapide</p>
          <h2 className="font-heading mt-3 text-3xl font-extrabold text-ink-950 sm:text-4xl">Comment ça marche</h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, description }, i) => (
            <Reveal key={title} delay={i * 100} className="flex flex-col items-center text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-950 text-white">
                <Icon size={24} />
              </span>
              <h3 className="font-heading mt-4 text-base font-bold text-ink-950">{title}</h3>
              <p className="font-body mt-2 max-w-xs text-sm text-ink-950/55">{description}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
