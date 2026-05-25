/**
 * PageMeta — composant SEO réutilisable.
 *
 * React 19 hisse automatiquement <title> et <meta> vers <head>
 * depuis n'importe quel endroit dans l'arbre de composants.
 * Aucune dépendance externe requise.
 *
 * Usage :
 *   <PageMeta
 *     title="Accueil"
 *     description="Découvrez des milliers de produits..."
 *     path="/"
 *     image="/wall/og-home.jpg"   ← optionnel, fallback sur l'image globale
 *   />
 */

/* ─────────────────────────────────────────
   CONSTANTS — seul fichier à modifier pour
   changer les valeurs globales du site
───────────────────────────────────────── */
const SITE_NAME    = "Dropship"
const BASE_URL     = "https://dropshipp.fr"
const TWITTER_HANDLE = "@dropship_fr"
const DEFAULT_IMAGE  = `${BASE_URL}/wall/og-image.jpg`

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */
export type PageMetaProps = {
  /** Titre de la page. Formaté en → "{title} — Dropship" */
  title: string
  /** Description meta (160 car. max). Si absent, la description globale de index.html s'applique. */
  description?: string
  /**
   * OG image. Accepte :
   *  - un chemin relatif :  "/wall/og-shop.jpg"
   *  - une URL complète  :  "https://..."
   * Défaut : l'image globale du site.
   */
  image?: string
  /** Chemin de la route, ex: "/shop". Utilisé pour canonical + og:url. */
  path?: string
  /** Empêche l'indexation (login, register…). */
  noIndex?: boolean
  /** Type Open Graph. "website" par défaut. */
  type?: "website" | "article"
}

/* ─────────────────────────────────────────
   COMPONENT
───────────────────────────────────────── */
export function PageMeta({
  title,
  description,
  image,
  path,
  noIndex = false,
  type    = "website",
}: PageMetaProps) {
  const fullTitle = `${title} — ${SITE_NAME}`

  // Résolution de l'image : relative → URL absolue, sinon fallback
  const ogImage = image
    ? image.startsWith("http") ? image : `${BASE_URL}${image}`
    : DEFAULT_IMAGE

  const canonical = path ? `${BASE_URL}${path}` : undefined

  return (
    <>
      {/* ── Titre ── */}
      <title>{fullTitle}</title>

      {/* ── SEO primaire ── */}
      {description && <meta name="description" content={description} />}
      {noIndex      && <meta name="robots"      content="noindex, nofollow" />}
      {canonical    && <link rel="canonical"    href={canonical} />}

      {/* ── Open Graph ── */}
      <meta property="og:type"         content={type} />
      <meta property="og:site_name"    content={SITE_NAME} />
      <meta property="og:title"        content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:image"        content={ogImage} />
      <meta property="og:image:width"  content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt"    content={fullTitle} />
      {canonical && <meta property="og:url" content={canonical} />}
      <meta property="og:locale"       content="fr_FR" />

      {/* ── Twitter / X ── */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:site"        content={TWITTER_HANDLE} />
      <meta name="twitter:title"       content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image"       content={ogImage} />
      <meta name="twitter:image:alt"   content={fullTitle} />
    </>
  )
}
