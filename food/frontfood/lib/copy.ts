// Textes centralisés de la bannière de transparence "mode démo" — un seul
// endroit à auditer pour vérifier qu'aucun écran ne laisse croire à un
// paiement, une position GPS ou une commande réellement transmise.
export const DEMO_MODE_COPY = {
  payment:
    "Simulation locale — aucun paiement réel n'est effectué. Aucune banque, aucun restaurant et aucun livreur réel ne reçoivent cette commande.",
  tracking:
    "Suivi simulé — cette commande n'est pas transmise à un vrai restaurant ni à un vrai livreur. Utilisez le bouton ci-dessous pour prévisualiser les étapes.",
  map: "Carte de livraison en direct non disponible dans cette démo — nécessite une intégration de géolocalisation réelle.",
  driver: "Livreur fictif — démonstration uniquement.",
  generic: "Mode démonstration — aucune donnée n'est envoyée à un service réel.",
} as const;
