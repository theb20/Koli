import type { Review } from "../types";

// Avis fictifs (démonstration) — auteurs volontairement génériques
// (prénom + initiale), non rattachés à de vraies personnes.
export const REVIEWS: Review[] = [
  { id: "rev-1", restaurantId: "rest-ember", authorName: "Camille D.", rating: 5, comment: "Le burger classic est juste parfait, viande bien cuite et sauce maison excellente.", createdAt: "2026-08-01T18:30:00.000Z" },
  { id: "rev-2", restaurantId: "rest-ember", authorName: "Hugo P.", rating: 4, comment: "Très bon, livraison un peu longue un soir de rush.", createdAt: "2026-07-22T20:10:00.000Z" },
  { id: "rev-3", restaurantId: "rest-ember", productId: "prod-ember-beef-burger", authorName: "Nadia K.", rating: 5, comment: "Mon burger préféré du quartier, sans hésiter.", createdAt: "2026-07-10T12:45:00.000Z" },

  { id: "rev-4", restaurantId: "rest-nonna-pia", authorName: "Julien F.", rating: 5, comment: "Pâte à pizza incroyable, on sent la vraie fermentation.", createdAt: "2026-08-05T19:15:00.000Z" },
  { id: "rev-5", restaurantId: "rest-nonna-pia", productId: "prod-nonnapia-tiramisu", authorName: "Élise V.", rating: 5, comment: "Le tiramisu est meilleur qu'en Italie, sérieusement.", createdAt: "2026-07-28T21:00:00.000Z" },

  { id: "rev-6", restaurantId: "rest-spice-route", authorName: "Amadou S.", rating: 5, comment: "Biryani très parfumé, bonne quantité de poulet.", createdAt: "2026-08-03T13:20:00.000Z" },
  { id: "rev-7", restaurantId: "rest-spice-route", authorName: "Léa B.", rating: 4, comment: "Un peu trop épicé pour moi en 'moyen', attention si vous êtes sensible.", createdAt: "2026-07-18T19:40:00.000Z" },

  { id: "rev-8", restaurantId: "rest-taco-fiesta", authorName: "Marco T.", rating: 4, comment: "Bons tacos, guacamole frais et généreux.", createdAt: "2026-08-06T20:05:00.000Z" },
  { id: "rev-9", restaurantId: "rest-taco-fiesta", authorName: "Inès R.", rating: 5, comment: "Le burrito poulet est énorme, parfait pour deux repas.", createdAt: "2026-07-30T12:10:00.000Z" },

  { id: "rev-10", restaurantId: "rest-green-bowl", authorName: "Chloé N.", rating: 5, comment: "Enfin une option healthy qui a vraiment du goût.", createdAt: "2026-08-02T13:00:00.000Z" },
  { id: "rev-11", restaurantId: "rest-green-bowl", productId: "prod-greenbowl-poke", authorName: "Thomas G.", rating: 5, comment: "Poke bowl saumon au top, très frais.", createdAt: "2026-07-15T18:50:00.000Z" },

  { id: "rev-12", restaurantId: "rest-la-douceur", authorName: "Sarah M.", rating: 5, comment: "Le gâteau au chocolat est d'une gourmandise folle.", createdAt: "2026-08-07T16:20:00.000Z" },
  { id: "rev-13", restaurantId: "rest-la-douceur", authorName: "Paul D.", rating: 4, comment: "Cookies très bons, un peu chers pour la portion.", createdAt: "2026-07-25T17:00:00.000Z" },

  { id: "rev-14", restaurantId: "rest-brew-and-bean", authorName: "Manon L.", rating: 5, comment: "Meilleur café latte du quartier, art latte magnifique.", createdAt: "2026-08-04T09:10:00.000Z" },
  { id: "rev-15", restaurantId: "rest-brew-and-bean", authorName: "Antoine C.", rating: 5, comment: "Le jus fruits rouges est délicieux et bien frais.", createdAt: "2026-07-20T10:30:00.000Z" },

  { id: "rev-16", restaurantId: "rest-sunrise-cafe", authorName: "Zoé H.", rating: 4, comment: "Pancakes moelleux, portion généreuse.", createdAt: "2026-07-29T09:45:00.000Z" },

  { id: "rev-17", restaurantId: "rest-fast-corner", authorName: "Rayan O.", rating: 4, comment: "Simple, efficace, hot-dog très correct.", createdAt: "2026-08-01T21:30:00.000Z" },
  { id: "rev-18", restaurantId: "rest-fast-corner", authorName: "Emma W.", rating: 4, comment: "Sandwich club généreux, livraison rapide.", createdAt: "2026-07-12T13:15:00.000Z" },
];
