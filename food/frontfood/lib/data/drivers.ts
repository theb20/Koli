import type { DriverInfo } from "../types";

// Livreurs fictifs — pool utilisé uniquement pour illustrer l'écran de suivi
// de démonstration. Assignation stable par commande (voir orderStore),
// jamais présentée comme une vraie position/identité en temps réel.
export const DRIVERS: DriverInfo[] = [
  { name: "Karim L.", vehicle: "Scooter", rating: 4.9, photoSeed: "karim" },
  { name: "Sophie M.", vehicle: "Vélo électrique", rating: 4.8, photoSeed: "sophie" },
  { name: "Yanis B.", vehicle: "Scooter", rating: 4.7, photoSeed: "yanis" },
  { name: "Lucie R.", vehicle: "Voiture", rating: 4.9, photoSeed: "lucie" },
  { name: "Malik T.", vehicle: "Vélo", rating: 4.6, photoSeed: "malik" },
];
