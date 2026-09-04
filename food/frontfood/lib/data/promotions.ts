import type { Promotion } from "../types";

// Codes promo fictifs — utilisables uniquement dans cette démo locale.
export const PROMOTIONS: Promotion[] = [
  {
    id: "promo-bienvenue10",
    code: "BIENVENUE10",
    label: "10% de réduction",
    description: "10% de réduction sur votre commande.",
    type: "percent",
    value: 10,
    minOrderCents: 1000,
  },
  {
    id: "promo-premiere",
    code: "PREMIERE",
    label: "3€ offerts",
    description: "3€ de réduction dès 15€ d'achat.",
    type: "fixed",
    value: 300,
    minOrderCents: 1500,
  },
  {
    id: "promo-livraisonofferte",
    code: "LIVRAISONOFFERTE",
    label: "Livraison offerte",
    description: "Frais de livraison offerts (jusqu'à 3,50€).",
    type: "fixed",
    value: 350,
  },
];
