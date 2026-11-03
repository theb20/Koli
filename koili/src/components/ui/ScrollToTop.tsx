import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * React Router ne remonte jamais en haut de page tout seul lors d'une
 * navigation (SPA : le DOM reste scrollé où il était) — sans ce composant,
 * ouvrir une fiche produit depuis le bas d'une liste atterrit au milieu/bas
 * de la nouvelle page au lieu du haut. Déclenché sur le chemin seul (pas la
 * query string ni le hash), pour ne pas gêner un lien `#section`.
 */
export function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
