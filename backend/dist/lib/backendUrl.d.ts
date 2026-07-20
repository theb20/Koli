/**
 * URL publique du backend, utilisée pour construire les liens de fichiers
 * uploadés (image de catégorie, image de produit ré-hébergée...).
 *
 * En production, une valeur manquante ne doit jamais retomber silencieusement
 * sur localhost — ça produit des URLs qui ne fonctionnent que depuis la
 * machine qui a traité la requête, et ça a déjà cassé des images réelles en
 * base (catégorie + 16 produits) avant d'être détecté. On préfère un crash
 * net au démarrage plutôt qu'une corruption de données silencieuse.
 */
export declare function getBackendUrl(): string;
//# sourceMappingURL=backendUrl.d.ts.map