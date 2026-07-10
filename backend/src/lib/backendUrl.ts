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
export function getBackendUrl(): string {
  const url = process.env.BACKEND_URL
  if (url) return url

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'erreur reseaux'
    )
  }

  return `http://localhost:${process.env.PORT ?? 4000}`
}
