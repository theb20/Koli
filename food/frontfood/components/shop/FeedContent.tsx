import Link from "next/link";
import { getRestaurantBySlug, getNearbyRestaurants, getTopRatedRestaurants, PROMOTIONS } from "@/lib/data";
import { PromoRestaurantCard } from "./PromoRestaurantCard";
import { RestaurantRail } from "./RestaurantRail";
import { Reveal } from "../Reveal";

const GROUP_FRIENDLY: { slug: string; tag: string }[] = [
  { slug: "fast-corner", tag: "Sandwichs généreux" },
  { slug: "nonna-pia", tag: "Pizzas familiales" },
  { slug: "taco-fiesta", tag: "Tacos party" },
  { slug: "spice-route", tag: "Plats à partager" },
];

const PROMO_PICKS: { slug: string; badge: string }[] = [
  { slug: "ember", badge: `${PROMOTIONS[0].label} — ${PROMOTIONS[0].code}` },
  { slug: "green-bowl", badge: `${PROMOTIONS[1].label} — ${PROMOTIONS[1].code}` },
  { slug: "brew-and-bean", badge: `${PROMOTIONS[2].label} — ${PROMOTIONS[2].code}` },
  { slug: "la-douceur", badge: "Nouveau sur Régal Express" },
];

export function FeedContent() {
  const promoEntries = PROMO_PICKS.map(({ slug, badge }) => {
    const restaurant = getRestaurantBySlug(slug);
    return restaurant ? { restaurant, badge } : null;
  }).filter((v): v is { restaurant: NonNullable<ReturnType<typeof getRestaurantBySlug>>; badge: string } => Boolean(v));

  const groupEntries = GROUP_FRIENDLY.map(({ slug, tag }) => {
    const restaurant = getRestaurantBySlug(slug);
    return restaurant ? { restaurant, tag } : null;
  }).filter((v): v is { restaurant: NonNullable<ReturnType<typeof getRestaurantBySlug>>; tag: string } => Boolean(v));

  const fastest = [...getNearbyRestaurants(12)].sort(
    (a, b) => a.estimatedDeliveryMinutesMin - b.estimatedDeliveryMinutesMin
  );
  const popular = getTopRatedRestaurants(8);

  return (
    <div className="flex flex-col gap-0">
      {promoEntries.length > 0 && (
        <Reveal>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {promoEntries.map(({ restaurant, badge }) => (
              <PromoRestaurantCard key={restaurant.id} restaurant={restaurant} badge={badge} />
            ))}
          </div>
        </Reveal>
      )}

      <RestaurantRail title="Livraisons rapides" restaurants={fastest} seeAllHref="/recherche?tri=plus_rapide" />
      <RestaurantRail title="Restaurants les plus populaires du quartier" restaurants={popular} seeAllHref="/recherche?tri=plus_populaire" />

      {groupEntries.length > 0 && (
        <section className="py-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-extrabold text-ink-950 sm:text-2xl">Idéal pour les groupes</h2>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
            {groupEntries.map(({ restaurant, tag }) => (
              <div key={restaurant.id}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">[{tag}]</p>
                <PromoRestaurantCard restaurant={restaurant} badge={`${restaurant.priceRange}`} />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex justify-center pb-4 pt-6">
        <Link
          href="/recherche?tri=recommande"
          className="rounded-full bg-ink-950 px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-ink-900"
        >
          Afficher plus
        </Link>
      </div>
    </div>
  );
}
